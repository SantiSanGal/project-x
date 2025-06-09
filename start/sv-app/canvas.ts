import Route from "@ioc:Adonis/Core/Route";

Route.group(() => {
  Route.get("/", "sv-app/canvas/controller.list");
  Route.post("/", "sv-app/canvas/controller.store");
  Route.get(
    "/grupoPixeles/:idGrupoPixeles",
    "sv-app/canvas/controller.getGrupoPixeles"
  );

  // Route.put("/edit/:idGrupoPixeles", "sv-app/canvas/controller.edit"); //aún no consulté desde el front

  //idSector sería 1 para 0:0, 2 para 0:1, 3 para 1:0, 4 para 1:1
  Route.get(
    "/rangosOcupados/:idSector",
    "sv-app/canvas/controller.rangosOcupados"
  );

  // Aún no consulté desde el front
  Route.post(
    "/reportar/:idGrupoPixeles",
    "sv-app/canvas/controller.postReportarGrupoPixeles"
  );
})
  .prefix("canvas")
  .middleware("auth");

// Para consulta desde pagopar sobre la imagen que se quiere mostrar en el checkout
Route.get("/img/:id", "sv-app/canvas/controller.getImgGrupoPixeles").prefix(
  "canvas"
);
