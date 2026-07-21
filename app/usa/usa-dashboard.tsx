"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { InventoryLot, Sale } from "../../lib/types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US");
const shortDate = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
type Operation = "DIRECT_RESALE" | "IMPORTED_INVENTORY";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null) {
  return value ? shortDate.format(new Date(`${value}T00:00:00Z`)) : "—";
}

function daysPastDue(value: string | null) {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(`${value}T00:00:00Z`).getTime()) / 86400000);
}

const blankSale = {
  saleDate: localDateKey(), operationType: "DIRECT_RESALE" as Operation, supplier: "", inventoryLotId: "", customer: "", purchaseOrder: "", warehouse: "", pickupNumber: "",
  boxes: "", product: "", presentation: "", size: "", label: "", purchasePrice: "", salePrice: "", shipDate: "", pickupDate: "",
};

export default function UsaDashboard({ initialSales }: { initialSales: Sale[] }) {
  const [salesRows, setSalesRows] = useState<Sale[]>(initialSales);
  const [inventory, setInventory] = useState<InventoryLot[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [operationType, setOperationType] = useState("TODAS");
  const [modalStep, setModalStep] = useState<"closed" | "choose" | "form">("closed");
  const [form, setForm] = useState(blankSale);
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    fetch("/api/usa/sales").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data.sales)) setSalesRows(data.sales);
    }).catch(() => undefined);
  }, []);

  async function loadInventory() {
    setInventoryLoading(true);
    try {
      const response = await fetch("/api/usa/inventory");
      const data = await response.json();
      setInventory(Array.isArray(data.lots) ? data.lots : []);
    } catch {
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  }

  function openNewSale() {
    setForm({ ...blankSale, saleDate: localDateKey() });
    setSaveState("");
    setModalStep("choose");
  }

  function chooseOperation(type: Operation) {
    setForm({ ...blankSale, saleDate: localDateKey(), operationType: type });
    setSaveState("");
    if (type === "IMPORTED_INVENTORY") void loadInventory();
    setModalStep("form");
  }

  function closeModal() {
    setModalStep("closed");
    setSaveState("");
  }

  function selectInventoryLot(lot: InventoryLot) {
    setForm((current) => ({
      ...current,
      inventoryLotId: String(lot.id),
      supplier: lot.supplier ?? "",
      warehouse: lot.warehouse,
      pickupNumber: lot.pickupNumber ?? "",
      product: lot.product,
      presentation: lot.presentation ?? "",
      size: lot.size ?? "",
      label: lot.label ?? "",
      purchasePrice: lot.unitCost == null ? "" : String(lot.unitCost),
      boxes: Number(current.boxes) > lot.availableBoxes ? "" : current.boxes,
    }));
  }

  const selectedLot = inventory.find((lot) => lot.id === Number(form.inventoryLotId));
  const filtered = useMemo(() => salesRows.filter((row) => {
    const text = `${row.customer} ${row.purchaseOrder ?? ""} ${row.pickupNumber} ${row.product} ${row.warehouse} ${row.invoiceNumber ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase())
      && (status === "TODOS" || (status === "SIN FACTURA" ? !row.invoiceNumber : row.loadStatus === status))
      && (operationType === "TODAS" || row.operationType === operationType);
  }), [salesRows, query, status, operationType]);

  const totals = useMemo(() => {
    const today = localDateKey();
    const currentMonth = today.slice(0, 7);
    const todayRows = salesRows.filter((row) => row.saleDate === today);
    const monthRows = salesRows.filter((row) => row.saleDate.startsWith(currentMonth));
    return {
      todaySales: todayRows.reduce((sum, row) => sum + (row.total ?? 0), 0),
      monthSales: monthRows.reduce((sum, row) => sum + (row.total ?? 0), 0),
      todayBoxes: todayRows.reduce((sum, row) => sum + row.boxes, 0),
      monthBoxes: monthRows.reduce((sum, row) => sum + row.boxes, 0),
      uninvoiced: salesRows.filter((row) => !row.invoiceNumber).reduce((sum, row) => sum + (row.total ?? 0), 0),
    };
  }, [salesRows]);

  async function saveSale(event: FormEvent) {
    event.preventDefault();
    setSaveState("Guardando…");
    const payload = {
      saleDate: form.saleDate, operationType: form.operationType, supplier: form.supplier, inventoryLotId: form.inventoryLotId ? Number(form.inventoryLotId) : null,
      customer: form.customer, purchaseOrder: form.purchaseOrder, warehouse: form.warehouse, pickupNumber: form.pickupNumber,
      boxes: Number(form.boxes), product: form.product, presentation: form.presentation, size: form.size, label: form.label,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null, salePrice: form.salePrice ? Number(form.salePrice) : null,
      shipDate: form.shipDate || null, pickupDate: form.pickupDate || null,
      dueDate: form.pickupDate ? new Date(new Date(`${form.pickupDate}T00:00:00Z`).getTime() + 21 * 86400000).toISOString().slice(0, 10) : null,
      loadStatus: "OK", invoiceNumber: null,
    };
    try {
      const response = await fetch("/api/usa/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
      setSalesRows((current) => [data.sale, ...current]);
      if (form.operationType === "IMPORTED_INVENTORY") await loadInventory();
      closeModal();
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  return (
    <main className="erp-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="mini-mark"><span /><span /></div><div><strong>NORWEST</strong><small>PRODUCE LLC</small></div></div>
        <nav>
          <a className="nav-item active"><span>▦</span> Resumen</a><a className="nav-item"><span>↗</span> Ventas</a><a className="nav-item"><span>▤</span> Cargas</a>
          <a className="nav-item"><span>□</span> Facturación</a><a className="nav-item"><span>◎</span> Cartera</a><a className="nav-item"><span>◇</span> Catálogos</a><a className="nav-item"><span>⌁</span> Reportes</a>
        </nav>
        <div className="sidebar-bottom"><div className="operation-pill"><span>USA</span><div><strong>Norwest Produce LLC</strong><small>Operación activa</small></div></div><Link href="/">⇄ Cambiar empresa</Link></div>
      </aside>

      <section className="erp-content">
        <header className="topbar"><div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Ventas y operaciones</h1></div><div className="topbar-actions"><button className="icon-button" aria-label="Notificaciones">♢<i /></button><button className="primary-button" onClick={openNewSale}>＋ Nueva venta</button></div></header>
        <section className="summary-grid">
          <article className="metric-card accent-green"><div className="metric-icon">$</div><p>Vendido hoy</p><strong>{money.format(totals.todaySales)}</strong><span>Acumulado del mes: <b>{money.format(totals.monthSales)}</b></span></article>
          <article className="metric-card accent-blue"><div className="metric-icon">□</div><p>Cajas vendidas hoy</p><strong>{number.format(totals.todayBoxes)}</strong><span>Acumulado del mes: <b>{number.format(totals.monthBoxes)}</b></span></article>
          <article className="metric-card accent-gold"><div className="metric-icon">!</div><p>Por facturar</p><strong>{money.format(totals.uninvoiced)}</strong><span>{salesRows.filter((row) => !row.invoiceNumber).length} partidas sin factura</span></article>
          <article className="metric-card accent-earth"><div className="metric-icon">◎</div><p>Clientes activos</p><strong>{new Set(salesRows.map((row) => row.customer)).size}</strong><span>En el archivo de referencia</span></article>
        </section>
        <section className="sales-panel">
          <div className="panel-heading"><div><h2>Registro de ventas</h2><p>Partidas importadas de “VENTAS NORWEST DIC 2025 - 2026”</p></div><span className="record-count">{filtered.length} {filtered.length === 1 ? "partida" : "partidas"}</span></div>
          <div className="filters"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, PO#, PU#, producto o factura" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estatus"><option>TODOS</option><option>OK</option><option>SE AJUSTÓ</option><option>PRECIO PENDIENTE</option><option>SIN FACTURA</option></select>
            <select value={operationType} onChange={(event) => setOperationType(event.target.value)} aria-label="Filtrar por tipo de operación"><option value="TODAS">TODAS LAS OPERACIONES</option><option value="DIRECT_RESALE">COMPRA Y REVENTA</option><option value="IMPORTED_INVENTORY">INVENTARIO IMPORTADO</option></select>
          </div>
          <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Operación</th><th>Cliente / PO#</th><th>PU# / Bodega</th><th>Producto</th><th className="numeric">Cajas</th><th className="numeric">Precio</th><th className="numeric">Total</th><th>Estatus</th><th>Factura</th><th>Vence</th></tr></thead>
            <tbody>{filtered.map((row, index) => { const overdue = daysPastDue(row.dueDate); return <tr key={row.id ?? `${row.sourceRow}-${index}`}>
              <td className="date-cell">{formatDate(row.saleDate)}</td><td><span className={`operation-tag ${row.operationType === "IMPORTED_INVENTORY" ? "inventory" : "resale"}`}>{row.operationType === "IMPORTED_INVENTORY" ? "Inventario" : "Reventa"}</span></td>
              <td><strong>{row.customer}</strong><small>PO# {row.purchaseOrder || "N/A"}</small></td><td><strong>{row.pickupNumber}</strong><small>{row.warehouse}</small></td>
              <td><strong>{row.product}</strong><small>{[row.presentation, row.size, row.label].filter(Boolean).join(" · ") || "—"}</small></td><td className="numeric">{number.format(row.boxes)}</td>
              <td className="numeric">{row.salePrice == null ? <span className="pending-text">Pend.</span> : money.format(row.salePrice)}</td><td className="numeric strong-number">{row.total == null ? "—" : money.format(row.total)}</td>
              <td><span className={`status-tag ${row.loadStatus === "OK" ? "ok" : row.loadStatus === "PRECIO PENDIENTE" ? "warning" : "adjusted"}`}>{row.loadStatus}</span></td><td>{row.invoiceNumber ? <span className="invoice-chip">#{row.invoiceNumber}</span> : <span className="muted">Pendiente</span>}</td>
              <td><span className={overdue != null && overdue > 0 ? "overdue" : ""}>{formatDate(row.dueDate)}</span>{overdue != null && overdue > 0 && <small>{overdue} días</small>}</td>
            </tr>; })}</tbody></table></div>
        </section>
      </section>

      {modalStep !== "closed" && <div className="modal-backdrop" onMouseDown={closeModal}>
        {modalStep === "choose" ? <section className="sale-modal operation-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><p className="eyebrow">Nueva venta</p><h2>¿Qué tipo de venta es?</h2><p className="modal-intro">Selecciona el origen del producto para abrir la captura correspondiente.</p></div><button type="button" onClick={closeModal} aria-label="Cerrar">×</button></div>
          <div className="operation-choice-grid">
            <button type="button" className="operation-choice resale-choice" onClick={() => chooseOperation("DIRECT_RESALE")}><span className="choice-icon">⇄</span><strong>Compra y reventa</strong><small>Registra primero a quién se compró y después a quién se vendió.</small><i>Continuar →</i></button>
            <button type="button" className="operation-choice inventory-choice" onClick={() => chooseOperation("IMPORTED_INVENTORY")}><span className="choice-icon">▦</span><strong>Venta de inventario importado</strong><small>Elige una partida disponible del inventario en USA.</small><i>Ver inventario →</i></button>
          </div>
        </section> : <form className="sale-modal sale-modal-wide" onSubmit={saveSale} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><button type="button" className="back-link" onClick={() => setModalStep("choose")}>← Cambiar tipo</button><p className="eyebrow">{form.operationType === "DIRECT_RESALE" ? "Compra y reventa" : "Inventario importado"}</p><h2>Nueva venta</h2></div><button type="button" onClick={closeModal} aria-label="Cerrar">×</button></div>

          {form.operationType === "DIRECT_RESALE" ? <>
            <section className="form-section purchase-section"><div className="form-section-heading"><span>1</span><div><h3>Información de la compra</h3><p>Datos del proveedor y del producto adquirido.</p></div></div>
              <div className="form-grid"><label>Proveedor / a quién se compró<input required value={form.supplier} onChange={(e) => setForm({...form, supplier:e.target.value})} placeholder="Nombre del proveedor" /></label><label>PU# de compra<input required value={form.pickupNumber} onChange={(e) => setForm({...form, pickupNumber:e.target.value})} placeholder="Número de pickup" /></label><label>Producto<input required value={form.product} onChange={(e) => setForm({...form, product:e.target.value})} /></label><label>Presentación<input value={form.presentation} onChange={(e) => setForm({...form, presentation:e.target.value})} placeholder="Ej. caja 25 lb" /></label><label>Tamaño<input value={form.size} onChange={(e) => setForm({...form, size:e.target.value})} /></label><label>Etiqueta<input value={form.label} onChange={(e) => setForm({...form, label:e.target.value})} /></label><label>Precio de compra<input required min="0" step="0.01" type="number" value={form.purchasePrice} onChange={(e) => setForm({...form, purchasePrice:e.target.value})} /></label></div>
            </section>
          </> : <section className="form-section inventory-section"><div className="form-section-heading"><span>1</span><div><h3>Selecciona del inventario</h3><p>Solo aparecen partidas con cajas disponibles.</p></div></div>
            {inventoryLoading ? <div className="inventory-empty">Consultando inventario…</div> : inventory.length === 0 ? <div className="inventory-empty"><strong>No hay inventario importado disponible</strong><span>Cuando se registren entradas de importación, aparecerán aquí para poder venderlas.</span></div> : <div className="inventory-list">{inventory.map((lot) => <button key={lot.id} type="button" className={`inventory-row ${form.inventoryLotId === String(lot.id) ? "selected" : ""}`} onClick={() => selectInventoryLot(lot)}><span className="inventory-radio"/><span><strong>{lot.product}</strong><small>{[lot.presentation, lot.size, lot.label].filter(Boolean).join(" · ") || "Sin detalle"}</small></span><span><strong>{lot.warehouse}</strong><small>Recibido {formatDate(lot.receivedDate)}</small></span><span className="inventory-boxes"><strong>{number.format(lot.availableBoxes)}</strong><small>cajas disponibles</small></span></button>)}</div>}
          </section>}

          {(form.operationType === "DIRECT_RESALE" || selectedLot) && <section className="form-section sale-section"><div className="form-section-heading"><span>2</span><div><h3>Información de la venta</h3><p>Datos del cliente, entrega y precio de venta.</p></div></div>
            <div className="form-grid"><label>Fecha de venta<input required type="date" value={form.saleDate} onChange={(e) => setForm({...form, saleDate:e.target.value})} /></label><label>Cliente / a quién se vendió<input required value={form.customer} onChange={(e) => setForm({...form, customer:e.target.value})} placeholder="Nombre del cliente" /></label><label>PO# del cliente<input value={form.purchaseOrder} onChange={(e) => setForm({...form, purchaseOrder:e.target.value})} /></label><label>Bodega / destino<input required value={form.warehouse} onChange={(e) => setForm({...form, warehouse:e.target.value})} placeholder="Ej. PROFRESH" /></label><label>Cajas<input required min="1" max={selectedLot?.availableBoxes} type="number" value={form.boxes} onChange={(e) => setForm({...form, boxes:e.target.value})} /></label><label>Precio de venta<input required min="0" step="0.01" type="number" value={form.salePrice} onChange={(e) => setForm({...form, salePrice:e.target.value})} /></label><label>Día de embarque<input type="date" value={form.shipDate} onChange={(e) => setForm({...form, shipDate:e.target.value})} /></label><label>Día de pick up<input type="date" value={form.pickupDate} onChange={(e) => setForm({...form, pickupDate:e.target.value})} /></label></div>
          </section>}
          <div className="form-total"><span>Total calculado</span><strong>{form.boxes && form.salePrice ? money.format(Number(form.boxes) * Number(form.salePrice)) : "$0.00"}</strong></div>
          {saveState && <p className="form-message">{saveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button><button className="primary-button" type="submit" disabled={form.operationType === "IMPORTED_INVENTORY" && !selectedLot}>Guardar venta</button></div>
        </form>}
      </div>}
    </main>
  );
}
