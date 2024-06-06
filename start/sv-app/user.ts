import Route from '@ioc:Adonis/Core/Route';

Route.group(() => {
    Route.get('/', 'sv-app/user/controller.list')
    Route.put('/edit', 'sv-app/user/controller.update')
    Route.put('/password', 'sv-app/user/controller.password')
})
    .prefix('user')
    .middleware('auth')