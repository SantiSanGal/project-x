// app/Models/User.ts
import { DateTime } from "luxon";
import Hash from "@ioc:Adonis/Core/Hash";
import { BaseModel, column, beforeSave } from "@ioc:Adonis/Lucid/Orm";

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public username: string;

  @column()
  public name: string;

  @column({ columnName: "last_name" })
  public lastName: string;

  @column()
  public email: string;

  @column({ serializeAs: null })
  public password?: string | null;

  @column({ columnName: "remember_me_token", serializeAs: null })
  public rememberMeToken?: string | null;

  @column({ columnName: "oauth_provider_id" })
  public oauthProviderId?: string | null;

  @column({ columnName: "oauth_provider_name" })
  public oauthProviderName?: string | null;

  @column.dateTime({ columnName: "created_at", autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({
    columnName: "updated_at",
    autoCreate: true,
    autoUpdate: true,
  })
  public updatedAt: DateTime;

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password && user.password) {
      user.password = await Hash.make(user.password);
    }
  }
}
