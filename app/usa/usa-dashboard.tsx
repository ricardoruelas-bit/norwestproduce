"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import type { BusinessPartner, ColdStorage, InventoryLot, PartnerType, Product, Sale } from "../../lib/types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const moneyMxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const number = new Intl.NumberFormat("en-US");
const shortDate = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
const documentDate = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC" });
type Operation = "DIRECT_RESALE" | "IMPORTED_INVENTORY";
type Section = "dashboard" | "catalogs" | "inventory" | "invoicing";
type StateOption = { code: string; name: string };

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null) {
  return value ? shortDate.format(new Date(`${value}T00:00:00Z`)) : "—";
}

function formatDocumentDate(value: string | null) {
  return value ? documentDate.format(new Date(`${value}T00:00:00Z`)) : "—";
}

function amountInWords(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Amount pending";
  const ones = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const underThousand = (whole: number) => {
    const parts: string[] = [];
    if (whole >= 100) { parts.push(`${ones[Math.floor(whole / 100)]} Hundred`); whole %= 100; }
    if (whole >= 20) { parts.push(tens[Math.floor(whole / 10)]); if (whole % 10) parts.push(ones[whole % 10]); }
    else if (whole) parts.push(ones[whole]);
    return parts.join(" ");
  };
  const whole = Math.floor(Math.abs(value));
  const cents = Math.round((Math.abs(value) - whole) * 100);
  const parts: string[] = [];
  const millions = Math.floor(whole / 1_000_000);
  const thousands = Math.floor((whole % 1_000_000) / 1_000);
  const remainder = whole % 1_000;
  if (millions) parts.push(`${underThousand(millions)} Million`);
  if (thousands) parts.push(`${underThousand(thousands)} Thousand`);
  if (remainder || !parts.length) parts.push(underThousand(remainder) || "Zero");
  return `${parts.join(" ")} Dollars and ${String(cents).padStart(2, "0")}/100`;
}

function partnerAddress(partner: BusinessPartner | undefined) {
  if (!partner) return ["Address pending"];
  const street = [partner.street, partner.exteriorNumber, partner.interiorNumber && `STE ${partner.interiorNumber}`].filter(Boolean).join(" ");
  const city = [partner.city, partner.stateCode, partner.postalCode].filter(Boolean).join(", ").replace(", ,", ",");
  return [street || "Address pending", city].filter(Boolean);
}

const blankSale = {
  saleDate: localDateKey(), operationType: "DIRECT_RESALE" as Operation, supplier: "", inventoryLotId: "", customer: "", purchaseOrder: "", warehouse: "", pickupNumber: "",
  boxes: "", product: "", presentation: "", size: "", label: "", purchasePrice: "", salePrice: "", shipDate: "", pickupDate: "",
};

const blankPartner = {
  partnerType: "SUPPLIER" as PartnerType, name: "", pacaNumber: "", taxId: "", blueBookNumber: "", dunsNumber: "",
  street: "", exteriorNumber: "", interiorNumber: "", stateCode: "", stateName: "", city: "", postalCode: "",
  contactName: "", contactEmail: "", contactPhone: "",
};

const blankInventory = {
  receivedDate: localDateKey(), supplier: "", warehouse: "", pickupNumber: "", product: "", presentation: "", size: "", label: "", totalBoxes: "",
  boxesPerPallet: "", palletsPerLoad: "", exchangeRate: "",
  purchasePrice: "", freightCost: "", mexicoCustomsCost: "", usCustomsCost: "", overweightCost: "", redLightCost: "", coldStorage: "", coldStorageCost: "",
};

const blankProduct = { name: "", presentation: "", size: "", label: "" };
const blankColdStorage = { name: "", address: "", phone: "" };
type Currency = "USD" | "MXN";
type CostKey = "purchasePrice" | "freightCost" | "mexicoCustomsCost" | "usCustomsCost" | "overweightCost" | "redLightCost" | "coldStorageCost";
const defaultCostCurrencies: Record<CostKey, Currency> = {
  purchasePrice: "USD", freightCost: "USD", mexicoCustomsCost: "MXN", usCustomsCost: "USD", overweightCost: "USD", redLightCost: "USD", coldStorageCost: "USD",
};
type PartnerTarget = "saleSupplier" | "saleCustomer" | "inventorySupplier" | null;

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
  const [section, setSection] = useState<Section>("dashboard");
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<PartnerType>("SUPPLIER");
  const [partnerModal, setPartnerModal] = useState<PartnerType | null>(null);
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);
  const [partnerForm, setPartnerForm] = useState(blankPartner);
  const [partnerSaveState, setPartnerSaveState] = useState("");
  const [alsoOppositeType, setAlsoOppositeType] = useState(false);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [inventoryModal, setInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState(blankInventory);
  const [inventorySaveState, setInventorySaveState] = useState("");
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<Sale | null>(null);
  const [socPreview, setSocPreview] = useState<Sale | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productModal, setProductModal] = useState(false);
  const [productForm, setProductForm] = useState(blankProduct);
  const [productSaveState, setProductSaveState] = useState("");
  const [partnerTarget, setPartnerTarget] = useState<PartnerTarget>(null);
  const [productTarget, setProductTarget] = useState<"sale" | "inventory" | null>(null);
  const [additionalExpenses, setAdditionalExpenses] = useState<Array<{ concept: string; amount: string; currency: Currency }>>([]);
  const [expenseConcepts, setExpenseConcepts] = useState<string[]>([]);
  const [activeExpenseConcept, setActiveExpenseConcept] = useState<number | null>(null);
  const [costCurrencies, setCostCurrencies] = useState<Record<CostKey, Currency>>(defaultCostCurrencies);
  const [, setTotalBoxesManual] = useState(false);
  const [coldStorages, setColdStorages] = useState<ColdStorage[]>([]);
  const [coldStorageModal, setColdStorageModal] = useState(false);
  const [coldStorageForm, setColdStorageForm] = useState(blankColdStorage);
  const [coldStorageSaveState, setColdStorageSaveState] = useState("");

  useEffect(() => {
    fetch("/api/usa/sales").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data.sales)) setSalesRows(data.sales);
    }).catch(() => undefined);
  }, []);

  async function loadPartners() {
    try {
      const response = await fetch("/api/usa/partners");
      const data = await response.json();
      if (Array.isArray(data.partners)) setPartners(data.partners);
    } catch {
      setPartners([]);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch("/api/usa/products");
      const data = await response.json();
      if (Array.isArray(data.products)) setProducts(data.products);
    } catch {
      setProducts([]);
    }
  }

  async function loadColdStorages() {
    try {
      const response = await fetch("/api/usa/cold-storages");
      const data = await response.json();
      if (Array.isArray(data.coldStorages)) setColdStorages(data.coldStorages);
    } catch {
      setColdStorages([]);
    }
  }

  async function loadExpenseConcepts() {
    try {
      const response = await fetch("/api/usa/inventory?all=1");
      const data = await response.json();
      const concepts = (Array.isArray(data.lots) ? data.lots : []).flatMap((lot: InventoryLot) => {
        try {
          const expenses = JSON.parse(lot.additionalExpenses || "[]") as Array<{ concept?: string }>;
          return expenses.map((item) => item.concept?.trim()).filter((item): item is string => Boolean(item));
        } catch {
          return [];
        }
      });
      setExpenseConcepts(Array.from(new Map(concepts.map((item: string) => [item.toLocaleLowerCase(), item])).values()).sort((a, b) => a.localeCompare(b)));
    } catch {
      setExpenseConcepts([]);
    }
  }

  async function loadCaptureCatalogs() {
    await Promise.all([loadPartners(), loadProducts(), loadColdStorages()]);
  }

  async function openCatalogs() {
    setSection("catalogs");
    await loadPartners();
  }

  async function openPartnerForm(type: PartnerType, target: PartnerTarget = null) {
    setPartnerTarget(target);
    setEditingPartnerId(null);
    setPartnerForm({ ...blankPartner, partnerType: type });
    setAlsoOppositeType(false);
    setPartnerSaveState("");
    setCities([]);
    setPartnerModal(type);
    if (!states.length) {
      try {
        const response = await fetch("/api/usa/locations");
        const data = await response.json();
        if (Array.isArray(data.states)) setStates(data.states);
      } catch {
        setStates([]);
      }
    }
  }

  async function editPartner(partner: BusinessPartner) {
    setEditingPartnerId(partner.id);
    setPartnerForm({
      partnerType: partner.partnerType, name: partner.name, pacaNumber: partner.pacaNumber || "", taxId: partner.taxId || "", blueBookNumber: partner.blueBookNumber || "", dunsNumber: partner.dunsNumber || "",
      street: partner.street || "", exteriorNumber: partner.exteriorNumber || "", interiorNumber: partner.interiorNumber || "", stateCode: partner.stateCode, stateName: partner.stateName,
      city: partner.city, postalCode: partner.postalCode, contactName: partner.contactName, contactEmail: partner.contactEmail, contactPhone: partner.contactPhone,
    });
    setPartnerSaveState("");
    setPartnerModal(partner.partnerType);
    try {
      const [statesResponse, citiesResponse] = await Promise.all([
        fetch("/api/usa/locations"),
        fetch(`/api/usa/locations?state=${encodeURIComponent(partner.stateCode)}`),
      ]);
      const statesData = await statesResponse.json();
      const citiesData = await citiesResponse.json();
      if (Array.isArray(statesData.states)) setStates(statesData.states);
      if (Array.isArray(citiesData.cities)) setCities(citiesData.cities);
    } catch {
      setCities([partner.city]);
    }
  }

  async function changePartnerState(code: string) {
    const selected = states.find((state) => state.code === code);
    setPartnerForm((current) => ({ ...current, stateCode: code, stateName: selected?.name ?? "", city: "" }));
    setCities([]);
    if (!code) return;
    setCitiesLoading(true);
    try {
      const response = await fetch(`/api/usa/locations?state=${encodeURIComponent(code)}`);
      const data = await response.json();
      setCities(Array.isArray(data.cities) ? data.cities : []);
    } catch {
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }

  async function savePartner(event: FormEvent) {
    event.preventDefault();
    setPartnerSaveState("Guardando…");
    try {
      const response = await fetch("/api/usa/partners", { method: editingPartnerId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...partnerForm, id: editingPartnerId, alsoOppositeType: !editingPartnerId && alsoOppositeType }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
      setPartners((current) => (editingPartnerId ? current.map((partner) => partner.id === editingPartnerId ? data.partner : partner) : [...current, ...(Array.isArray(data.partners) ? data.partners : [data.partner])]).sort((a, b) => a.name.localeCompare(b.name)));
      if (!editingPartnerId && partnerTarget === "saleSupplier") setForm((current) => ({ ...current, supplier: data.partner.name }));
      if (!editingPartnerId && partnerTarget === "saleCustomer") setForm((current) => ({ ...current, customer: data.partner.name }));
      if (!editingPartnerId && partnerTarget === "inventorySupplier") setInventoryForm((current) => ({ ...current, supplier: data.partner.name }));
      setPartnerTypeFilter(partnerForm.partnerType);
      setPartnerModal(null);
      setPartnerTarget(null);
      setPartnerSaveState("");
    } catch (error) {
      setPartnerSaveState(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

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

  async function openInventorySection() {
    setSection("inventory");
    setInventoryLoading(true);
    try {
      const response = await fetch("/api/usa/inventory?all=1");
      const data = await response.json();
      setInventory(Array.isArray(data.lots) ? data.lots : []);
    } catch {
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  }

  async function saveInventoryEntry(event: FormEvent) {
    event.preventDefault();
    setInventorySaveState("Guardando…");
    try {
      const response = await fetch("/api/usa/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...inventoryForm, additionalExpenses, costCurrencies }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar la entrada.");
      setInventory((current) => [data.lot, ...current]);
      setExpenseConcepts((current) => Array.from(new Map([...current, ...additionalExpenses.map((item) => item.concept.trim()).filter(Boolean)].map((item) => [item.toLocaleLowerCase(), item])).values()).sort((a, b) => a.localeCompare(b)));
      setInventoryModal(false);
      setInventorySaveState("");
    } catch (error) {
      setInventorySaveState(error instanceof Error ? error.message : "No se pudo registrar la entrada.");
    }
  }

  function openInventoryEntry() {
    setInventoryForm({ ...blankInventory, receivedDate: localDateKey() });
    setAdditionalExpenses([]);
    setCostCurrencies(defaultCostCurrencies);
    setTotalBoxesManual(false);
    setActiveExpenseConcept(null);
    setInventorySaveState("");
    setInventoryModal(true);
    void Promise.all([loadCaptureCatalogs(), loadExpenseConcepts()]);
  }

  function openColdStorageForm() {
    setColdStorageForm(blankColdStorage);
    setColdStorageSaveState("");
    setColdStorageModal(true);
  }

  async function saveColdStorage(event: FormEvent) {
    event.preventDefault();
    setColdStorageSaveState("Guardando…");
    try {
      const response = await fetch("/api/usa/cold-storages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(coldStorageForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el cold storage.");
      setColdStorages((current) => [...current, data.coldStorage].sort((a, b) => a.name.localeCompare(b.name)));
      setInventoryForm((current) => ({ ...current, coldStorage: data.coldStorage.name, warehouse: data.coldStorage.name }));
      setColdStorageModal(false);
      setColdStorageSaveState("");
    } catch (error) {
      setColdStorageSaveState(error instanceof Error ? error.message : "No se pudo guardar el cold storage.");
    }
  }

  function chooseColdStorage(value: string) {
    if (value === "__new__") return openColdStorageForm();
    const selected = coldStorages.find((item) => String(item.id) === value);
    setInventoryForm((current) => ({ ...current, coldStorage: selected?.name || "", warehouse: selected?.name || "" }));
  }

  function updatePalletCalculation(field: "boxesPerPallet" | "palletsPerLoad", value: string) {
    setTotalBoxesManual(false);
    setInventoryForm((current) => {
      const next = { ...current, [field]: value };
      const calculated = (Number(next.boxesPerPallet) || 0) * (Number(next.palletsPerLoad) || 0);
      next.totalBoxes = calculated ? String(calculated) : "";
      return next;
    });
  }

  function moveToNextField(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement) || target.type === "submit") return;
    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("input:not([disabled]):not([readonly]), select:not([disabled])"));
    const index = fields.indexOf(target);
    if (index >= 0 && index < fields.length - 1) {
      event.preventDefault();
      fields[index + 1].focus();
    }
  }

  async function updatePickupDate(row: Sale, pickupDate: string) {
    if (!row.id) return;
    const response = await fetch("/api/usa/sales", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, pickupDate }) });
    const data = await response.json();
    if (response.ok && data.sale) setSalesRows((current) => current.map((sale) => sale.id === row.id ? data.sale : sale));
  }

  function openInvoicing(sale?: Sale) {
    setInvoiceSale(sale ?? null);
    setSection("invoicing");
  }

  function openInvoicePreview(sale: Sale) {
    setInvoicePreview(sale);
    void Promise.all([loadPartners(), loadColdStorages()]);
  }

  function openSocPreview(sale: Sale) {
    setSocPreview(sale);
    void Promise.all([loadPartners(), loadColdStorages()]);
  }

  function openNewSale() {
    setForm({ ...blankSale, saleDate: localDateKey() });
    setSaveState("");
    setModalStep("choose");
    void loadCaptureCatalogs();
  }

  function openProductForm(target: "sale" | "inventory") {
    setProductTarget(target);
    setProductForm(blankProduct);
    setProductSaveState("");
    setProductModal(true);
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setProductSaveState("Guardando…");
    try {
      const response = await fetch("/api/usa/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el producto.");
      setProducts((current) => [...current, data.product].sort((a, b) => a.name.localeCompare(b.name)));
      if (productTarget === "sale") setForm((current) => ({ ...current, product: data.product.name, presentation: data.product.presentation || "", size: data.product.size || "", label: data.product.label || "" }));
      if (productTarget === "inventory") setInventoryForm((current) => ({ ...current, product: data.product.name, presentation: data.product.presentation || "", size: data.product.size || "", label: data.product.label || "" }));
      setProductModal(false);
      setProductTarget(null);
      setProductSaveState("");
    } catch (error) {
      setProductSaveState(error instanceof Error ? error.message : "No se pudo guardar el producto.");
    }
  }

  function chooseProduct(value: string, target: "sale" | "inventory") {
    if (value === "__new__") return openProductForm(target);
    const product = products.find((item) => String(item.id) === value);
    if (!product) return;
    if (target === "sale") setForm((current) => ({ ...current, product: product.name, presentation: product.presentation || "", size: product.size || "", label: product.label || "" }));
    else setInventoryForm((current) => ({ ...current, product: product.name, presentation: product.presentation || "", size: product.size || "", label: product.label || "" }));
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

  function pickupTiming(value: string | null) {
    if (!value) return "";
    const today = localDateKey();
    if (value === today) return "pickup-today";
    if (value < today) return "pickup-past";
    return "";
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
  const selectedColdStorage = coldStorages.find((item) => item.name === inventoryForm.coldStorage);
  const documentSale = invoicePreview || socPreview;
  const documentCustomer = partners.find((item) => item.partnerType === "CUSTOMER" && item.name === documentSale?.customer);
  const documentWarehouse = coldStorages.find((item) => item.name === documentSale?.warehouse);
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

  const inventoryCostSummary = useMemo(() => {
    const boxes = Number(inventoryForm.totalBoxes) || 0;
    const rate = Number(inventoryForm.exchangeRate) || 0;
    const usd = (value: string, currency: Currency) => currency === "MXN" ? (rate ? (Number(value) || 0) / rate : 0) : Number(value) || 0;
    const purchase = usd(inventoryForm.purchasePrice, costCurrencies.purchasePrice) * boxes;
    const fixed = (["freightCost", "mexicoCustomsCost", "usCustomsCost", "overweightCost", "redLightCost", "coldStorageCost"] as CostKey[])
      .reduce((sum, key) => sum + usd(inventoryForm[key], costCurrencies[key]), 0);
    const extras = additionalExpenses.reduce((sum, item) => sum + usd(item.amount, item.currency), 0);
    const totalUsd = purchase + fixed + extras;
    const totalMxn = rate ? totalUsd * rate : 0;
    return { totalUsd, totalMxn, unitUsd: boxes ? totalUsd / boxes : 0, unitMxn: boxes ? totalMxn / boxes : 0 };
  }, [inventoryForm, additionalExpenses, costCurrencies]);

  async function saveSale(event: FormEvent) {
    event.preventDefault();
    setSaveState("Guardando…");
    const payload = {
      saleDate: form.saleDate, operationType: form.operationType, supplier: form.supplier, inventoryLotId: form.inventoryLotId ? Number(form.inventoryLotId) : null,
      customer: form.customer, purchaseOrder: form.purchaseOrder, warehouse: form.warehouse, pickupNumber: form.pickupNumber,
      boxes: Number(form.boxes), product: form.product, presentation: form.presentation, size: form.size, label: form.label,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null, salePrice: form.salePrice ? Number(form.salePrice) : null,
      shipDate: null, pickupDate: form.pickupDate || null,
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

  function costInput(label: string, key: CostKey) {
    return <label>{label}<span className="money-entry"><input min="0" step="0.01" type="number" value={inventoryForm[key]} onChange={(e) => setInventoryForm({ ...inventoryForm, [key]: e.target.value })} /><select aria-label={`Moneda de ${label}`} value={costCurrencies[key]} onChange={(e) => setCostCurrencies({ ...costCurrencies, [key]: e.target.value as Currency })}><option value="USD">USD</option><option value="MXN">MXN</option></select></span></label>;
  }

  return (
    <main className="erp-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="mini-mark"><span /><span /></div><div><strong>NORWEST</strong><small>PRODUCE LLC</small></div></div>
        <nav>
          <button className={`nav-item ${section === "dashboard" ? "active" : ""}`} onClick={() => setSection("dashboard")}><span>▦</span> Resumen</button>
          <button className={`nav-item ${section === "inventory" ? "active" : ""}`} onClick={() => void openInventorySection()}><span>▤</span> Inventario importado</button>
          <button className={`nav-item ${section === "invoicing" ? "active" : ""}`} onClick={() => openInvoicing()}><span>□</span> Facturación</button><a className="nav-item"><span>◎</span> Cartera</a><button className={`nav-item ${section === "catalogs" ? "active" : ""}`} onClick={() => void openCatalogs()}><span>◇</span> Catálogos</button><a className="nav-item"><span>⌁</span> Reportes</a>
        </nav>
        <div className="sidebar-bottom"><div className="operation-pill"><span>USA</span><div><strong>Norwest Produce LLC</strong><small>Operación activa</small></div></div><Link href="/">⇄ Cambiar empresa</Link></div>
      </aside>

      {section === "dashboard" && <section className="erp-content">
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
          <div className="table-wrap"><table className="sales-table"><thead><tr><th>Fecha</th><th>Operación</th><th>Cliente / PO#</th><th>Pickup #</th><th>Bodega</th><th>Día de pickup</th><th>Producto</th><th className="numeric">Cajas</th><th className="numeric">Precio</th><th className="numeric">Total</th><th>Estatus</th><th>Factura</th></tr></thead>
            <tbody>{filtered.map((row, index) => { return <tr className={pickupTiming(row.pickupDate)} key={row.id ?? `${row.sourceRow}-${index}`}>
              <td className="date-cell">{formatDate(row.saleDate)}</td><td><span className={`operation-tag ${row.operationType === "IMPORTED_INVENTORY" ? "inventory" : "resale"}`}>{row.operationType === "IMPORTED_INVENTORY" ? "Inventario" : "Reventa"}</span></td>
              <td><strong>{row.customer}</strong><small>PO# {row.purchaseOrder || "N/A"}</small></td><td><button type="button" className="pickup-number-button" onClick={() => openSocPreview(row)}>{row.pickupNumber}</button></td><td>{row.warehouse}</td><td className="date-cell"><input className="pickup-date-input" aria-label={`Cambiar día de pickup de ${row.customer}`} type="date" value={row.pickupDate || ""} onChange={(e) => void updatePickupDate(row, e.target.value)} />{pickupTiming(row.pickupDate) === "pickup-today" && <small>Pickup hoy</small>}{pickupTiming(row.pickupDate) === "pickup-past" && <small>Fecha pasada</small>}</td>
              <td><strong>{row.product}</strong><small>{[row.presentation, row.size, row.label].filter(Boolean).join(" · ") || "—"}</small></td><td className="numeric">{number.format(row.boxes)}</td>
              <td className="numeric">{row.salePrice == null ? <span className="pending-text">Pend.</span> : money.format(row.salePrice)}</td><td className="numeric strong-number">{row.total == null ? "—" : money.format(row.total)}</td>
              <td><span className={`status-tag ${row.loadStatus === "OK" ? "ok" : row.loadStatus === "PRECIO PENDIENTE" ? "warning" : "adjusted"}`}>{row.loadStatus}</span></td><td>{row.invoiceNumber ? <button type="button" className="invoice-number-button" onClick={() => openInvoicePreview(row)}><span className="invoice-chip invoice-ok">OK</span><small>{row.invoiceNumber}</small></button> : <button type="button" className="invoice-button" onClick={() => openInvoicing(row)}>Facturar</button>}</td>
            </tr>; })}</tbody></table></div>
        </section>
      </section>}

      {section === "catalogs" && <section className="erp-content">
        <header className="topbar"><div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Clientes y proveedores</h1></div></header>
        <section className="catalog-summary">
          <button className={`catalog-type-card ${partnerTypeFilter === "SUPPLIER" ? "active" : ""}`} onClick={() => setPartnerTypeFilter("SUPPLIER")}><span className="catalog-icon">⇄</span><div><strong>Proveedores</strong><small>{partners.filter((partner) => partner.partnerType === "SUPPLIER").length} registrados</small></div></button>
          <button className={`catalog-type-card ${partnerTypeFilter === "CUSTOMER" ? "active" : ""}`} onClick={() => setPartnerTypeFilter("CUSTOMER")}><span className="catalog-icon customer">◎</span><div><strong>Clientes</strong><small>{partners.filter((partner) => partner.partnerType === "CUSTOMER").length} registrados</small></div></button>
        </section>
        <section className="sales-panel catalog-panel">
          <div className="panel-heading"><div><h2>{partnerTypeFilter === "SUPPLIER" ? "Proveedores" : "Clientes"}</h2><p>Catálogo exclusivo de la operación USA</p></div><button className="primary-button" onClick={() => void openPartnerForm(partnerTypeFilter)}>＋ Alta de {partnerTypeFilter === "SUPPLIER" ? "proveedor" : "cliente"}</button></div>
          <div className="table-wrap catalog-table"><table><thead><tr><th>Nombre</th><th>PACA #</th><th>TAX ID #</th><th>Blue Book #</th><th>DUNS & Bradstreet #</th><th>Dirección</th><th>{partnerTypeFilter === "SUPPLIER" ? "Contacto para pagos" : "Contacto para cobros"}</th><th></th></tr></thead>
            <tbody>{partners.filter((partner) => partner.partnerType === partnerTypeFilter).map((partner) => <tr key={partner.id}><td><strong>{partner.name}</strong></td><td>{partner.pacaNumber || "Pendiente"}</td><td>{partner.taxId || "Pendiente"}</td><td>{partner.blueBookNumber || "Pendiente"}</td><td>{partner.dunsNumber || "Pendiente"}</td><td><strong>{[partner.street, partner.exteriorNumber && `#${partner.exteriorNumber}`, partner.interiorNumber && `Int. ${partner.interiorNumber}`].filter(Boolean).join(" ") || "Pendiente"}</strong><small>{partner.city}, {partner.stateCode} {partner.postalCode}</small></td><td><strong>{partner.contactName}</strong><small>{partner.contactEmail} · {partner.contactPhone}</small></td><td><button type="button" className="edit-button" onClick={() => void editPartner(partner)}>Editar</button></td></tr>)}</tbody></table></div>
          {partners.filter((partner) => partner.partnerType === partnerTypeFilter).length === 0 && <div className="catalog-empty"><strong>Aún no hay {partnerTypeFilter === "SUPPLIER" ? "proveedores" : "clientes"} registrados</strong><span>Usa el botón de alta para crear el primer registro.</span></div>}
        </section>
      </section>}

      {section === "inventory" && <section className="erp-content">
        <header className="topbar"><div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Inventario importado</h1></div><button className="primary-button" onClick={openInventoryEntry}>＋ Registrar entrada</button></header>
        <section className="sales-panel catalog-panel"><div className="panel-heading"><div><h2>Existencias por partida</h2><p>Aquí se da de alta el producto importado que entra a inventario.</p></div><span className="record-count">{inventory.length} partidas</span></div>
          {inventoryLoading ? <div className="catalog-empty">Consultando inventario…</div> : <div className="table-wrap catalog-table"><table><thead><tr><th>Fecha de entrada</th><th>Producto</th><th>Proveedor</th><th>Pickup #</th><th>Cold storage</th><th className="numeric">Cajas/pallet</th><th className="numeric">Pallets</th><th className="numeric">Bultos/cajas</th><th className="numeric">Disponibles</th><th className="numeric">Costo total de importación</th><th className="numeric">Costo real por caja</th></tr></thead><tbody>{inventory.map((lot) => <tr key={lot.id}><td>{formatDate(lot.receivedDate)}</td><td><strong>{lot.product}</strong><small>{[lot.presentation, lot.size, lot.label].filter(Boolean).join(" · ") || "—"}</small></td><td>{lot.supplier || "—"}</td><td>{lot.pickupNumber || "—"}</td><td>{lot.coldStorage || lot.warehouse}</td><td className="numeric">{lot.boxesPerPallet == null ? "—" : number.format(lot.boxesPerPallet)}</td><td className="numeric">{lot.palletsPerLoad == null ? "—" : number.format(lot.palletsPerLoad)}</td><td className="numeric">{number.format(lot.totalBoxes)}</td><td className="numeric strong-number">{number.format(lot.availableBoxes)}</td><td className="numeric dual-currency-cell">{lot.totalImportCost == null ? "—" : <><strong>{money.format(lot.totalImportCost)} USD</strong><small>{lot.exchangeRate ? `${moneyMxn.format(lot.totalImportCost * lot.exchangeRate)} MXN` : "MXN pendiente"}</small></>}</td><td className="numeric dual-currency-cell">{lot.unitCost == null ? "—" : <><strong>{money.format(lot.unitCost)} USD</strong><small>{lot.exchangeRate ? `${moneyMxn.format(lot.unitCost * lot.exchangeRate)} MXN` : "MXN pendiente"}</small></>}</td></tr>)}</tbody></table></div>}
          {!inventoryLoading && inventory.length === 0 && <div className="catalog-empty"><strong>Aún no hay entradas de inventario</strong><span>Usa “Registrar entrada” para dar de alta el primer producto importado.</span></div>}
        </section>
      </section>}

      {section === "invoicing" && <section className="erp-content">
        <header className="topbar"><div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Facturación</h1></div></header>
        {invoiceSale && <section className="invoice-focus"><div><span>Venta seleccionada</span><h2>{invoiceSale.customer}</h2><p>Pickup #{invoiceSale.pickupNumber} · {number.format(invoiceSale.boxes)} cajas · {invoiceSale.total == null ? "Total pendiente" : money.format(invoiceSale.total)}</p></div><button type="button" className="secondary-button" onClick={() => setSection("dashboard")}>Volver a ventas</button></section>}
        <section className="sales-panel catalog-panel"><div className="panel-heading"><div><h2>Ventas pendientes de facturar</h2><p>Selecciona una venta desde el registro para preparar su factura.</p></div><span className="record-count">{salesRows.filter((row) => !row.invoiceNumber).length} pendientes</span></div>
          <div className="table-wrap catalog-table"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Pickup #</th><th>Bodega</th><th>Producto</th><th className="numeric">Total</th><th></th></tr></thead><tbody>{salesRows.filter((row) => !row.invoiceNumber).map((row, index) => <tr className={invoiceSale?.id === row.id ? "selected-invoice-row" : ""} key={row.id ?? index}><td>{formatDate(row.saleDate)}</td><td><strong>{row.customer}</strong><small>PO# {row.purchaseOrder || "N/A"}</small></td><td>{row.pickupNumber}</td><td>{row.warehouse}</td><td>{row.product}</td><td className="numeric strong-number">{row.total == null ? "—" : money.format(row.total)}</td><td><button type="button" className="invoice-button" onClick={() => setInvoiceSale(row)}>Preparar factura</button></td></tr>)}</tbody></table></div>
        </section>
      </section>}

      {partnerModal && <div className={`modal-backdrop ${partnerTarget ? "modal-backdrop-elevated" : ""}`}><form className="sale-modal partner-modal" onSubmit={savePartner}>
        <div className="modal-heading"><div><p className="eyebrow">Catálogo USA</p><h2>{editingPartnerId ? "Editar" : "Alta de"} {partnerModal === "SUPPLIER" ? "proveedor" : "cliente"}</h2><p className="modal-intro">Los campos marcados con * son obligatorios. Los demás pueden agregarse o modificarse después.</p></div></div>
        {!editingPartnerId && <label className="dual-role-check"><input type="checkbox" checked={alsoOppositeType} onChange={(e) => setAlsoOppositeType(e.target.checked)} /><span><strong>{partnerModal === "SUPPLIER" ? "También es cliente" : "También es proveedor"}</strong><small>Al guardar, la empresa se agregará automáticamente en ambos catálogos.</small></span></label>}
        <section className="form-section partner-section"><div className="form-section-heading"><span>1</span><div><h3>Información fiscal y comercial</h3></div></div><div className="form-grid partner-grid">
          <label className="span-2">Nombre *<input required value={partnerForm.name} onChange={(e) => setPartnerForm({...partnerForm, name:e.target.value})} /></label><label>PACA #<input value={partnerForm.pacaNumber} onChange={(e) => setPartnerForm({...partnerForm, pacaNumber:e.target.value})} /></label><label>TAX ID #<input value={partnerForm.taxId} onChange={(e) => setPartnerForm({...partnerForm, taxId:e.target.value})} /></label><label>BLUE BOOK #<input value={partnerForm.blueBookNumber} onChange={(e) => setPartnerForm({...partnerForm, blueBookNumber:e.target.value})} /></label><label>DUNS and BRADSTREET #<input value={partnerForm.dunsNumber} onChange={(e) => setPartnerForm({...partnerForm, dunsNumber:e.target.value})} /></label>
        </div></section>
        <section className="form-section address-section"><div className="form-section-heading"><span>2</span><div><h3>Dirección</h3><p>Selecciona primero el estado para habilitar sus ciudades.</p></div></div><div className="form-grid partner-grid">
          <label>Estado *<select required value={partnerForm.stateCode} onChange={(e) => void changePartnerState(e.target.value)}><option value="">Selecciona un estado</option>{states.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}</select></label><label>Ciudad *<select required disabled={!partnerForm.stateCode || citiesLoading} value={partnerForm.city} onChange={(e) => setPartnerForm({...partnerForm, city:e.target.value})}><option value="">{citiesLoading ? "Cargando ciudades…" : partnerForm.stateCode ? "Selecciona una ciudad" : "Selecciona primero el estado"}</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label><label>Calle<input value={partnerForm.street} onChange={(e) => setPartnerForm({...partnerForm, street:e.target.value})} /></label><label>Número exterior<input value={partnerForm.exteriorNumber} onChange={(e) => setPartnerForm({...partnerForm, exteriorNumber:e.target.value})} /></label><label>Número interior<input value={partnerForm.interiorNumber} onChange={(e) => setPartnerForm({...partnerForm, interiorNumber:e.target.value})} /></label><label>P.O. / ZIP Code *<input required value={partnerForm.postalCode} onChange={(e) => setPartnerForm({...partnerForm, postalCode:e.target.value})} /></label>
        </div></section>
        <section className="form-section contact-section"><div className="form-section-heading"><span>3</span><div><h3>Contacto para {partnerModal === "SUPPLIER" ? "pagos" : "cobros"}</h3></div></div><div className="form-grid partner-grid">
          <label>Nombre de contacto para {partnerModal === "SUPPLIER" ? "pagos" : "cobros"} *<input required value={partnerForm.contactName} onChange={(e) => setPartnerForm({...partnerForm, contactName:e.target.value})} /></label><label>Correo para {partnerModal === "SUPPLIER" ? "pagos" : "cobros"} *<input required type="email" value={partnerForm.contactEmail} onChange={(e) => setPartnerForm({...partnerForm, contactEmail:e.target.value})} /></label><label>Teléfono para {partnerModal === "SUPPLIER" ? "pagos" : "cobros"} *<input required type="tel" inputMode="numeric" maxLength={10} minLength={10} pattern="[0-9]{10}" title="Ingresa exactamente 10 dígitos" placeholder="10 dígitos" value={partnerForm.contactPhone} onChange={(e) => setPartnerForm({...partnerForm, contactPhone:e.target.value.replace(/\D/g, "").slice(0, 10)})} /></label>
        </div></section>
        {partnerSaveState && <p className="form-message">{partnerSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setPartnerModal(null); setPartnerTarget(null); }}>Cancelar</button><button type="submit" className="primary-button">{editingPartnerId ? "Guardar cambios" : `Registrar ${partnerModal === "SUPPLIER" ? "proveedor" : "cliente"}`}</button></div>
      </form></div>}

      {modalStep !== "closed" && <div className="modal-backdrop">
        {modalStep === "choose" ? <section className="sale-modal operation-modal">
          <div className="modal-heading"><div><p className="eyebrow">Nueva venta</p><h2>¿Qué tipo de venta es?</h2><p className="modal-intro">Selecciona el origen del producto para abrir la captura correspondiente.</p></div></div>
          <div className="operation-choice-grid">
            <button type="button" className="operation-choice resale-choice" onClick={() => chooseOperation("DIRECT_RESALE")}><span className="choice-icon">⇄</span><strong>Compra y reventa</strong><small>Registra primero a quién se compró y después a quién se vendió.</small><i>Continuar →</i></button>
            <button type="button" className="operation-choice inventory-choice" onClick={() => chooseOperation("IMPORTED_INVENTORY")}><span className="choice-icon">▦</span><strong>Venta de inventario importado</strong><small>Elige una partida disponible del inventario en USA.</small><i>Ver inventario →</i></button>
          </div><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button></div>
        </section> : <form className="sale-modal sale-modal-wide" onSubmit={saveSale}>
          <div className="modal-heading"><div><button type="button" className="back-link" onClick={() => setModalStep("choose")}>← Cambiar tipo</button><p className="eyebrow">{form.operationType === "DIRECT_RESALE" ? "Compra y reventa" : "Inventario importado"}</p><h2>Nueva venta</h2></div></div>

          {form.operationType === "DIRECT_RESALE" ? <>
            <section className="form-section purchase-section"><div className="form-section-heading"><span>1</span><div><h3>Información de la compra</h3><p>Datos del proveedor y del producto adquirido.</p></div></div>
              <div className="form-grid"><label>Proveedor / a quién se compró<select required value={form.supplier} onChange={(e) => e.target.value === "__new__" ? void openPartnerForm("SUPPLIER", "saleSupplier") : setForm({...form, supplier:e.target.value})}><option value="">Selecciona un proveedor</option>{partners.filter((partner) => partner.partnerType === "SUPPLIER").map((partner) => <option key={partner.id} value={partner.name}>{partner.name}</option>)}<option value="__new__">＋ Agregar nuevo proveedor</option></select></label><label>PU# de compra<input required value={form.pickupNumber} onChange={(e) => setForm({...form, pickupNumber:e.target.value})} placeholder="Número de pickup" /></label><label>Producto<select required value={products.find((item) => item.name === form.product && (item.presentation || "") === form.presentation && (item.size || "") === form.size)?.id || ""} onChange={(e) => chooseProduct(e.target.value, "sale")}><option value="">Selecciona un producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}<option value="__new__">＋ Agregar nuevo producto</option></select></label><label>Presentación<input value={form.presentation} readOnly /></label><label>Tamaño<input value={form.size} readOnly /></label><label>Etiqueta<input value={form.label} readOnly /></label><label>Precio de compra<input required min="0" step="0.01" type="number" value={form.purchasePrice} onChange={(e) => setForm({...form, purchasePrice:e.target.value})} /></label></div>
            </section>
          </> : <section className="form-section inventory-section"><div className="form-section-heading"><span>1</span><div><h3>Selecciona del inventario</h3><p>Solo aparecen partidas con cajas disponibles.</p></div></div>
            {inventoryLoading ? <div className="inventory-empty">Consultando inventario…</div> : inventory.length === 0 ? <div className="inventory-empty"><strong>No hay inventario importado disponible</strong><span>Cuando se registren entradas de importación, aparecerán aquí para poder venderlas.</span></div> : <div className="inventory-list">{inventory.map((lot) => <button key={lot.id} type="button" className={`inventory-row ${form.inventoryLotId === String(lot.id) ? "selected" : ""}`} onClick={() => selectInventoryLot(lot)}><span className="inventory-radio"/><span><strong>{lot.product}</strong><small>{[lot.presentation, lot.size, lot.label].filter(Boolean).join(" · ") || "Sin detalle"}</small></span><span><strong>{lot.warehouse}</strong><small>Recibido {formatDate(lot.receivedDate)}</small></span><span className="inventory-boxes"><strong>{number.format(lot.availableBoxes)}</strong><small>cajas disponibles</small></span></button>)}</div>}
          </section>}

          {(form.operationType === "DIRECT_RESALE" || selectedLot) && <section className="form-section sale-section"><div className="form-section-heading"><span>2</span><div><h3>Información de la venta</h3><p>Datos del cliente, entrega y precio de venta.</p></div></div>
            <div className="form-grid"><label>Fecha de venta<input required type="date" value={form.saleDate} onChange={(e) => setForm({...form, saleDate:e.target.value})} /></label><label>Cliente / a quién se vendió<select required value={form.customer} onChange={(e) => e.target.value === "__new__" ? void openPartnerForm("CUSTOMER", "saleCustomer") : setForm({...form, customer:e.target.value})}><option value="">Selecciona un cliente</option>{partners.filter((partner) => partner.partnerType === "CUSTOMER").map((partner) => <option key={partner.id} value={partner.name}>{partner.name}</option>)}<option value="__new__">＋ Agregar nuevo cliente</option></select></label><label>PO# del cliente<input value={form.purchaseOrder} onChange={(e) => setForm({...form, purchaseOrder:e.target.value})} /></label><label>Bodega / destino<input required value={form.warehouse} onChange={(e) => setForm({...form, warehouse:e.target.value})} placeholder="Ej. PROFRESH" /></label><label>Cajas<input required min="1" max={selectedLot?.availableBoxes} type="number" value={form.boxes} onChange={(e) => setForm({...form, boxes:e.target.value})} /></label><label>Precio de venta<input required min="0" step="0.01" type="number" value={form.salePrice} onChange={(e) => setForm({...form, salePrice:e.target.value})} /></label><label>Día de pickup<input type="date" value={form.pickupDate} onChange={(e) => setForm({...form, pickupDate:e.target.value})} /></label></div>
          </section>}
          <div className="form-total"><span>Total calculado</span><strong>{form.boxes && form.salePrice ? money.format(Number(form.boxes) * Number(form.salePrice)) : "$0.00"}</strong></div>
          {saveState && <p className="form-message">{saveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button><button className="primary-button" type="submit" disabled={form.operationType === "IMPORTED_INVENTORY" && !selectedLot}>Guardar venta</button></div>
        </form>}
      </div>}

      {inventoryModal && <div className="modal-backdrop"><form className="sale-modal sale-modal-wide" onSubmit={saveInventoryEntry} onKeyDown={moveToNextField}>
        <div className="modal-heading"><div><p className="eyebrow">Inventario importado</p><h2>Registrar entrada</h2><p className="modal-intro">Esta partida quedará disponible para seleccionarla al registrar una venta de inventario.</p></div></div>
        <section className="form-section inventory-section"><div className="form-section-heading"><span>1</span><div><h3>Datos de la importación</h3></div></div><div className="form-grid">
          <label>Fecha de entrada *<input required type="date" value={inventoryForm.receivedDate} onChange={(e) => setInventoryForm({...inventoryForm, receivedDate:e.target.value})} /></label><label>Proveedor<select value={inventoryForm.supplier} onChange={(e) => e.target.value === "__new__" ? void openPartnerForm("SUPPLIER", "inventorySupplier") : setInventoryForm({...inventoryForm, supplier:e.target.value})}><option value="">Selecciona un proveedor</option>{partners.filter((partner) => partner.partnerType === "SUPPLIER").map((partner) => <option key={partner.id} value={partner.name}>{partner.name}</option>)}<option value="__new__">＋ Agregar nuevo proveedor</option></select></label><label>Pickup #<input value={inventoryForm.pickupNumber} onChange={(e) => setInventoryForm({...inventoryForm, pickupNumber:e.target.value})} /></label><label>Producto *<select required value={products.find((item) => item.name === inventoryForm.product && (item.presentation || "") === inventoryForm.presentation && (item.size || "") === inventoryForm.size)?.id || ""} onChange={(e) => chooseProduct(e.target.value, "inventory")}><option value="">Selecciona un producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}<option value="__new__">＋ Agregar nuevo producto</option></select></label><label>Presentación<input value={inventoryForm.presentation} readOnly /></label><label>Tamaño<input value={inventoryForm.size} readOnly /></label><label>Etiqueta<input value={inventoryForm.label} readOnly /></label><label>Cajas por pallet<input name="boxesPerPallet" min="1" step="1" type="number" value={inventoryForm.boxesPerPallet} onChange={(e) => updatePalletCalculation("boxesPerPallet", e.target.value)} /></label><label>Pallets por carga<input name="palletsPerLoad" min="1" step="1" type="number" value={inventoryForm.palletsPerLoad} onChange={(e) => updatePalletCalculation("palletsPerLoad", e.target.value)} /></label><label>Total de bultos o cajas *<input name="totalBoxes" required min="1" step="1" type="number" value={inventoryForm.totalBoxes} onChange={(e) => { setTotalBoxesManual(true); setInventoryForm({...inventoryForm, totalBoxes:e.target.value}); }} /><small className="field-help">Se calcula automáticamente, pero puedes ajustarlo por pallets incompletos.</small></label>
        </div></section>
        <section className="form-section cost-section"><div className="form-section-heading"><span>2</span><div><h3>Costos y gastos de importación</h3><p>El precio de compra es por bulto. Los demás importes son totales de la carga y se distribuyen entre todos los bultos o cajas.</p></div></div><div className="exchange-rate-row"><label>Tipo de cambio de esta transacción <span>1 USD =</span><input required min="0.0001" step="0.0001" type="number" value={inventoryForm.exchangeRate} onChange={(e) => setInventoryForm({...inventoryForm, exchangeRate:e.target.value})} /><b>MXN</b></label></div><div className="form-grid cost-grid">
          {costInput("Precio de compra por bulto", "purchasePrice")}{costInput("Flete total", "freightCost")}{costInput("Aduana MX total", "mexicoCustomsCost")}{costInput("Aduana US total", "usCustomsCost")}{costInput("Sobrepeso total", "overweightCost")}{costInput("Semáforo rojo total", "redLightCost")}<label>Cold storage de destino *<select required value={selectedColdStorage?.id || ""} onChange={(e) => chooseColdStorage(e.target.value)}><option value="">Selecciona un cold storage</option>{coldStorages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="__new__">＋ Agregar nuevo cold storage</option></select>{selectedColdStorage && <small className="field-help">{selectedColdStorage.address} · {selectedColdStorage.phone}</small>}</label>{costInput("Costo total de cold storage", "coldStorageCost")}
        </div><div className="extra-expenses"><div className="extra-heading"><strong>Otros costos o gastos totales</strong><button type="button" className="add-expense-button" onClick={() => setAdditionalExpenses((current) => [...current, { concept: "", amount: "", currency: "USD" }])}>＋ Agregar gasto</button></div>{additionalExpenses.map((expense, index) => <div className="expense-row" key={index}><div className="expense-concept-field"><input aria-label="Concepto del gasto" placeholder="Concepto" autoComplete="off" value={expense.concept} onFocus={() => setActiveExpenseConcept(index)} onBlur={() => window.setTimeout(() => setActiveExpenseConcept((current) => current === index ? null : current), 120)} onChange={(e) => setAdditionalExpenses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, concept: e.target.value } : item))} />{activeExpenseConcept === index && expenseConcepts.length > 0 && <div className="expense-concept-menu">{expenseConcepts.filter((concept) => concept.toLocaleLowerCase().includes(expense.concept.toLocaleLowerCase())).map((concept) => <button type="button" key={concept} onMouseDown={(event) => event.preventDefault()} onClick={() => { setAdditionalExpenses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, concept } : item)); setActiveExpenseConcept(null); }}>{concept}</button>)}</div>}</div><input aria-label="Importe total del gasto" placeholder="Importe total" min="0" step="0.01" type="number" value={expense.amount} onChange={(e) => setAdditionalExpenses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: e.target.value } : item))} /><select aria-label="Moneda del gasto" value={expense.currency} onChange={(e) => setAdditionalExpenses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, currency: e.target.value as Currency } : item))}><option value="USD">USD</option><option value="MXN">MXN</option></select><button type="button" aria-label="Eliminar gasto" onClick={() => setAdditionalExpenses((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div>
        <div className="import-cost-summary"><span><small>Costo total de importación</small><strong>{money.format(inventoryCostSummary.totalUsd)} USD</strong><b>{moneyMxn.format(inventoryCostSummary.totalMxn)} MXN</b></span><span><small>Costo real por caja</small><strong>{money.format(inventoryCostSummary.unitUsd)} USD</strong><b>{moneyMxn.format(inventoryCostSummary.unitMxn)} MXN</b></span></div></section>
        {inventorySaveState && <p className="form-message">{inventorySaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setInventoryModal(false)}>Cancelar</button><button type="submit" className="primary-button">Registrar entrada</button></div>
      </form></div>}

      {coldStorageModal && <div className="modal-backdrop modal-backdrop-elevated"><form className="sale-modal product-modal" onSubmit={saveColdStorage}>
        <div className="modal-heading"><div><p className="eyebrow">Catálogo USA</p><h2>Agregar cold storage</h2><p className="modal-intro">Al guardarlo regresarás a la entrada con este destino seleccionado.</p></div></div>
        <section className="form-section"><div className="form-grid"><label>Nombre del cold storage *<input required value={coldStorageForm.name} onChange={(e) => setColdStorageForm({...coldStorageForm, name:e.target.value})} /></label><label className="span-2">Dirección *<input required value={coldStorageForm.address} onChange={(e) => setColdStorageForm({...coldStorageForm, address:e.target.value})} /></label><label>Teléfono *<input required type="tel" inputMode="numeric" minLength={10} maxLength={10} pattern="[0-9]{10}" placeholder="10 dígitos" value={coldStorageForm.phone} onChange={(e) => setColdStorageForm({...coldStorageForm, phone:e.target.value.replace(/\D/g, "").slice(0, 10)})} /></label></div></section>
        {coldStorageSaveState && <p className="form-message">{coldStorageSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setColdStorageModal(false)}>Cancelar</button><button type="submit" className="primary-button">Registrar cold storage</button></div>
      </form></div>}

      {productModal && <div className="modal-backdrop modal-backdrop-elevated"><form className="sale-modal product-modal" onSubmit={saveProduct}>
        <div className="modal-heading"><div><p className="eyebrow">Catálogo USA</p><h2>Agregar nuevo producto</h2><p className="modal-intro">Al guardarlo regresarás a la captura anterior con el producto seleccionado.</p></div></div>
        <section className="form-section"><div className="form-grid"><label>Producto *<input required value={productForm.name} onChange={(e) => setProductForm({...productForm, name:e.target.value})} /></label><label>Presentación<input value={productForm.presentation} onChange={(e) => setProductForm({...productForm, presentation:e.target.value})} placeholder="Ej. caja 25 lb" /></label><label>Tamaño<input value={productForm.size} onChange={(e) => setProductForm({...productForm, size:e.target.value})} /></label><label>Etiqueta<input value={productForm.label} onChange={(e) => setProductForm({...productForm, label:e.target.value})} /></label></div></section>
        {productSaveState && <p className="form-message">{productSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setProductModal(false); setProductTarget(null); }}>Cancelar</button><button type="submit" className="primary-button">Registrar producto</button></div>
      </form></div>}

      {invoicePreview && <div className="modal-backdrop invoice-preview-backdrop"><section className="sale-modal invoice-preview-modal">
        <div className="invoice-toolbar"><div><p className="eyebrow">Vista previa</p><h2>Factura {invoicePreview.invoiceNumber}</h2></div><div><button type="button" className="secondary-button" onClick={() => setInvoicePreview(null)}>Cerrar</button><button type="button" className="primary-button" onClick={() => window.print()}>Imprimir PDF</button></div></div>
        <article className="print-document commercial-document invoice-document">
          <div className="document-top"><div className="document-company"><img src="/norwest-logo.jpg" alt="Norwest Produce" width="390" height="142" /><div><strong>NORWEST PRODUCE LLC</strong><span>710 LAUREL AVENUE</span><span>MCALLEN, TX 78501</span></div></div><div className="document-title-block"><h3><span>INVOICE:</span><b>{invoicePreview.invoiceNumber}</b></h3><dl><dt>ISSUED:</dt><dd>{formatDocumentDate(invoicePreview.saleDate)}</dd><dt>P.O. #:</dt><dd>{invoicePreview.purchaseOrder || "N/A"}</dd><dt>PICKUP #:</dt><dd>{invoicePreview.pickupNumber}</dd><dt>PICKUP DATE:</dt><dd>{formatDocumentDate(invoicePreview.pickupDate)}</dd><dt>CREDIT TERMS:</dt><dd>21 Days</dd><dt>DUE DATE:</dt><dd>{formatDocumentDate(invoicePreview.dueDate)}</dd></dl></div></div>
          <div className="document-parties two-columns"><section><h4>BILL TO:</h4><strong>{invoicePreview.customer}</strong>{partnerAddress(documentCustomer).map((line) => <span key={line}>{line}</span>)}</section><section><h4>SHIP TO:</h4><strong>{invoicePreview.warehouse}</strong>{documentWarehouse ? <><span>{documentWarehouse.address}</span><span>PH: {documentWarehouse.phone}</span></> : <span>Pickup destination</span>}</section></div>
          <table className="document-items"><thead><tr><th>Description</th><th>Size</th><th>Label</th><th>Unit</th><th className="numeric">Qty</th><th className="numeric">Unit Price</th><th className="numeric">Total</th></tr></thead><tbody><tr><td>{invoicePreview.product}</td><td>{invoicePreview.size || "—"}</td><td>{invoicePreview.label || "—"}</td><td>{invoicePreview.presentation || "—"}</td><td className="numeric">{number.format(invoicePreview.boxes)}</td><td className="numeric">{invoicePreview.salePrice == null ? "—" : money.format(invoicePreview.salePrice)}</td><td className="numeric">{invoicePreview.total == null ? "—" : money.format(invoicePreview.total)}</td></tr>{Array.from({ length: 4 }).map((_, index) => <tr className="empty-item-row" key={index}><td /><td /><td /><td /><td /><td /><td /></tr>)}</tbody><tfoot><tr><td colSpan={6}>TOTAL:</td><td className="numeric">{invoicePreview.total == null ? "—" : money.format(invoicePreview.total)}</td></tr></tfoot></table>
          <p className="amount-words">{amountInWords(invoicePreview.total)}</p>
          <p className="remit-note">Please remit payments to:</p><div className="payment-details"><section><strong>BANKING INFORMATION:</strong><span>Bank: IBC BANK</span><span>Acc. Name: NORWEST PRODUCE LLC</span><span>Acc. Number: 2516358520</span><span>Wire Routing: 114902528</span></section><section><strong>ADDRESS:</strong><span>1 S Broadway St</span><span>McAllen, TX. 78501</span></section></div>
          <p className="document-terms"><strong>Good Delivery Standards.</strong> Any claims for quality must be made within 24 hours of arrival at destination and supported by a timely federal inspection. The perishable agricultural commodities listed on this invoice are sold subject to the statutory trust authorized by section 5(c) of the Perishable Agricultural Commodities Act, 1930. Past due balances accrue interest at 1.5% per month. No adjustments will be honored unless the seller is notified as stated herein.</p>
        </article>
      </section></div>}

      {socPreview && <div className="modal-backdrop invoice-preview-backdrop"><section className="sale-modal invoice-preview-modal">
        <div className="invoice-toolbar"><div><p className="eyebrow">Vista previa</p><h2>Sales Order Confirmation {socPreview.pickupNumber}</h2></div><div><button type="button" className="secondary-button" onClick={() => setSocPreview(null)}>Cerrar</button><button type="button" className="primary-button" onClick={() => window.print()}>Imprimir PDF</button></div></div>
        <article className="print-document commercial-document soc-document">
          <div className="document-top"><div className="document-company"><img src="/norwest-logo.jpg" alt="Norwest Produce" width="390" height="142" /><div><strong>NORWEST PRODUCE LLC</strong><span>710 LAUREL AVENUE</span><span>MCALLEN, TX 78501</span></div></div><div className="document-title-block soc-title"><h3>SALES CONFIRMATION</h3><dl><dt>ORDER #:</dt><dd>{socPreview.pickupNumber}</dd><dt>DATE:</dt><dd>{formatDocumentDate(socPreview.saleDate)}</dd></dl></div></div>
          <div className="document-parties three-columns"><section><h4>CUSTOMER:</h4><strong>{socPreview.customer}</strong>{partnerAddress(documentCustomer).map((line) => <span key={line}>{line}</span>)}</section><section><h4>SHIP TO:</h4><strong>{socPreview.warehouse}</strong><span>{documentWarehouse?.address || "Destination address pending"}</span></section><section><h4>WAREHOUSE:</h4><strong>{documentWarehouse?.name || socPreview.warehouse}</strong>{documentWarehouse && <><span>{documentWarehouse.address}</span><span>PH: {documentWarehouse.phone}</span></>}</section></div>
          <dl className="soc-order-meta"><div><dt>P.O. Date</dt><dd>{formatDocumentDate(socPreview.saleDate)}</dd></div><div><dt>P.O. #</dt><dd>{socPreview.purchaseOrder || "N/A"}</dd></div><div><dt>P.U. #</dt><dd>{socPreview.pickupNumber}</dd></div><div><dt>Buyer</dt><dd>{documentCustomer?.contactName || "Pending"}</dd></div><div><dt>Ship Terms</dt><dd>{socPreview.warehouse}</dd></div><div><dt>Payment Terms</dt><dd>21 Days</dd></div></dl>
          <table className="document-items"><thead><tr><th>Description</th><th>Size</th><th>Label</th><th>Unit</th><th className="numeric">Qty</th><th className="numeric">Unit Price</th><th className="numeric">Total</th></tr></thead><tbody><tr><td>{socPreview.product}</td><td>{socPreview.size || "—"}</td><td>{socPreview.label || "—"}</td><td>{socPreview.presentation || "—"}</td><td className="numeric">{number.format(socPreview.boxes)}</td><td className="numeric">{socPreview.salePrice == null ? "—" : money.format(socPreview.salePrice)}</td><td className="numeric">{socPreview.total == null ? "—" : money.format(socPreview.total)}</td></tr>{Array.from({ length: 4 }).map((_, index) => <tr className="empty-item-row" key={index}><td /><td /><td /><td /><td /><td /><td /></tr>)}</tbody><tfoot><tr><td colSpan={6}>TOTAL:</td><td className="numeric">{socPreview.total == null ? "—" : money.format(socPreview.total)}</td></tr></tfoot></table>
          <p className="amount-words">{amountInWords(socPreview.total)}</p>
          <p className="document-terms soc-terms">The perishable agricultural commodities listed on this sales confirmation are sold subject to the statutory trust authorized by section 5(c) of the Perishable Agricultural Commodities Act, 1930. All claims must be supported by USDA inspection. Past due balances accrue interest at 1.5% per month, and no adjustments will be honored unless the seller is notified as stated herein.</p>
        </article>
      </section></div>}
    </main>
  );
}
