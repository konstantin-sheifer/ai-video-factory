import assert from "node:assert/strict";
import test from "node:test";

import { getAuthenticatedDestination } from "../../lib/auth/auth-page-redirect";

const STAGING_ORIGIN = "https://aivf-web.onrender.com";

test("existing sessions use the dashboard when no return URL exists", () => {
  assert.equal(
    getAuthenticatedDestination({ origin: STAGING_ORIGIN, search: "" }),
    "/dashboard"
  );
});

test("existing sessions preserve an owned loading return URL", () => {
  const redirectUrl = encodeURIComponent(`${STAGING_ORIGIN}/loading?idea=preserved`);

  assert.equal(
    getAuthenticatedDestination({
      origin: STAGING_ORIGIN,
      search: `?redirect_url=${redirectUrl}`,
    }),
    "/loading?idea=preserved"
  );
});

test("existing sessions reject foreign and recursive auth destinations", () => {
  assert.equal(
    getAuthenticatedDestination({
      origin: STAGING_ORIGIN,
      search: "?redirect_url=https%3A%2F%2Fevil.example%2Faccount",
    }),
    "/dashboard"
  );
  assert.equal(
    getAuthenticatedDestination({
      origin: STAGING_ORIGIN,
      search: "?redirect_url=%2Fsign-in",
    }),
    "/dashboard"
  );
});

test("relative destinations resolve against localhost in development", () => {
  assert.equal(
    getAuthenticatedDestination({
      origin: "http://localhost:3000",
      search: "?redirect_url=%2Floading",
    }),
    "/loading"
  );
});
