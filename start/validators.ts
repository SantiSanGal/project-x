import { validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'

validator.rule('uniqueCombinationInTwoTables', async (value, _, options) => {
  console.log('->', value);

  const { pointer, arrayExpressionPointer, errorReporter, root } = options

  const table1 = 'rangos_proceso_compra'
  const table2 = 'grupos_pixeles'

  const existsInTable1 = await Database.from(table1).where({
    coordenada_x_inicio: root.coordenada_x_inicio,
    coordenada_y_inicio: root.coordenada_y_inicio,
    coordenada_x_fin: root.coordenada_x_fin,
    coordenada_y_fin: root.coordenada_y_fin,
  }).first()

  const existsInTable2 = await Database.from(table2).where({
    coordenada_x_inicio: root.coordenada_x_inicio,
    coordenada_y_inicio: root.coordenada_y_inicio,
    coordenada_x_fin: root.coordenada_x_fin,
    coordenada_y_fin: root.coordenada_y_fin,
  }).first()

  if (existsInTable1 || existsInTable2) {
    errorReporter.report(
      pointer,
      'uniqueCombinationInTwoTables',
      'La combinación de coordenadas ya existe en una de las dos tablas',
      arrayExpressionPointer
    )
  }
})