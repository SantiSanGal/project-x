import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.post('/', 'sv-app/canvas/controller.store')
    Route.get('/', 'sv-app/canvas/controller.list')
})
    .prefix('canvas')
    .middleware('auth')
