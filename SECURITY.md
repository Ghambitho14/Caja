# Seguridad

## Variables de entorno

- Crea un archivo `.env` a partir de `.env.example` y rellena las variables.
- **No subas `.env`** al repositorio (ya está en `.gitignore`).
- En producción, configura las variables en tu plataforma (Vercel, Netlify, etc.).

## Supabase

- La app usa la **anon key** de Supabase (pública). La seguridad debe basarse en **Row Level Security (RLS)**.
- **Nunca** pongas la **service_role** key en el frontend; solo en backend o scripts de confianza.

### Aplicar RLS multiusuario, roles y aprobación

En el proyecto de Supabase, aplica estas migraciones para completar el flujo:

1. `supabase/migrations/20260305000000_auth_multiuser.sql`
2. `supabase/migrations/20260305010000_user_roles_approval.sql`

Si usas SQL Editor, ejecuta primero la 00000 y luego la 010000.
Si usas CLI, corre `supabase db push`.

Esta configuración:

- Aísla los datos por `user_id` con RLS.
- Crea `app_users` con `role` (`admin`/`user`) y `status` (`pending`/`active`/`blocked`).
- Define admin fijo para `bel4ndria.d.jhon@gmail.com`.
- Deja nuevos registros en estado `pending` para que el admin los apruebe o bloquee.

## Validación de datos (este proyecto)

- En `src/utils/api.js` se sanean todas las entradas antes de enviar a Supabase:
  - Longitud máxima de textos (descripción, nombre, id).
  - Fechas en formato `YYYY-MM-DD`.
  - Año/mes en rangos válidos; montos en rango `0 .. 100_000_000` (alineado con CHECK en BD).
- El `id` en `deletePedidoFromApi` se valida y se trunca a longitud máxima.

## Headers de seguridad (producción)

En el servidor que sirve la app (o en la configuración de hosting), se recomienda:

- **HTTPS** siempre.
- **Content-Security-Policy** (CSP) para limitar scripts y orígenes.
- **X-Content-Type-Options: nosniff**.
- **X-Frame-Options: DENY** (o SAMEORIGIN si necesitas iframes).

Ejemplo para Vercel (`vercel.json`):

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" }
    ]}
  ]
}
```

## Dependencias

- Ejecuta `npm audit` de vez en cuando y corrige vulnerabilidades críticas/altas.
