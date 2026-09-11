import { requireAppUser } from "@/lib/auth/require-app-user";
import { productionPackageHandlers } from "@/lib/http/production-package-handlers";
import { ProductionPackageService } from "@/lib/services/production-package-service";

export const POST = productionPackageHandlers(requireAppUser, new ProductionPackageService()).script;
