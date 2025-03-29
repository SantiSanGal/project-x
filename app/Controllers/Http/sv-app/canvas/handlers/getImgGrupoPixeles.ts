import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import path from 'path'
import fs from 'fs'

export const getImgGrupoPixeles = async ({ params, response }: HttpContextContract) => {
    try {
        const grupoId = params.id
        const imageDir = path.join(__dirname, './../../../../../../public/individuales')

        if (!fs.existsSync(imageDir)) {
            return response.status(404).json({ message: 'Directorio de imágenes no encontrado' })
        }

        const files = fs.readdirSync(imageDir)
        const fileName = files.find(file => file === `${grupoId}.png`)

        if (!fileName) {
            return response.status(404).json({ message: 'Imagen no encontrada' })
        }

        const filePath = path.join(imageDir, fileName)
        const fileBuffer = fs.readFileSync(filePath)
        response.header('Content-Type', 'image/png')
        return response.send(fileBuffer)
    } catch (error) {
        console.error(error)
        return response.status(500).json({ message: error.message })
    }
}
