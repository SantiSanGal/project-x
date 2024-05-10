import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.post('/login', 'sv-auth/controller.verify')
    Route.post('/register', 'sv-auth/controller.register')
    Route.post('/logout', 'sv-auth/controller.logout')
}).prefix('/auth')
