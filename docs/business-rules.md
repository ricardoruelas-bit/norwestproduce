# Reglas de negocio NORWEST ERP USA

## Utilidad por vendedor

- La utilidad total de una venta es venta menos costo.
- Norwest Produce LLC conserva el porcentaje configurado en Configuracion USA.
- La utilidad disponible para vendedores es el remanente despues del porcentaje de Norwest.
- Cada cliente tiene un solo vendedor asignado.
- El vendedor asignado recibe el porcentaje configurado en el cliente.
- El porcentaje restante de la utilidad disponible se divide en dos partes iguales: RR y GM.
- RR es alias de Ricardo Ruelas. En reportes debe mostrarse como Ricardo Ruelas cuando exista ese usuario.
- Si Ricardo Ruelas o GM tambien participan por la regla del cliente, sus montos se acumulan en una sola linea.
- Si la venta tiene perdida, no se genera utilidad por liquidar a vendedores.

## Inventario importado

- Una carga puede incluir uno o varios productos.
- La factura de carga identifica la entrada y debe usarse para consultas futuras.
- El boton Received confirma disponibilidad fisica en bodega.
- Una partida marcada como Received solo debe editarse con autorizacion administrativa.
- Si se factura el total de cajas de una partida, la edicion queda bloqueada salvo que una factura se cancele y vuelva a liberar inventario.

## Facturacion y ajustes

- La factura original conserva el detalle de la venta.
- Un ajuste posterior puede afectar solo parte de las cajas de un producto.
- Las lineas ajustadas deben marcarse como **Adjusted en la factura ajustada.
- La descripcion visible del ajuste aparece en la factura ajustada.
- La descripcion detallada para Norwest Produce es interna y no debe imprimirse en la factura.

## Cotizacion para importar

- Es una herramienta de consulta.
- No modifica inventario, ventas, facturacion, cartera ni reportes operativos.
- Puede incluir varios productos dentro de la misma carga planeada.
- Los costos se usan para estimar costo puesto USA, utilidad por caja y utilidad total.
