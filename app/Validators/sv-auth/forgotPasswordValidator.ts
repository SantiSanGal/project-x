import { schema, rules, CustomMessages } from '@ioc:Adonis/Core/Validator';

export default class forgotPasswordValidator {
    public schema = schema.create({
        email: schema.string({ trim: true }, [
            rules.required(),
            rules.minLength(5),
            rules.maxLength(255),
            rules.exists({
                table: 'users',
                column: 'email'
            })
        ])
    })

    public messages: CustomMessages = {
        maxLength: 'The field {{ field }} must have at most {{options.maxLength}} characters',
        minLength: 'The field {{ field }} must have at least {{options.minLength}} characters',
        exist: '{{ field }} does not exists',
        required: 'The field {{ field }} is required',
    }
}