// database/migrations/xxxx_add_oauth_to_users.ts
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Columna para guardar el ID único del proveedor (ej. el 'sub' de Google)
      table.string('oauth_provider_id').nullable()
      // Columna para saber qué proveedor usó (ej. 'google')
      table.string('oauth_provider_name').nullable()

      // Hacemos la contraseña nullable, ya que los usuarios de Google no tendrán una.
      table.string('password').nullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('oauth_provider_id')
      table.dropColumn('oauth_provider_name')
      table.string('password').notNullable().alter() // Revertimos el cambio
    })
  }
}