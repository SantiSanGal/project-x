import { schema, CustomMessages, rules } from '@ioc:Adonis/Core/Validator'

export default class authValidator {
    public schema = schema.create({
        username: schema.string({ trim: true }, [
            rules.required(),
            rules.minLength(5),
            rules.maxLength(255),
            rules.exists({
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
        exists: 'Incorrect Username or Password',
        required: 'There are still required fields',
        minLength: 'The field {{ field }} must have at least {{options.minLength}} characters',
        maxLength: 'The field {{ field }} must have at most {{options.maxLength}} characters'
    }
}