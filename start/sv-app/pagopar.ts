import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.post('/generarPedido', 'sv-app/pagopar/controller.generarPedido')
}).prefix('pagopar')