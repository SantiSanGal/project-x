import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.post('/', 'sv-app/controller.store')
    Route.get('/', 'sv-app/controller.list')
})
    .prefix('/canvas')
    .middleware('auth')
