import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { createCanvas } from 'canvas'
import path from 'path'
import fs from 'fs'

export const list = async ({ response, auth }: HttpContextContract) => {
    let params = {
        data: {},
        notification: {
            state: false,
            type: 'error',
            message: 'Error en el Servidor'
        }
    }

    try {
        const data = await Database.connection('pg')
            .query()
            .from('pixeles_individuales')

        const canvas = createCanvas(2000, 1000)
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        data.forEach(item => {
            const { coordenada_x, coordenada_y, color } = item
            console.log('Item:', item)

            // Validar color
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
                console.error(`Color inválido: ${color}`)
                return
            }

            ctx.fillStyle = color
            ctx.fillRect(coordenada_x, coordenada_y, 1, 1) // Pintar un pixel en la coordenada
        })


        const buffer = canvas.toBuffer('image/png')
        const imagePath = path.join(__dirname, '../../../../../../', 'public', 'images', 'output.png')
        fs.writeFileSync(imagePath, buffer)

        params.data = data
        params.notification.state = true
        params.notification.type = 'success'
        params.notification.message = 'Listado Correctamente'
        response.type('image/png')
        return response.send(buffer)
    } catch (e) {
        console.error(e)
        params.notification.message = e.message
        return response.status(500).json(params)
    }
}