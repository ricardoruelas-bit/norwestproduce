# Operacion y despliegue

## Verificacion local

Antes de publicar:

```bash
pnpm run ops:check
pnpm run verify
git diff --check
```

## Publicacion

1. Confirmar que el cambio esta en `C:\NorwestERP\norwestproduce`.
2. Hacer commit claro y pequeno.
3. Subir a `main` en GitHub.
4. Desplegar produccion en Vercel.
5. Revisar https://norwestproduce.vercel.app.

## Variables criticas

- `DATABASE_URL`, `POSTGRES_URL` o `NEON_DATABASE_URL`: base de datos.
- `BLOB_READ_WRITE_TOKEN` o `BLOB_STORE_ID`: archivos adjuntos.
- `SESSION_SECRET`: firma de sesiones.
- `ADMIN_EMAIL`, `ADMIN_FULL_NAME`, `ADMIN_PASSWORD_HASH`: cuenta administradora inicial si se necesita reconstruir el acceso.

## Respaldo

Frecuencia recomendada:

- Diario: respaldo de base de datos.
- Diario: verificacion de adjuntos en Vercel Blob.
- Antes de cambios grandes: respaldo manual y etiqueta de Git.

Contenido minimo de respaldo:

- Base de datos completa.
- Archivos adjuntos.
- Commit de GitHub asociado al despliegue vigente.
- Variables de entorno documentadas, sin guardar secretos en Git.

## Recuperacion

1. Restaurar base de datos.
2. Verificar variables de entorno.
3. Desplegar el ultimo commit estable.
4. Probar login, catalogos, inventario, venta, facturacion y cartera.
