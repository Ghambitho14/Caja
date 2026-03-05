# Seguridad

## Variables de entorno

- Crea un archivo `.env` a partir de `.env.example` y rellena las variables.
- **No subas `.env`** al repositorio (ya está en `.gitignore`).
- En producción, configura las variables en tu plataforma (Vercel, Netlify, etc.).

## Supabase

- La app usa la **anon key** de Supabase (pública). La seguridad debe basarse en **Row Level Security (RLS)**.
- **Nunca** pongas la **service_role** key en el frontend; solo en backend o scripts de confianza.

### Aplicar RLS y restricciones (migración)

En el proyecto de Supabase, aplica la migración que activa RLS y añade restricciones de montos:

1. **Opción A – SQL Editor:** En el dashboard de Supabase, abre **SQL Editor**, pega el contenido de `supabase/migrations/20260303000000_enable_rls_caja.sql` y ejecuta.
2. **Opción B – CLI:** Con Supabase CLI enlazado al proyecto, ejecuta `supabase db push` (o aplica la migración según tu flujo).

La migración:

- Activa **RLS** en `pedidos`, `gastos`, `metas`, `ajustes`, `ajustes_semana`.
- Crea políticas SELECT/INSERT/UPDATE/DELETE para el rol `anon` (la app sigue funcionando sin auth).
- Añade **CHECK** de montos en rango `0 .. 100_000_000` en `pedidos`, `gastos` y `metas`.

Si más adelante añades **Supabase Auth** (o otro modelo de usuarios), sustituye estas políticas por otras basadas en `auth.uid()` o en un identificador de tenant; las actuales son permisivas a propósito porque la app no usa auth.

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
