import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.get('/', 'sv-app/purchases/controller.list')
    Route.get('/:id_grupo_pixeles', 'sv-app/purchases/controller.list')
})
    .prefix('purchases')
    .middleware('auth')