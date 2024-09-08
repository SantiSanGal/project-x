import Database from "@ioc:Adonis/Lucid/Database";

export const getUserData = async (userId) => {
    const [userData] = await Database.connection('pg')
        .query()
        .select('username', 'name', 'last_name', 'email')
        .from('users')
        .where('id', '=', userId);

    return userData;
}