import Route from '@ioc:Adonis/Core/Route';

Route.group(() => {
    Route.get('/', 'sv-app/user/controller') //para listar datos del usuario
    Route.put('/edit', 'sv-app/user/controller') //para editar los datos del usuario
    Route.put('/password', 'sv-app/user/controller') //para editar la contraseña del usuario
})
    .prefix('user')
    .middleware('auth')