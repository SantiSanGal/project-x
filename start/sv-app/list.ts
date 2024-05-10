import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Route from '@ioc:Adonis/Core/Route'
import Controller from 'App/Controllers/Http/sv-app/controller'

const app = new Controller()

Route.group(() => {
    Route.get('/', ({ request, response, auth }: HttpContextContract) => app.list(request, response, auth))
})
    .prefix('/main')
    .middleware('auth')
