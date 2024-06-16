import Route from '@ioc:Adonis/Core/Route'

Route.post('/pagopar/generarPedido', 'sv-app/pagopar/controller.generarPedido')
    .middleware('auth')
Route.post('/pagopar/respuesta', 'sv-app/pagopar/controller.confirmarPago')
