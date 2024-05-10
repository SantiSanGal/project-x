import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Route from '@ioc:Adonis/Core/Route'
import Controller from 'App/Controllers/Http/sv-auth/controller'

const login = new Controller()

Route.group(() => {
    Route.post('/login', 'sv-auth/controller.verify')
    Route.post('/register', 'sv-auth/controller.register')
    Route.post('/register', ({ request, response, auth }: HttpContextContract) => login.register(request, response, auth))
    Route.post('/logout', ({ request, response, auth }: HttpContextContract) => login.logout(request, response, auth))
}).prefix('/auth')
