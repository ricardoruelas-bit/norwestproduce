"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Sale } from "../../lib/types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US");
const shortDate = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });

function formatDate(value: string | null) {
  return value ? shortDate.format(new Date(`${value}T00:00:00Z`)) : "—";
}

function daysPastDue(value: string | null) {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(`${value}T00:00:00Z`).getTime()) / 86400000);
}

const blankSale = {
  saleDate: new Date().toISOString().slice(0, 10), customer: "", purchaseOrder: "", warehouse: "", pickupNumber: "",
  boxes: "", product: "", size: "", label: "", purchasePrice: "", salePrice: "", shipDate: "", pickupDate: "",
};

export default function UsaDashboard({ initialSales }: { initialSales: Sale[] }) {
  const [salesRows, setSalesRows] = useState<Sale[]>(initialSales);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankSale);
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    fetch("/api/usa/sales").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data.sales)) setSalesRows(data.sales);
    }).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => salesRows.filter((row) => {
    const text = `${row.customer} ${row.purchaseOrder ?? ""} ${row.pickupNumber} ${row.product} ${row.warehouse} ${row.invoiceNumber ?? ""}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesStatus = status === "TODOS" || (status === "SIN FACTURA" ? !row.invoiceNumber : row.loadStatus === status);
    return matchesQuery && matchesStatus;
  }), [salesRows, query, status]);

  const totals = useMemo(() => {
    const totalSales = salesRows.reduce((sum, row) => sum + (row.total ?? 0), 0);
    const boxes = salesRows.reduce((sum, row) => sum + row.boxes, 0);
    const loads = new Set(salesRows.map((row) => row.pickupNumber.split("-").slice(0, 2).join("-"))).size;
    const uninvoiced = salesRows.filter((row) => !row.invoiceNumber).reduce((sum, row) => sum + (row.total ?? 0), 0);
    return { totalSales, boxes, loads, uninvoiced };
  }, [salesRows]);

  async function saveSale(event: FormEvent) {
    event.preventDefault();
    setSaveState("Guardando…");
    const payload = {
      saleDate: form.saleDate, customer: form.customer, purchaseOrder: form.purchaseOrder, warehouse: form.warehouse,
      pickupNumber: form.pickupNumber, boxes: Number(form.boxes), product: form.product, size: form.size, label: form.label,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null, salePrice: form.salePrice ? Number(form.salePrice) : null,
      shipDate: form.shipDate || null, pickupDate: form.pickupDate || null, dueDate: form.pickupDate ? new Date(new Date(`${form.pickupDate}T00:00:00Z`).getTime() + 21 * 86400000).toISOString().slice(0, 10) : null,
      loadStatus: "OK", invoiceNumber: null,
    };
    try {
      const response = await fetch("/api/usa/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
      setSalesRows((current) => [data.sale, ...current]);
      setForm(blankSale);
      setShowForm(false);
      setSaveState("");
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  return (
    <main className="erp-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="mini-mark"><span /><span /></div><div><strong>NORWEST</strong><small>PRODUCE LLC</small></div></div>
        <nav>
          <a className="nav-item active"><span>▦</span> Resumen</a>
          <a className="nav-item"><span>↗</span> Ventas</a>
          <a className="nav-item"><span>▤</span> Cargas</a>
          <a className="nav-item"><span>□</span> Facturación</a>
          <a className="nav-item"><span>◎</span> Cartera</a>
          <a className="nav-item"><span>◇</span> Catálogos</a>
          <a className="nav-item"><span>⌁</span> Reportes</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="operation-pill"><span>USA</span><div><strong>Norwest Produce LLC</strong><small>Operación activa</small></div></div>
          <Link href="/">⇄ Cambiar empresa</Link>
        </div>
      </aside>

      <section className="erp-content">
        <header className="topbar">
          <div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Ventas y operaciones</h1></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Notificaciones">♢<i /></button><button className="primary-button" onClick={() => setShowForm(true)}>＋ Nueva venta</button></div>
        </header>

        <section className="summary-grid">
          <article className="metric-card accent-green"><div className="metric-icon">$</div><p>Ventas registradas</p><strong>{money.format(totals.totalSales)}</strong><span>Datos de la operación USA</span></article>
          <article className="metric-card accent-blue"><div className="metric-icon">□</div><p>Cajas vendidas</p><strong>{number.format(totals.boxes)}</strong><span>{totals.loads} cargas identificadas</span></article>
          <article className="metric-card accent-gold"><div className="metric-icon">!</div><p>Por facturar</p><strong>{money.format(totals.uninvoiced)}</strong><span>{salesRows.filter((row) => !row.invoiceNumber).length} partidas sin factura</span></article>
          <article className="metric-card accent-earth"><div className="metric-icon">◎</div><p>Clientes activos</p><strong>{new Set(salesRows.map((row) => row.customer)).size}</strong><span>En el archivo de referencia</span></article>
        </section>

        <section className="sales-panel">
          <div className="panel-heading">
            <div><h2>Registro de ventas</h2><p>Partidas importadas de “VENTAS NORWEST DIC 2025 - 2026”</p></div>
            <span className="record-count">{filtered.length} {filtered.length === 1 ? "partida" : "partidas"}</span>
          </div>
          <div className="filters">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, PO#, PU#, producto o factura" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estatus">
              <option>TODOS</option><option>OK</option><option>SE AJUSTÓ</option><option>PRECIO PENDIENTE</option><option>SIN FACTURA</option>
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Cliente / PO#</th><th>PU# / Bodega</th><th>Producto</th><th className="numeric">Cajas</th><th className="numeric">Precio</th><th className="numeric">Total</th><th>Estatus</th><th>Factura</th><th>Vence</th></tr></thead>
              <tbody>
                {filtered.map((row, index) => {
                  const overdue = daysPastDue(row.dueDate);
                  return <tr key={row.id ?? `${row.sourceRow}-${index}`}>
                    <td className="date-cell">{formatDate(row.saleDate)}</td>
                    <td><strong>{row.customer}</strong><small>PO# {row.purchaseOrder || "N/A"}</small></td>
                    <td><strong>{row.pickupNumber}</strong><small>{row.warehouse}</small></td>
                    <td><strong>{row.product}</strong><small>{[row.size, row.label].filter(Boolean).join(" · ") || "—"}</small></td>
                    <td className="numeric">{number.format(row.boxes)}</td>
                    <td className="numeric">{row.salePrice == null ? <span className="pending-text">Pend.</span> : money.format(row.salePrice)}</td>
                    <td className="numeric strong-number">{row.total == null ? "—" : money.format(row.total)}</td>
                    <td><span className={`status-tag ${row.loadStatus === "OK" ? "ok" : row.loadStatus === "PRECIO PENDIENTE" ? "warning" : "adjusted"}`}>{row.loadStatus}</span></td>
                    <td>{row.invoiceNumber ? <span className="invoice-chip">#{row.invoiceNumber}</span> : <span className="muted">Pendiente</span>}</td>
                    <td><span className={overdue != null && overdue > 0 ? "overdue" : ""}>{formatDate(row.dueDate)}</span>{overdue != null && overdue > 0 && <small>{overdue} días</small>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
        <form className="sale-modal" onSubmit={saveSale} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><p className="eyebrow">Operación USA</p><h2>Nueva venta</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar">×</button></div>
          <div className="form-grid">
            <label>Fecha<input required type="date" value={form.saleDate} onChange={(e) => setForm({...form, saleDate:e.target.value})} /></label>
            <label>Cliente<input required value={form.customer} onChange={(e) => setForm({...form, customer:e.target.value})} placeholder="Nombre del cliente" /></label>
            <label>PO#<input value={form.purchaseOrder} onChange={(e) => setForm({...form, purchaseOrder:e.target.value})} /></label>
            <label>Bodega<input required value={form.warehouse} onChange={(e) => setForm({...form, warehouse:e.target.value})} placeholder="Ej. PROFRESH" /></label>
            <label>PU#<input required value={form.pickupNumber} onChange={(e) => setForm({...form, pickupNumber:e.target.value})} placeholder="NW-012-01" /></label>
            <label>Producto<input required value={form.product} onChange={(e) => setForm({...form, product:e.target.value})} /></label>
            <label>Tamaño<input value={form.size} onChange={(e) => setForm({...form, size:e.target.value})} /></label>
            <label>Etiqueta<input value={form.label} onChange={(e) => setForm({...form, label:e.target.value})} /></label>
            <label>Cajas<input required min="1" type="number" value={form.boxes} onChange={(e) => setForm({...form, boxes:e.target.value})} /></label>
            <label>Precio de venta<input min="0" step="0.01" type="number" value={form.salePrice} onChange={(e) => setForm({...form, salePrice:e.target.value})} /></label>
            <label>Día de embarque<input type="date" value={form.shipDate} onChange={(e) => setForm({...form, shipDate:e.target.value})} /></label>
            <label>Día de pick up<input type="date" value={form.pickupDate} onChange={(e) => setForm({...form, pickupDate:e.target.value})} /></label>
          </div>
          <div className="form-total"><span>Total calculado</span><strong>{form.boxes && form.salePrice ? money.format(Number(form.boxes) * Number(form.salePrice)) : "$0.00"}</strong></div>
          {saveState && <p className="form-message">{saveState}</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" type="submit">Guardar venta</button></div>
        </form>
      </div>}
    </main>
  );
}
