# Plantillas de correo de Supabase

Los correos de **autenticación** no los manda la app: los manda Supabase. Su
plantilla se edita en el panel de Supabase y **Supabase no la versiona**: si
alguien la cambia allí, no queda rastro. Por eso aquí hay una copia de cada una.

**Esta carpeta no se ejecuta ni se despliega.** Es la copia buena: si el panel y
estos ficheros no coinciden, manda lo que hay aquí.

## Cuáles se usan

La app entra con **email y contraseña** y las altas se confirman solas, así que
de las seis plantillas de Supabase hoy solo sale una:

| Plantilla de Supabase | ¿Se usa? | Por qué |
|---|---|---|
| **Reset Password** | **Sí** | `resetPasswordForEmail()` en `src/app/page.tsx` («¿Has olvidado la contraseña?») |
| Confirm signup | No | «Confirm email» está apagado: las cuentas nacen confirmadas |
| Magic Link | No | No se usa `signInWithOtp()` en ninguna parte |
| Change Email Address | No | La app no deja cambiar el email |
| Invite user | No | Las invitaciones las manda la app por Resend (`/api/invitar`) |
| Reauthentication | No | No se usa |

Si algún día se enciende «Confirm email» o se añade el enlace mágico, hay que
escribir su plantilla: sin ella, Supabase manda la suya, gris y en inglés.

## Dónde se pega

Panel de Supabase → **Authentication** → **Emails** → pestaña **Templates** →
**Reset Password**:

- **Subject heading:** `Cambia tu contraseña de GooALS`
- **Message body:** el contenido de `recuperar-contrasena.html`, entero.

El enlace del correo **no** usa `{{ .ConfirmationURL }}`, sino
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.

Es a propósito. Con `ConfirmationURL` y el modo PKCE del navegador, el enlace
solo servía en el mismo navegador donde se pidió: quien lo pedía en el ordenador
y lo abría en el móvil acababa en la pantalla de entrar sin poder cambiar nada.
Ahora el enlace lo verifica nuestro servidor en `/auth/confirm` y funciona en
cualquier dispositivo. Para que eso encaje, la petición sale de `/api/recuperar`
**sin PKCE**; si algún día se vuelve a pedir desde el navegador con PKCE, este
enlace dejará de valer.

En **Authentication → URL Configuration**, el *Site URL* tiene que ser la
dirección de la app (`https://gooals.app`): es lo que sustituye a `{{ .SiteURL }}`.

Al lado, en **SMTP Settings**, está el remitente (Resend, `hola@gooals.app`).
La duración del enlace está en **Authentication** → **Sign In / Providers** →
**Email** → *Email OTP Expiration*: el correo dice «una hora», que es el valor
por defecto (3600 s). Si se cambia allí, hay que cambiar la frase aquí.

## Reglas al tocarlas

- Mismos colores que el resto de correos (`src/lib/email-plantilla.ts`):
  fondo Sand `#F5F5F2`, tarjeta blanca con borde `#E4E4DF`, texto Obsidian
  `#0B0B0B`, botón Aurora `#00D1A7`, marca y enlaces Aurora Dark `#009E7E`,
  pie Stone `#7A8A85`.
- HTML entero y autónomo: Supabase no entiende nada del repo.
- Tablas y estilos en línea, que es lo único que respetan Gmail y Outlook.
- Siempre el enlace **también en texto**, debajo del botón.
- Siempre decir cuánto dura el enlace y qué hacer si no lo pidió.
- El botón va **oscuro con texto claro** (Obsidian con Sand): las apps de Gmail
  oscurecen el correo por su cuenta y un botón claro se quedaba ilegible.
- **Sin enlace de baja:** son correos de servicio, no publicidad. Nadie puede
  darse de baja de poder recuperar su contraseña.
