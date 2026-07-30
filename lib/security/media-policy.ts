import "server-only";

import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const DEFAULT_MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type SafeMediaFetchOptions = {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
};

export type SafeMediaResult = {
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
};

export class SafeMediaError extends Error {
  readonly status: 400 | 408 | 413 | 502;

  constructor(message: string, status: 400 | 408 | 413 | 502) {
    super(message);
    this.name = "SafeMediaError";
    this.status = status;
  }
}

export async function fetchSafeMedia(
  input: string,
  options: SafeMediaFetchOptions = {}
): Promise<SafeMediaResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const deadline = Date.now() + timeoutMs;

  if (maxBytes <= 0 || timeoutMs <= 0 || maxRedirects < 0) {
    throw new SafeMediaError("Invalid media policy configuration.", 502);
  }

  return fetchWithPolicy(input, {
    maxBytes,
    maxRedirects,
    redirects: 0,
    deadline,
  });
}

async function fetchWithPolicy(
  input: string,
  policy: {
    maxBytes: number;
    maxRedirects: number;
    redirects: number;
    deadline: number;
  }
): Promise<SafeMediaResult> {
  const url = parseAllowedUrl(input);
  const addresses = await resolvePublicAddresses(url.hostname);
  const remainingTime = policy.deadline - Date.now();

  if (remainingTime <= 0) {
    throw new SafeMediaError("Remote media download timed out.", 408);
  }

  const response = await downloadOnce(
    url,
    addresses[0],
    policy.maxBytes,
    remainingTime
  );

  if (response.kind === "redirect") {
    if (policy.redirects >= policy.maxRedirects) {
      throw new SafeMediaError("Remote media redirected too many times.", 502);
    }

    return fetchWithPolicy(response.redirectUrl, {
      ...policy,
      redirects: policy.redirects + 1,
    });
  }

  return {
    buffer: response.buffer,
    contentType: response.contentType,
    finalUrl: url.toString(),
  };
}

function parseAllowedUrl(input: string) {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new SafeMediaError("Invalid remote media URL.", 400);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeMediaError("Unsupported remote media URL.", 400);
  }

  if (url.username || url.password) {
    throw new SafeMediaError("Remote media URL credentials are not allowed.", 400);
  }

  const hostname = normalizeHostname(url.hostname);

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  ) {
    throw new SafeMediaError("Remote media destination is not allowed.", 400);
  }

  return url;
}

async function resolvePublicAddresses(hostname: string) {
  const normalizedHostname = normalizeHostname(hostname);

  try {
    const addresses = await lookup(normalizedHostname, {
      all: true,
      verbatim: true,
    });

    if (
      addresses.length === 0 ||
      addresses.some(({ address }) => isForbiddenAddress(address))
    ) {
      throw new SafeMediaError("Remote media destination is not allowed.", 400);
    }

    return addresses;
  } catch (error) {
    if (error instanceof SafeMediaError) {
      throw error;
    }

    throw new SafeMediaError("Remote media destination could not be resolved.", 400);
  }
}

function downloadOnce(
  url: URL,
  address: { address: string; family: number },
  maxBytes: number,
  timeoutMs: number
): Promise<
  | { kind: "success"; buffer: Buffer; contentType: string }
  | { kind: "redirect"; redirectUrl: string }
> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) {
        callback(null, [address]);
        return;
      }

      callback(null, address.address, address.family);
    };

    const request = transport(
      url,
      {
        headers: {
          Accept: "audio/*,video/*,application/octet-stream;q=0.8,*/*;q=0.1",
          "User-Agent": "AI-Video-Factory-Media-Fetch/1.0",
        },
        lookup: pinnedLookup,
      },
      (response) => {
        const statusCode = response.statusCode || 0;

        if (REDIRECT_STATUSES.has(statusCode)) {
          const location = response.headers.location;
          response.resume();

          if (!location) {
            reject(new SafeMediaError("Remote media redirect was invalid.", 502));
            return;
          }

          try {
            resolve({
              kind: "redirect",
              redirectUrl: new URL(location, url).toString(),
            });
          } catch {
            reject(new SafeMediaError("Remote media redirect was invalid.", 502));
          }

          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new SafeMediaError("Remote media request failed.", 502));
          return;
        }

        const contentLength = Number(response.headers["content-length"] || 0);

        if (contentLength > maxBytes) {
          response.destroy();
          reject(new SafeMediaError("Remote media is too large.", 413));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;

          if (totalBytes > maxBytes) {
            response.destroy(new SafeMediaError("Remote media is too large.", 413));
            return;
          }

          chunks.push(chunk);
        });

        response.on("end", () => {
          resolve({
            kind: "success",
            buffer: Buffer.concat(chunks),
            contentType: String(response.headers["content-type"] || ""),
          });
        });

        response.on("error", (error) => {
          reject(toSafeMediaError(error));
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new SafeMediaError("Remote media download timed out.", 408));
    });

    const absoluteTimeout = setTimeout(() => {
      request.destroy(new SafeMediaError("Remote media download timed out.", 408));
    }, timeoutMs);

    request.on("close", () => {
      clearTimeout(absoluteTimeout);
    });

    request.on("error", (error) => {
      reject(toSafeMediaError(error));
    });

    request.end();
  });
}

function normalizeHostname(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function isForbiddenAddress(address: string) {
  const version = isIP(address);

  if (version === 4) {
    return isForbiddenIpv4(address);
  }

  if (version === 6) {
    return isForbiddenIpv6(address);
  }

  return true;
}

function isForbiddenIpv4(address: string) {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isForbiddenIpv6(address: string) {
  const value = parseIpv6(address);

  if (value === null || value === BigInt(0) || value === BigInt(1)) {
    return true;
  }

  if (
    value >> BigInt(121) === BigInt("0x7e") ||
    value >> BigInt(118) === BigInt("0x3fa")
  ) {
    return true;
  }

  const high96Bits = value >> BigInt(32);

  if (high96Bits === BigInt("0xffff") || high96Bits === BigInt(0)) {
    return isForbiddenIpv4(
      numberToIpv4(Number(value & BigInt("0xffffffff")))
    );
  }

  return false;
}

function parseIpv6(address: string) {
  const cleanAddress = address.split("%", 1)[0].toLowerCase();
  const lastColon = cleanAddress.lastIndexOf(":");
  let normalized = cleanAddress;

  if (cleanAddress.includes(".")) {
    const ipv4 = cleanAddress.slice(lastColon + 1);
    const parts = ipv4.split(".").map(Number);

    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return null;
    }

    normalized = `${cleanAddress.slice(0, lastColon)}:${(
      (parts[0] << 8) |
      parts[1]
    ).toString(16)}:${((parts[2] << 8) | parts[3]).toString(16)}`;
  }

  const halves = normalized.split("::");

  if (halves.length > 2) {
    return null;
  }

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;

  if (
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  ) {
    return null;
  }

  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ];

  if (
    groups.length !== 8 ||
    groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))
  ) {
    return null;
  }

  return groups.reduce((value, group) => {
    return (value << BigInt(16)) | BigInt(`0x${group}`);
  }, BigInt(0));
}

function numberToIpv4(value: number) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

function toSafeMediaError(error: Error) {
  return error instanceof SafeMediaError
    ? error
    : new SafeMediaError("Remote media request failed.", 502);
}
