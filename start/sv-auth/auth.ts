import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
    Route.post('/login', 'sv-auth/controller.login')
    Route.post('/logout', 'sv-auth/controller.logout')
    Route.post('/register', 'sv-auth/controller.register')
    Route.get('/verify', 'sv-auth/controller.verify')
}).prefix('/auth')