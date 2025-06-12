import { schema, CustomMessages, rules } from "@ioc:Adonis/Core/Validator";

export default class resgisterValidator {
  public schema = schema.create({
    name: schema.string({ trim: true }, [
      rules.required(),
      rules.minLength(5),
      rules.maxLength(25),
    ]),
    last_name: schema.string({ trim: true }, [
      rules.required(),
      rules.minLength(5),
      rules.maxLength(25),
    ]),
    email: schema.string({ trim: true }, [
      rules.required(),
      rules.minLength(5),
      rules.maxLength(255),
      rules.unique({
        table: "users",
        column: "email",
      }),
    ]),
    username: schema.string({ trim: true }, [
      rules.required(),
      rules.minLength(5),
      rules.maxLength(25),
      rules.unique({
        table: "users",
        column: "username",
      }),
    ]),
    password: schema.string({ trim: true }, [
      rules.required(),
      rules.minLength(8),
      rules.maxLength(255),
    ]),
    // document: schema.string({ trim: true }, [
    //     rules.required(),
    //     rules.minLength(6),
    //     rules.maxLength(255)
    // ]),
    // type_document: schema.string({ trim: true }, [ //CI, DNI, passport
    //     rules.required()
    // ])
  });

  public messages: CustomMessages = {
    maxLength:
      "The field {{ field }} must have at most {{options.maxLength}} characters",
    minLength:
      "The field {{ field }} must have at least {{options.minLength}} characters",
    unique: "{{ field }} already exists",
    required: "The field {{ field }} is required",
  };
}
