import { schema, CustomMessages, rules } from '@ioc:Adonis/Core/Validator'

export default class resgisterValidator {
    public schema = schema.create({
        name: schema.string({ trim: true }, [
            rules.required(),
            rules.minLength(5),
            rules.maxLength(255)
        ]),
        last_name: schema.string({ trim: true }, [
            rules.required(),
            rules.minLength(5),
            rules.maxLength(255)
        ]),
        email: schema.string({ trim: true }, [
            rules.required(),
            rules.minLength(5),
            rules.maxLength(255),
            rules.unique({
                table: 'users',
                column: 'email'
            })
        ]),
        username: schema.string({ trim: true }, [
            rules.required(),
            rules.minLength(5),
            rules.maxLength(255),
            rules.unique({
                table: 'users',
                column: 'username'
            })
        ]),
        password: schema.string({ trim: true }, [
            rules.required(),
            rules.minLength(8),
            rules.maxLength(255)
        ])
    })

    public messages: CustomMessages = {
        maxLength: 'The field {{ field }} must have at most {{options.maxLength}} characters',
        minLength: 'The field {{ field }} must have at least {{options.minLength}} characters',
        unique: '{{ field }} already exists',
        required: 'The field {{ field }} is required',
    }
}