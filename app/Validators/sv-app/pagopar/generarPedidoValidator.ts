import { schema, rules } from '@ioc:Adonis/Core/Validator'

class GenerarPedidoValidator {
  public schema = schema.create({
    coordenada_x_inicio: schema.number([rules.required()]),
    coordenada_y_inicio: schema.number([rules.required()]),
    coordenada_x_fin: schema.number([rules.required()]),
    coordenada_y_fin: schema.number([rules.required()])
  })
}

export default GenerarPedidoValidator
