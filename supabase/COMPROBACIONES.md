# Comprobaciones hechas, con su número

Lo que se midió, cuándo, y el resultado. Está aquí porque un número dicho en una
conversación se pierde, y luego nadie sabe si aquello llegó a comprobarse.

## RLS, desde fuera · 7-10-2026 · **15 de 15**

Después de aplicar `supabase/fase3w.sql`, que quitó las dos últimas políticas de
lectura pública (`muro_posts · public read posts` y
`user_gooals · public read completed`).

```bash
node --env-file=.env.local scripts/comprobar-rls.mjs
```

Lo que contesta hoy la clave pública del navegador, sin sesión:

| | |
|---|---|
| perfiles | no lee ninguno |
| invitaciones_email | no las lee, ni las modifica |
| follows | no lee |
| **muro_posts** | **no lee** (antes sí: era público a propósito) |
| **user_gooals** | **no lee** (antes sí: salían las rutas de las fotos) |
| gooals_v2 | sí, solo lo verificado. Es el catálogo, y es público a propósito |

Y con sesión, esa cuenta solo ve su propia ficha: ni el correo de nadie, ni las
invitaciones de otros, ni `follows` entera.

> Las dos filas en negrita son las que cambiaron ese día. Entre el commit
> `bbd7a23` y el momento de pegar el SQL, el guion daba **13 de 15** a
> propósito: la comprobación ya exigía lo nuevo. No era una avería.

## Antes de esto

- **5-10-2026 ·** las fotos de la gente dejan de ser públicas. El cubo
  `gooals-media` se vacía y se borra; las fotos pasan a `logros-privados`, que
  es privado y solo se lee con direcciones firmadas que caducan.
- **5-10-2026 ·** `/api/proxy-image` deja de aceptar cualquier dirección. Antes
  devolvía 200 a `example.com`, a `localhost` y a direcciones internas.
