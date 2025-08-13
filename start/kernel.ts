import Server from "@ioc:Adonis/Core/Server";

Server.middleware.register([
  () => import("@ioc:Adonis/Core/BodyParser"),
  () => import("@ioc:Adonis/Addons/Shield"),
  () => import("App/Middleware/SecurityHeader"),
]);

Server.middleware.registerNamed({
  auth: () => import("App/Middleware/Auth"),
});
