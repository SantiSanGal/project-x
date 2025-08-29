import Route from "@ioc:Adonis/Core/Route";

import "./sv-auth/auth";
import "./sv-app/canvas";
import "./sv-app/user";
import "./sv-app/purchases";
import "./sv-app/pagopar";
import "./sv-app/test";

Route.post("*", "sv-auth/controller.login");
