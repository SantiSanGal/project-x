import Route from "@ioc:Adonis/Core/Route";

Route.post("/pagopar/respuesta", "sv-app/pagopar/controller.confirmarPago");
Route.get(
  "/redireccionamiento/:hash",
  "sv-app/pagopar/controller.redireccionamiento"
);
