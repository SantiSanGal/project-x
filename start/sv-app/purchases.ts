import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.get('/', 'sv-app/purchases/controller.list')
})
    .prefix('purchases')
    .middleware('auth')