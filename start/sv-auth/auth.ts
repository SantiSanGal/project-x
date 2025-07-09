import Route from "@ioc:Adonis/Core/Route";

Route.group(() => {
  Route.post("/login", "sv-auth/controller.login");
  Route.post("/logout", "sv-auth/controller.logout").middleware("auth");
  Route.post("/register", "sv-auth/controller.register");
  Route.post("/forgot-password", "sv-auth/controller.forgotPassword");
  Route.post('/googleAuth', 'sv-auth/controller.googleAuth')
}).prefix("/auth");

