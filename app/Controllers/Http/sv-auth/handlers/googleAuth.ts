import type { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import User from "App/Models/User";

// export const googleAuth = async ({
//   request,
//   response,
//   auth,
//   ally,
// }: HttpContextContract) => {
//   const { credentialResponse } = request.all();
//   console.log("-------------------------------------------------");
//   console.log("googleAuth credentialResponse", credentialResponse);
//   console.log("-------------------------------------------------");
//   const google = ally.use("google").stateless();
//   console.log("google", google);
//   console.log("-------------------------------------------------");

//   /**
//    * Verifica que el token de Google sea válido
//    */
//   const googleUser = await google.userFromToken(credentialResponse.credential);
//   console.log("googleUser", googleUser);
//   console.log("-------------------------------------------------");

//   if (!googleUser) {
//     return response.unauthorized({ message: "Invalid Google token" });
//   }

//   try {
//     /**
//      * Busca un usuario con el email de Google o crea uno nuevo.
//      * `updateOrCreate` es perfecto para esto:
//      * 1. Busca un usuario que coincida con { email: googleUser.email }.
//      * 2. Si lo encuentra, actualiza sus datos (nombre, avatar, etc.).
//      * 3. Si no lo encuentra, crea un nuevo usuario con todos los datos.
//      */
//     const user = await User.updateOrCreate(
//       {
//         email: googleUser.email,
//       },
//       {
//         name: googleUser.name,
//         lastName: googleUser.original.family_name || " ",
//         oauthProviderId: googleUser.id,
//         oauthProviderName: "google",
//         username: googleUser.email, // O puedes generar un username único
//         // La contraseña será null para este usuario
//       }
//     );

//     /**
//      * Genera un token de API para el usuario.
//      * Esto usa tu guard 'api' configurado en config/auth.ts
//      */
//     const oat = await auth.use("api").generate(user, {
//       expiresIn: "7days",
//       name: "google-login-token",
//     });

//     return response.ok({
//       token: oat.token,
//       user: user.serialize(), // Envía los datos del usuario al frontend
//     });
//   } catch (error) {
//     console.log("error", error);
//     console.error("Error durante la autenticación de Google:", error);
//     return response.internalServerError({
//       message: "An error occurred during Google authentication.",
//       error: error.message,
//     });
//   }
// };

// app/Controllers/Http/sv-auth/handlers/googleAuth.ts

// ... (importaciones)

export const googleAuth = async ({
  request,
  response,
  auth,
  ally,
}: HttpContextContract) => {
  const { credentialResponse } = request.body(); // Usar request.body() es más idiomático
  const google = ally.use("google").stateless();

  try {
    const googleUser = await google.userFromToken(
      credentialResponse.credential
    );

    // --- Punto de Debugging ---
    // Si sigue fallando, descomenta esta línea para ver exactamente qué te devuelve Google
    // console.log('GOOGLE USER OBJECT:', JSON.stringify(googleUser, null, 2));
    console.log("googleUser", googleUser);

    if (!googleUser) {
      return response.unauthorized({ message: "Invalid Google token" });
    }

    const user = await User.updateOrCreate(
      {
        email: googleUser.email,
      },
      {
        name: googleUser.name,
        // 👇 CÓDIGO CORREGIDO: Usamos optional chaining para evitar errores
        lastName: googleUser.original?.family_name || " ",
        oauthProviderId: googleUser.id,
        oauthProviderName: "google",
        username: googleUser.email,
        // La contraseña será null para estos usuarios
        // Nos aseguramos de que el campo accepted_terms_and_conditions tenga un valor
        acceptedTermsAndConditions: true,
      }
    );

    const oat = await auth.use("api").generate(user, {
      expiresIn: "7days",
      name: "google-login-token",
    });

    return response.ok({
      token: oat.token,
      user: user.serialize(),
    });
  } catch (error) {
    console.error(
      "Error en el backend durante la autenticación de Google:",
      error
    );
    return response.internalServerError({
      message: "Ocurrió un error en el servidor.",
      error: error.message,
    });
  }
};
