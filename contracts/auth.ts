// contracts/auth.ts
import type User from "App/Models/User";
import type {
  OATGuardConfig,
  LucidProviderConfig,
} from "@ioc:Adonis/Addons/Auth";

declare module "@ioc:Adonis/Addons/Auth" {
  interface ProvidersList {
    user: {
      implementation: LucidProviderContract<typeof User>;
      config: LucidProviderConfig<typeof User>;
    };
  }

  interface GuardsList {
    api: {
      implementation: OATGuardContract<"user", "api">;
      config: OATGuardConfig<"user">;
      client: OATClientContract<"user">;
    };
  }
}
