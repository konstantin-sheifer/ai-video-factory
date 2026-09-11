import "server-only";
import { ProductionContractError } from "@/lib/production/contract";
import type { ProductionPackageService } from "@/lib/services/production-package-service";

type Authenticate = () => Promise<{ internalUserId: string }>;
type Service = Pick<ProductionPackageService, "prepare" | "generate">;

/** Dependencies are explicit so tests exercise the same HTTP boundary as routes. */
export function productionPackageHandlers(authenticate: Authenticate, service: Service) {
  function handler(action: "prepare" | "generate") {
    return async (request: Request): Promise<Response> => {
      try {
        const { internalUserId } = await authenticate();
        let body: unknown;
        try { body = await request.json(); }
        catch { throw new ProductionContractError("INVALID_JSON", "Invalid JSON request.", 400); }
        if (action === "prepare") {
          const result = await service.prepare(internalUserId, body);
          return Response.json(result, { status: result.canGenerate ? 200 : 422 });
        }
        return Response.json(await service.generate(internalUserId, body));
      } catch (error) {
        if (error instanceof ProductionContractError) {
          return Response.json({ error: error.message, code: error.code, canGenerate: false, generationBlocked: true }, { status: error.status });
        }
        if (error instanceof Error && "status" in error && error.status === 401) {
          return Response.json({ error: "Authentication required.", code: "UNAUTHENTICATED", canGenerate: false, generationBlocked: true }, { status: 401 });
        }
        return Response.json({ error: "Production request failed. Generation is blocked.", code: "PRODUCTION_FAILED", canGenerate: false, generationBlocked: true }, { status: 500 });
      }
    };
  }
  return { script: handler("prepare"), video: handler("generate") };
}
