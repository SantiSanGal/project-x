import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.get('/', 'sv-app/canvas/controller.list')
    Route.post('/', 'sv-app/canvas/controller.store')
    Route.put('/edit/:idGrupoPixeles', 'sv-app/canvas/controller.edit')
})
    .prefix('canvas')
    .middleware('auth')
