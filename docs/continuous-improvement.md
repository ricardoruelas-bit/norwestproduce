# Mejora continua

## Prioridad 1: estabilidad

- Mantener `pnpm run verify` antes de cada despliegue.
- Agregar pruebas unitarias a reglas de negocio nuevas.
- Agregar pruebas de flujo para alta de cliente, inventario, venta, facturacion, ajuste y cartera.
- Registrar errores de API con contexto suficiente para diagnosticar sin exponer datos sensibles.

## Prioridad 2: arquitectura

- Dividir `app/usa/usa-dashboard.tsx` por modulo: catalogos, inventario, ventas, facturacion, cartera, reportes, administracion y cotizacion.
- Mover calculos compartidos a `lib/`.
- Crear componentes reutilizables para modales, tablas, inputs de dinero y selectores.

## Prioridad 3: seguridad

- Mantener permisos sensibles validados en servidor.
- Revisar que cada endpoint de escritura tenga permiso explicito.
- Rotar `SESSION_SECRET` y credenciales administrativas cuando haya cambios de acceso.
- Mantener secretos solo en Vercel o en `.env.local` local no versionado.

## Prioridad 4: datos

- Definir politica de respaldo y restauracion.
- Documentar migraciones de Drizzle por version.
- Crear datos semilla controlados para pruebas, separados de informacion real.

## Prioridad 5: operacion

- Usar ramas cortas para cambios grandes.
- Publicar cambios pequenos y verificables.
- Documentar reglas nuevas en `docs/business-rules.md`.
- Mantener GitHub, carpeta local y Vercel alineados en cada entrega.
