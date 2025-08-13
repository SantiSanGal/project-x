// contracts/auth.ts
import User from "App/Models/User";
import {
  OATGuardContract, // no se utiliza, puedo borrar?
  OATGuardConfig,
  OATClientContract, // no se utiliza, puedo borrar?
  LucidProviderContract, // no se utiliza, puedo borrar?
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
      client: OATClientContract<"user", "api">;
    };
  }
}
