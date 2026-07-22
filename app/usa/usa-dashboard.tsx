"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import type { BusinessPartner, ColdStorage, CompanySettings, InventoryLot, InvoiceAdjustment, InvoiceItem, PartnerType, Product, Sale, UserAccount } from "../../lib/types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const moneyMxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const number = new Intl.NumberFormat("en-US");
const shortDate = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
const documentDate = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC" });
const SALES_ORDER_TERMS = "The perishable agricultural commodities listed on this invoice are sold subject to the statutory trust authorized by section 5(c) of the Perishable Agricultural Commodities Act, 1930 (7 U.S.C. 499e(c)). The seller of these commodities retains a trust claim over these commodities, all inventories of food or other products derived from these commodities, and any receivables or proceeds from the sale of these commodities until full payment is received. All claims must be supported by USDA Inspection Certificate. The tomatoes shipped under this bill of lading and sold pursuant to this invoice are subject to: 1) the 2019 Suspension Agreement between the United States Department of Commerce and certain tomato growers; 2) any subsequent amendments, clarifications or modifications thereof; and 3) certain letter agreements between yourselves and ourselves regarding the same, each of which is incorporated by this reference as if fully set forth herein. Copies of said agreements will be sent to you upon request. Failure to abide by these terms constitutes a violation of Section 2 of the PACA (7 U.S.C. §499b) and may subject the violator to disciplinary proceedings. Notice to subsequent purchaser or re-packer. These articles are imported. The requirements of 19 U.S.C. §1304 and 19 C.F.R. Part 134 provide that the articles or their containers must be marked in a conspicuous place as legibly, indelibly and permanently as the nature of the article or container will permit, in such a manner as to indicate to an ultimate purchaser in the United States, the English name of the country of origin of the articles. After payment is due, interest will accrue on unpaid balances at a rate of 18% per annum (1.5% per month) until paid. In the event a legal or other action is commenced to collect sums due under this invoice, the prevailing party shall be entitled to reimbursement of all costs and fees including reasonable attorney’s fees incurred. With the exception of tomatoes, which are covered by the Suspension Agreement, any variance noted by the receiver as to quantity, or price disparity must be brought to seller’s attention within 24 hours after the receipt of the merchandise. No adjustments on the above items will be honored unless seller is notified as herein stated.";
const INVOICE_TERMS = "Good Delivery Standars. Any claims for quality must be made within 24 hours of arrival at destination and must be supported with a timely federal inspection fo the complete lot in question. We reserve the right to deny credit. Negotiated under P.A.C.A. terms. INTEREST WILL ACCRUE ON ANY PAST BALANCE AT THE RATE OF 1.5% PER MONTH (18% PER ANNUM.) The perishable agricultural commodities listed on this invoice are sold subject to the statutory trust authorized by section 5(c) of the Perishable Agricultural Commodities Act, 1930 (7 U.S.C. 499e(c)). The seller of these commodities retains a trust claim over these commodities, all inventories of food or other products derived from these commodities, and any receivables or proceeds from the sale of these commodities until full payment is received. All claims must be supported by USDA Inspection Certificate. The tomatoes shipped under this bill of lading and sold pursuant to this invoice are subject to: 1) the 2019 Suspension Agreement between the United States Department of Commerce and certain tomato growers; 2) any subsequent amendments, clarifications or modifications thereof; and 3) certain letter agreements between yourselves and ourselves regarding the same, each of which is incorporated by this reference as if fully set forth herein. Copies of said agreements will be sent to you upon request. Failure to abide by these terms constitutes a violation of Section 2 of the PACA (7 U.S.C. §499b) and may subject the violator to disciplinary proceedings. Notice to subsequent purchaser or re-packer. These articles are imported. The requirements of 19 U.S.C. §1304 and 19 C.F.R. Part 134 provide that the articles or their containers must be marked in a conspicuous place as legibly, indelibly and permanently as the nature of the article or container will permit, in such a manner as to indicate to an ultimate purchaser in the United States, the English name of the country of origin of the articles. After payment is due, interest will accrue on unpaid balances at a rate of 18% per annum (1.5% per month) until paid. In the event a legal or other action is commenced to collect sums due under this invoice, the prevailing party shall be entitled to reimbursement of all costs and fees including reasonable attorney’s fees incurred. With the exception of tomatoes, which are covered by the Suspension Agreement, any variance noted by the receiver as to quantity, or price disparity must be brought to seller’s attention within 24 hours after the receipt of the merchandise. No adjustments on the above items will be honored unless seller is notified as herein stated.";
type Operation = "DIRECT_RESALE" | "IMPORTED_INVENTORY";
type Section = "dashboard" | "catalogs" | "inventory" | "invoicing" | "settings";
type CatalogType = PartnerType | "WAREHOUSE" | "PRODUCT";
type StateOption = { code: string; name: string };
type LoadStatus = "OK" | "PAS" | "AJUSTE POR MERCADO" | "AJUSTE POR CALIDAD" | "USDA REQUESTED";
const LOAD_STATUS_OPTIONS: LoadStatus[] = ["OK", "PAS", "AJUSTE POR MERCADO", "AJUSTE POR CALIDAD", "USDA REQUESTED"];

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

function invoiceItemsFor(sale: Sale): InvoiceItem[] {
  if (sale.invoiceItems) {
    try {
      const parsed = JSON.parse(sale.invoiceItems) as InvoiceItem[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* Fall back to the original sale row. */ }
  }
  return [{ product: sale.product, presentation: sale.presentation || "", size: sale.size || "", label: sale.label || "", quantity: sale.boxes, unitPrice: sale.salePrice || 0, purchasePrice: sale.purchasePrice ?? undefined }];
}

function originalInvoiceItemsFor(sale: Sale): InvoiceItem[] {
  if (sale.originalInvoiceItems) {
    try {
      const parsed = JSON.parse(sale.originalInvoiceItems) as InvoiceItem[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* Fall back to the current invoice items. */ }
  }
  return invoiceItemsFor(sale);
}

function adjustmentsFor(sale: Sale): InvoiceAdjustment[] {
  try {
    const parsed = JSON.parse(sale.invoiceAdjustments || "[]") as InvoiceAdjustment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const blankSale = {
  saleDate: localDateKey(), operationType: "DIRECT_RESALE" as Operation, supplier: "", inventoryLotId: "", customer: "", purchaseOrder: "", warehouse: "", pickupNumber: "",
  boxes: "", product: "", presentation: "", size: "", label: "", purchasePrice: "", salePrice: "", sellerName: "", shipDate: "", pickupDate: "",
};

const blankPartner = {
  partnerType: "SUPPLIER" as PartnerType, name: "", pacaNumber: "", taxId: "", blueBookNumber: "", dunsNumber: "",
  street: "", exteriorNumber: "", interiorNumber: "", stateCode: "", stateName: "", city: "", postalCode: "",
  contactName: "", contactEmail: "", contactPhone: "", assignedSeller: "", profitPercentage: "0",
};

const blankInventory = {
  receivedDate: localDateKey(), supplier: "", warehouse: "", pickupNumber: "", product: "", presentation: "", size: "", label: "", totalBoxes: "",
  boxesPerPallet: "", palletsPerLoad: "", exchangeRate: "",
  purchasePrice: "", freightCost: "", mexicoCustomsCost: "", usCustomsCost: "", overweightCost: "", redLightCost: "", coldStorage: "", coldStorageCost: "",
};

const blankProduct = { name: "", alias: "", presentation: "", size: "", label: "" };
const blankColdStorage = { name: "", address: "", phone: "" };
const blankCompany = { legalName: "NORWEST PRODUCE LLC", street: "710 LAUREL AVENUE", city: "MCALLEN", state: "TX", postalCode: "78501", blueBookNumber: "", pacaNumber: "", dunsNumber: "", taxId: "", norwestProfitPercentage: "16" };
const blankUser = { fullName: "", alias: "", email: "", password: "", currentPassword: "", newPassword: "", confirmNewPassword: "", active: true, permissions: ["sales_view"] as string[] };
const PERMISSION_OPTIONS = [
  ["sales_view", "Consultar ventas"], ["sales_edit", "Crear y modificar ventas"], ["inventory", "Inventario importado"], ["invoicing", "Facturación"], ["collections", "Cartera"], ["catalogs", "Clientes y proveedores"], ["reports", "Reportes"], ["settings", "Configuración de empresa"], ["users", "Administrar usuarios"],
] as const;
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
  const [statusFilters, setStatusFilters] = useState<string[]>(["TODOS"]);
  const [operationFilters, setOperationFilters] = useState<string[]>(["TODAS"]);
  const [modalStep, setModalStep] = useState<"closed" | "choose" | "form">("closed");
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [form, setForm] = useState(blankSale);
  const [saleLineItems, setSaleLineItems] = useState<InvoiceItem[]>([]);
  const [saveState, setSaveState] = useState("");
  const [section, setSection] = useState<Section>("dashboard");
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<CatalogType>("SUPPLIER");
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
  const [invoiceStep, setInvoiceStep] = useState<"closed" | "pickup" | "bol" | "items">("closed");
  const [pickedUp, setPickedUp] = useState<boolean | null>(null);
  const [bolFile, setBolFile] = useState<File | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceSaveState, setInvoiceSaveState] = useState("");
  const [invoicePreview, setInvoicePreview] = useState<Sale | null>(null);
  const [adjustmentSale, setAdjustmentSale] = useState<Sale | null>(null);
  const [adjustmentItems, setAdjustmentItems] = useState<InvoiceItem[]>([]);
  const [adjustmentReason, setAdjustmentReason] = useState<InvoiceAdjustment["reason"]>("CAMBIO DE PRECIO");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjustmentSaveState, setAdjustmentSaveState] = useState("");
  const [adjustmentPreview, setAdjustmentPreview] = useState<{ sale: Sale; adjustment: InvoiceAdjustment } | null>(null);
  const [socPreview, setSocPreview] = useState<Sale | null>(null);
  const [productDetailSale, setProductDetailSale] = useState<Sale | null>(null);
  const [productDetailItems, setProductDetailItems] = useState<InvoiceItem[]>([]);
  const [productDetailSaveState, setProductDetailSaveState] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productModal, setProductModal] = useState(false);
  const [productForm, setProductForm] = useState(blankProduct);
  const [productSaveState, setProductSaveState] = useState("");
  const [partnerTarget, setPartnerTarget] = useState<PartnerTarget>(null);
  const [productTarget, setProductTarget] = useState<"sale" | "inventory" | "catalog" | null>(null);
  const [productTargetLine, setProductTargetLine] = useState<number | null>(null);
  const [additionalExpenses, setAdditionalExpenses] = useState<Array<{ concept: string; amount: string; currency: Currency }>>([]);
  const [expenseConcepts, setExpenseConcepts] = useState<string[]>([]);
  const [activeExpenseConcept, setActiveExpenseConcept] = useState<number | null>(null);
  const [costCurrencies, setCostCurrencies] = useState<Record<CostKey, Currency>>(defaultCostCurrencies);
  const [, setTotalBoxesManual] = useState(false);
  const [coldStorages, setColdStorages] = useState<ColdStorage[]>([]);
  const [coldStorageModal, setColdStorageModal] = useState(false);
  const [coldStorageTarget, setColdStorageTarget] = useState<"inventory" | "sale" | "catalog">("inventory");
  const [editingColdStorageId, setEditingColdStorageId] = useState<number | null>(null);
  const [coldStorageForm, setColdStorageForm] = useState(blankColdStorage);
  const [coldStorageSaveState, setColdStorageSaveState] = useState("");
  const [companyForm, setCompanyForm] = useState(blankCompany);
  const [companySaveState, setCompanySaveState] = useState("");
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [userModal, setUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState(blankUser);
  const [userSaveState, setUserSaveState] = useState("");
  const [visibleUserPasswords, setVisibleUserPasswords] = useState({ password: false, current: false, next: false, confirm: false });
  const [statusModalSale, setStatusModalSale] = useState<Sale | null>(null);
  const [statusModalType, setStatusModalType] = useState<"PAS" | "USDA REQUESTED" | null>(null);
  const [pasDays, setPasDays] = useState("");
  const [usdaFile, setUsdaFile] = useState<File | null>(null);
  const [statusSaveState, setStatusSaveState] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cancelSale, setCancelSale] = useState<Sale | null>(null);
  const [cancelParty, setCancelParty] = useState<"CLIENTE CANCELÓ" | "NW CANCELÓ">("CLIENTE CANCELÓ");
  const [cancelReason, setCancelReason] = useState("Sin Razón");
  const [cancelSaveState, setCancelSaveState] = useState("");

  useEffect(() => {
    fetch("/api/usa/sales").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data.sales)) setSalesRows(data.sales);
    }).catch(() => undefined);
    fetch("/api/usa/settings").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (!data.settings) return;
      const settings = data.settings as CompanySettings;
      setCompanyForm({ legalName: settings.legalName, street: settings.street, city: settings.city, state: settings.state, postalCode: settings.postalCode, blueBookNumber: settings.blueBookNumber, pacaNumber: settings.pacaNumber, dunsNumber: settings.dunsNumber, taxId: settings.taxId, norwestProfitPercentage: String(settings.norwestProfitPercentage ?? 16) });
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    function closeOpenFilters(event: PointerEvent) {
      const target = event.target as Node | null;
      document.querySelectorAll<HTMLDetailsElement>("details.filter-multiselect[open]").forEach((menu) => {
        if (!target || !menu.contains(target)) menu.removeAttribute("open");
      });
    }

    document.addEventListener("pointerdown", closeOpenFilters);
    return () => document.removeEventListener("pointerdown", closeOpenFilters);
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

  async function loadSettings() {
    const [settingsResponse, usersResponse] = await Promise.all([fetch("/api/usa/settings"), fetch("/api/usa/users")]);
    const [settingsData, usersData] = await Promise.all([settingsResponse.json(), usersResponse.json()]);
    if (settingsResponse.ok && settingsData.settings) {
      const settings = settingsData.settings as CompanySettings;
      setCompanyForm({ legalName: settings.legalName, street: settings.street, city: settings.city, state: settings.state, postalCode: settings.postalCode, blueBookNumber: settings.blueBookNumber, pacaNumber: settings.pacaNumber, dunsNumber: settings.dunsNumber, taxId: settings.taxId, norwestProfitPercentage: String(settings.norwestProfitPercentage ?? 16) });
    }
    if (usersResponse.ok && Array.isArray(usersData.users)) setUsers(usersData.users);
  }

  function openSettings() {
    setSection("settings");
    setCompanySaveState("");
    void loadSettings();
  }

  async function saveCompanySettings(event: FormEvent) {
    event.preventDefault();
    setCompanySaveState("Guardando…");
    try {
      const response = await fetch("/api/usa/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(companyForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
      setCompanySaveState("Cambios guardados correctamente.");
    } catch (error) {
      setCompanySaveState(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  function openUserForm(user?: UserAccount) {
    setEditingUserId(user?.id ?? null);
    setUserForm(user ? { fullName: user.fullName, alias: user.alias, email: user.email, password: "", currentPassword: "", newPassword: "", confirmNewPassword: "", active: user.active, permissions: (() => { try { return JSON.parse(user.permissions) as string[]; } catch { return []; } })() } : blankUser);
    setVisibleUserPasswords({ password: false, current: false, next: false, confirm: false });
    setUserSaveState("");
    setUserModal(true);
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    if (editingUserId && userForm.newPassword !== userForm.confirmNewPassword) {
      setUserSaveState("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    setUserSaveState("Guardando…");
    try {
      const response = await fetch("/api/usa/users", { method: editingUserId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...userForm, id: editingUserId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el usuario.");
      setUsers((current) => (editingUserId ? current.map((item) => item.id === editingUserId ? data.user : item) : [...current, data.user]).sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setUserModal(false);
      setUserSaveState("");
    } catch (error) {
      setUserSaveState(error instanceof Error ? error.message : "No se pudo guardar el usuario.");
    }
  }

  async function openCatalogs() {
    setSection("catalogs");
    await Promise.all([loadPartners(), loadColdStorages(), loadProducts()]);
  }

  async function openPartnerForm(type: PartnerType, target: PartnerTarget = null) {
    setPartnerTarget(target);
    setEditingPartnerId(null);
    setPartnerForm({ ...blankPartner, partnerType: type });
    setAlsoOppositeType(false);
    setPartnerSaveState("");
    setCities([]);
    setPartnerModal(type);
    if (type === "CUSTOMER" && !users.length) {
      fetch("/api/usa/users").then((response) => response.json()).then((data) => { if (Array.isArray(data.users)) setUsers(data.users); }).catch(() => undefined);
    }
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
      assignedSeller: partner.assignedSeller || "",
      profitPercentage: String(partner.profitPercentage || 0),
    });
    setPartnerSaveState("");
    setPartnerModal(partner.partnerType);
    if (partner.partnerType === "CUSTOMER" && !users.length) {
      fetch("/api/usa/users").then((response) => response.json()).then((data) => { if (Array.isArray(data.users)) setUsers(data.users); }).catch(() => undefined);
    }
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
      if (!editingPartnerId && partnerTarget === "saleCustomer") setForm((current) => ({ ...current, customer: data.partner.name, sellerName: data.partner.assignedSeller || "" }));
      if (!editingPartnerId && partnerTarget === "inventorySupplier") setInventoryForm((current) => ({ ...current, supplier: data.partner.name }));
      setPartnerTypeFilter(partnerForm.partnerType);
      setPartnerModal(null);
      setPartnerTarget(null);
      setPartnerSaveState("");
    } catch (error) {
      setPartnerSaveState(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  async function loadInventory(includeAll = false) {
    setInventoryLoading(true);
    try {
      const response = await fetch(`/api/usa/inventory${includeAll ? "?all=1" : ""}`);
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

  function openColdStorageForm(target: "inventory" | "sale" | "catalog" = "inventory", coldStorage?: ColdStorage) {
    setColdStorageTarget(target);
    setEditingColdStorageId(coldStorage?.id ?? null);
    setColdStorageForm(coldStorage ? { name: coldStorage.name, address: coldStorage.address, phone: coldStorage.phone } : blankColdStorage);
    setColdStorageSaveState("");
    setColdStorageModal(true);
  }

  async function saveColdStorage(event: FormEvent) {
    event.preventDefault();
    setColdStorageSaveState("Guardando…");
    try {
      const response = await fetch("/api/usa/cold-storages", { method: editingColdStorageId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...coldStorageForm, id: editingColdStorageId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el cold storage.");
      setColdStorages((current) => (editingColdStorageId ? current.map((item) => item.id === editingColdStorageId ? data.coldStorage : item) : [...current, data.coldStorage]).sort((a, b) => a.name.localeCompare(b.name)));
      if (!editingColdStorageId && coldStorageTarget === "sale") {
        setForm((current) => ({ ...current, warehouse: data.coldStorage.name }));
      } else if (!editingColdStorageId && coldStorageTarget === "inventory") {
        setInventoryForm((current) => ({ ...current, coldStorage: data.coldStorage.name, warehouse: data.coldStorage.name }));
      }
      setColdStorageModal(false);
      setEditingColdStorageId(null);
      setColdStorageSaveState("");
    } catch (error) {
      setColdStorageSaveState(error instanceof Error ? error.message : "No se pudo guardar el cold storage.");
    }
  }

  function chooseColdStorage(value: string) {
    if (value === "__new__") return openColdStorageForm("inventory");
    const selected = coldStorages.find((item) => String(item.id) === value);
    setInventoryForm((current) => ({ ...current, coldStorage: selected?.name || "", warehouse: selected?.name || "" }));
  }

  function chooseSaleWarehouse(value: string) {
    if (value === "__new__") return openColdStorageForm("sale");
    if (value.startsWith("legacy:")) {
      setForm((current) => ({ ...current, warehouse: value.slice("legacy:".length) }));
      return;
    }
    const selected = coldStorages.find((item) => String(item.id) === value);
    setForm((current) => ({ ...current, warehouse: selected?.name || "" }));
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

  function replaceSale(updated: Sale) {
    setSalesRows((current) => current.map((sale) => sale.id === updated.id ? updated : sale));
  }

  function openStatusModal(row: Sale, type: "PAS" | "USDA REQUESTED") {
    setStatusModalSale(row);
    setStatusModalType(type);
    setPasDays("");
    setUsdaFile(null);
    setStatusSaveState("");
    setNotificationsOpen(false);
  }

  function closeStatusModal() {
    setStatusModalSale(null);
    setStatusModalType(null);
    setPasDays("");
    setUsdaFile(null);
    setStatusSaveState("");
  }

  async function changeLoadStatus(row: Sale, loadStatus: LoadStatus) {
    if (!row.id || row.invoiceNumber || loadStatus === row.loadStatus) return;
    if (loadStatus === "PAS" || loadStatus === "USDA REQUESTED") return openStatusModal(row, loadStatus);
    try {
      const response = await fetch("/api/usa/sales", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, loadStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cambiar el estatus.");
      replaceSale(data.sale);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo cambiar el estatus.");
    }
  }

  async function savePasStatus(event: FormEvent) {
    event.preventDefault();
    if (!statusModalSale?.id) return;
    const days = Number(pasDays);
    if (!Number.isInteger(days) || days <= 0 || days > 365) return setStatusSaveState("Indica de 1 a 365 días.");
    setStatusSaveState("Guardando plazo…");
    try {
      const response = await fetch("/api/usa/sales", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: statusModalSale.id, loadStatus: "PAS", pasReviewDays: days, startDate: localDateKey() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el PAS.");
      replaceSale(data.sale);
      closeStatusModal();
    } catch (error) {
      setStatusSaveState(error instanceof Error ? error.message : "No se pudo guardar el PAS.");
    }
  }

  function selectUsdaFile(file?: File | null) {
    if (!file) return;
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setUsdaFile(null);
      setStatusSaveState("La inspección debe ser PDF, JPG, PNG o WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUsdaFile(null);
      setStatusSaveState("La inspección no puede exceder 10 MB.");
      return;
    }
    setUsdaFile(file);
    setStatusSaveState("");
  }

  async function saveUsdaStatus(withoutFile: boolean) {
    if (!statusModalSale?.id) return;
    if (!withoutFile && !usdaFile) return setStatusSaveState("Selecciona la inspección o usa “Aún no la tengo”.");
    setStatusSaveState(withoutFile ? "Guardando como pendiente…" : "Adjuntando inspección…");
    try {
      const payload = new FormData();
      payload.set("saleId", String(statusModalSale.id));
      if (!withoutFile && usdaFile) payload.set("inspection", usdaFile);
      const response = await fetch("/api/usa/usda-inspections", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la inspección USDA.");
      replaceSale(data.sale);
      closeStatusModal();
    } catch (error) {
      setStatusSaveState(error instanceof Error ? error.message : "No se pudo guardar la inspección USDA.");
    }
  }

  function openInvoicing(sale?: Sale) {
    setInvoiceSale(sale ?? null);
    setSection("invoicing");
  }

  function openInvoicePreparation(sale: Sale) {
    setInvoiceSale(sale);
    setPickedUp(null);
    setBolFile(null);
    setInvoiceItems(invoiceItemsFor(sale));
    setInvoiceSaveState("");
    setInvoiceStep("pickup");
    void loadProducts();
  }

  function closeInvoicePreparation() {
    setInvoiceStep("closed");
    setPickedUp(null);
    setBolFile(null);
    setInvoiceSaveState("");
  }

  function selectBolFile(file?: File | null) {
    if (!file) return;
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setBolFile(null);
      setInvoiceSaveState("El BOL debe ser PDF, JPG, PNG o WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBolFile(null);
      setInvoiceSaveState("El BOL no puede exceder 10 MB.");
      return;
    }
    setInvoiceSaveState("");
    setBolFile(file);
  }

  function updateInvoiceItem(index: number, changes: Partial<InvoiceItem>) {
    setInvoiceItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }

  function openProductDetail(sale: Sale) {
    setProductDetailSale(sale);
    setProductDetailItems(invoiceItemsFor(sale));
    setProductDetailSaveState("");
    void loadProducts();
  }

  function closeProductDetail() {
    setProductDetailSale(null);
    setProductDetailItems([]);
    setProductDetailSaveState("");
  }

  function updateProductDetailItem(index: number, changes: Partial<InvoiceItem>) {
    setProductDetailItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }

  async function saveProductDetail() {
    if (!productDetailSale?.id) return;
    if (productDetailSale.invoiceNumber) {
      setProductDetailSaveState("La venta ya fue facturada. Para modificarla, utiliza Crear ajuste desde la factura.");
      return;
    }
    if (productDetailItems.some((item) => item.quantity <= 0 || item.unitPrice < 0)) {
      setProductDetailSaveState("Revisa que los bultos/cajas sean mayores que cero y que los precios sean válidos.");
      return;
    }
    setProductDetailSaveState("Guardando cambios…");
    try {
      const response = await fetch("/api/usa/sales", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: productDetailSale.id, items: productDetailItems }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la carga.");
      setSalesRows((current) => current.map((sale) => sale.id === data.sale.id ? data.sale : sale));
      closeProductDetail();
    } catch (error) {
      setProductDetailSaveState(error instanceof Error ? error.message : "No se pudo actualizar la carga.");
    }
  }

  async function issueInvoice(event: FormEvent) {
    event.preventDefault();
    if (!invoiceSale?.id || !bolFile) return setInvoiceSaveState("Adjunta el BOL para poder facturar.");
    if (!invoiceItems.length || invoiceItems.some((item) => !item.product.trim() || item.quantity <= 0 || item.unitPrice < 0)) return setInvoiceSaveState("Revisa las partidas, cantidades y precios.");
    setInvoiceSaveState("Generando factura…");
    try {
      const payload = new FormData();
      payload.set("saleId", String(invoiceSale.id));
      payload.set("bol", bolFile);
      payload.set("items", JSON.stringify(invoiceItems));
      const response = await fetch("/api/usa/invoices", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo generar la factura.");
      setSalesRows((current) => current.map((sale) => sale.id === data.sale.id ? data.sale : sale));
      setInvoiceSale(null);
      closeInvoicePreparation();
      openInvoicePreview(data.sale);
    } catch (error) {
      setInvoiceSaveState(error instanceof Error ? error.message : "No se pudo generar la factura.");
    }
  }

  function openInvoicePreview(sale: Sale) {
    setSocPreview(null);
    setInvoicePreview(sale);
    void Promise.all([loadPartners(), loadColdStorages(), loadSettings()]);
  }

  function openInvoiceAdjustment(sale: Sale) {
    setAdjustmentPreview(null);
    setAdjustmentSale(sale);
    setAdjustmentItems(invoiceItemsFor(sale));
    setAdjustmentReason("CAMBIO DE PRECIO");
    setAdjustmentNotes("");
    setAdjustmentSaveState("");
    void loadProducts();
  }

  function closeInvoiceAdjustment() {
    setAdjustmentSale(null);
    setAdjustmentItems([]);
    setAdjustmentNotes("");
    setAdjustmentSaveState("");
  }

  async function saveInvoiceAdjustment(event: FormEvent) {
    event.preventDefault();
    if (!adjustmentSale?.id) return;
    if (!adjustmentNotes.trim()) return setAdjustmentSaveState("Describe brevemente la razón del ajuste.");
    if (adjustmentItems.some((item) => !item.product.trim() || item.quantity <= 0 || item.unitPrice < 0)) return setAdjustmentSaveState("Revisa las partidas, cantidades y precios.");
    setAdjustmentSaveState("Registrando ajuste…");
    try {
      const response = await fetch("/api/usa/invoice-adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saleId: adjustmentSale.id, reason: adjustmentReason, notes: adjustmentNotes, items: adjustmentItems }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo registrar el ajuste.");
      replaceSale(data.sale);
      setInvoicePreview(data.sale);
      setAdjustmentPreview({ sale: data.sale, adjustment: data.adjustment });
      closeInvoiceAdjustment();
    } catch (error) {
      setAdjustmentSaveState(error instanceof Error ? error.message : "No se pudo registrar el ajuste.");
    }
  }

  function openSocPreview(sale: Sale) {
    setInvoicePreview(null);
    setSocPreview(sale);
    void Promise.all([loadPartners(), loadColdStorages(), loadSettings()]);
  }

  function openNewSale() {
    setEditingSale(null);
    setForm({ ...blankSale, saleDate: localDateKey() });
    setSaleLineItems([]);
    setSaveState("");
    setModalStep("choose");
    void loadCaptureCatalogs();
  }

  function openEditSale(sale: Sale) {
    if (!sale.id || sale.invoiceNumber) return;
    setEditingSale(sale);
    setSaleLineItems(invoiceItemsFor(sale).map((item) => ({ ...item, purchasePrice: item.purchasePrice ?? sale.purchasePrice ?? 0 })));
    setForm({
      saleDate: sale.saleDate,
      operationType: sale.operationType,
      supplier: sale.supplier || "",
      inventoryLotId: sale.inventoryLotId == null ? "" : String(sale.inventoryLotId),
      customer: sale.customer,
      purchaseOrder: sale.purchaseOrder || "",
      warehouse: sale.warehouse,
      pickupNumber: sale.pickupNumber,
      boxes: String(sale.boxes),
      product: sale.product,
      presentation: sale.presentation || "",
      size: sale.size || "",
      label: sale.label || "",
      purchasePrice: sale.purchasePrice == null ? "" : String(sale.purchasePrice),
      salePrice: sale.salePrice == null ? "" : String(sale.salePrice),
      sellerName: sale.sellerName || "",
      shipDate: "",
      pickupDate: sale.pickupDate || "",
    });
    setSaveState("");
    setModalStep("form");
    void loadCaptureCatalogs();
    if (sale.operationType === "IMPORTED_INVENTORY") void loadInventory(true);
  }

  function openProductForm(target: "sale" | "inventory" | "catalog", lineIndex: number | null = null, seed: Partial<typeof blankProduct> = {}) {
    setProductTarget(target);
    setProductTargetLine(lineIndex);
    setProductForm({ ...blankProduct, ...seed });
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
      if (productTarget === "sale") {
        if (form.operationType === "DIRECT_RESALE" && productTargetLine != null) setSaleLineItems((current) => current.map((item, index) => index === productTargetLine ? { ...item, product: data.product.name, presentation: data.product.presentation || "", size: data.product.size || "", label: data.product.label || "" } : item));
        else if (form.operationType === "DIRECT_RESALE") setSaleLineItems((current) => [...current, { product: data.product.name, presentation: data.product.presentation || "", size: data.product.size || "", label: data.product.label || "", quantity: 1, purchasePrice: 0, unitPrice: 0 }]);
        else setForm((current) => ({ ...current, product: data.product.name, presentation: data.product.presentation || "", size: data.product.size || "", label: data.product.label || "" }));
      }
      if (productTarget === "inventory") setInventoryForm((current) => ({ ...current, product: data.product.name, presentation: data.product.presentation || "", size: data.product.size || "", label: data.product.label || "" }));
      setProductModal(false);
      setProductTarget(null);
      setProductTargetLine(null);
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

  function addSaleLineItem(productId?: string) {
    const product = products.find((item) => String(item.id) === productId) || products[0];
    if (!product) return openProductForm("sale");
    setSaleLineItems((current) => [...current, {
      product: product.name,
      presentation: product.presentation || "",
      size: product.size || "",
      label: product.label || "",
      quantity: 1,
      purchasePrice: 0,
      unitPrice: 0,
    }]);
  }

  function changeSaleLineProduct(index: number, productId: string) {
    if (productId === "__new__") return openProductForm("sale", index);
    const product = products.find((item) => item.name === productId);
    if (!product) return updateSaleLineItem(index, { product: "", presentation: "", size: "", label: "" });
    setSaleLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      product: product.name,
      presentation: "",
      size: "",
      label: "",
    } : item));
  }

  function saleLineCatalogValues(productName: string, field: "presentation" | "size" | "label") {
    return Array.from(new Set(products.filter((product) => product.name === productName).map((product) => product[field] || "").filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function changeSaleLineCatalogValue(index: number, field: "presentation" | "size" | "label", value: string) {
    const item = saleLineItems[index];
    if (!item) return;
    if (value === "__new__") {
      const catalogProduct = products.find((product) => product.name === item.product);
      return openProductForm("sale", index, {
        name: item.product,
        alias: catalogProduct?.alias || "",
        presentation: item.presentation,
        size: item.size,
        label: item.label,
      });
    }
    updateSaleLineItem(index, { [field]: value });
  }

  function updateSaleLineItem(index: number, changes: Partial<InvoiceItem>) {
    setSaleLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }

  const customerCancellationReasons = ["Sin Razón", "Compró en otro lado", "Consiguió mejor precio", "No consiguió camión", "Canceló su cliente", "No le gustó la calidad"];
  const nwCancellationReasons = ["Producto no disponible", "Producto sin calidad", "Producto llegará tarde"];

  function openCancelSale(sale: Sale) {
    setCancelSale(sale);
    setCancelParty("CLIENTE CANCELÓ");
    setCancelReason("Sin Razón");
    setCancelSaveState("");
  }

  async function confirmCancelSale(event: FormEvent) {
    event.preventDefault();
    if (!cancelSale?.id) return;
    setCancelSaveState("Guardando cancelación…");
    try {
      const response = await fetch("/api/usa/sales", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cancelSale.id, cancelSale: true, canceledBy: cancelParty, cancellationReason: cancelReason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cancelar la venta.");
      setSalesRows((current) => current.map((sale) => sale.id === data.sale.id ? data.sale : sale));
      setCancelSale(null);
    } catch (error) {
      setCancelSaveState(error instanceof Error ? error.message : "No se pudo cancelar la venta.");
    }
  }

  function chooseOperation(type: Operation) {
    setEditingSale(null);
    setForm({ ...blankSale, saleDate: localDateKey(), operationType: type });
    setSaleLineItems([]);
    setSaveState("");
    if (type === "IMPORTED_INVENTORY") void loadInventory();
    setModalStep("form");
  }

  function closeModal() {
    setModalStep("closed");
    setEditingSale(null);
    setSaleLineItems([]);
    setSaveState("");
  }

  function saleRowClass(row: Sale) {
    if (row.canceledAt) return "canceled-sale-row";
    if (row.loadStatus === "PAS") return "pas-attention-row";
    if (row.invoiceNumber) return "invoice-complete-row";
    if (row.pickupDate === localDateKey()) return "pickup-current-row";
    return "";
  }

  function selectInventoryLot(lot: InventoryLot) {
    const available = lot.availableBoxes + (editingSale?.inventoryLotId === lot.id ? editingSale.boxes : 0);
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
      boxes: Number(current.boxes) > available ? "" : current.boxes,
    }));
  }

  const selectedLot = inventory.find((lot) => lot.id === Number(form.inventoryLotId));
  const selectedLotAvailable = selectedLot ? selectedLot.availableBoxes + (editingSale?.inventoryLotId === selectedLot.id ? editingSale.boxes : 0) : undefined;
  const selectedColdStorage = coldStorages.find((item) => item.name === inventoryForm.coldStorage);
  const registeredSaleWarehouses = Array.from(new Set(salesRows.map((row) => row.warehouse.trim()).filter(Boolean)))
    .filter((name) => !coldStorages.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  const selectedSaleWarehouse = coldStorages.find((item) => item.name === form.warehouse);
  const documentSale = invoicePreview || socPreview;
  const documentItems = documentSale ? (invoicePreview ? originalInvoiceItemsFor(documentSale) : invoiceItemsFor(documentSale)) : [];
  const documentTotal = documentItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const documentCustomer = partners.find((item) => item.partnerType === "CUSTOMER" && item.name === documentSale?.customer);
  const documentWarehouse = coldStorages.find((item) => item.name === documentSale?.warehouse);
  function productAlias(name: string) {
    return products.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.alias || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
  }
  function productCell(sale: Sale) {
    const items = invoiceItemsFor(sale);
    if (items.length <= 1) {
      const content = <><strong>{items[0]?.product || sale.product}</strong><small>{[items[0]?.presentation ?? sale.presentation, items[0]?.size ?? sale.size, items[0]?.label ?? sale.label].filter(Boolean).join(" · ") || "—"}</small></>;
      return sale.invoiceNumber ? <button type="button" className="multi-product-button" onClick={() => openProductDetail(sale)}>{content}</button> : content;
    }
    return <button type="button" className="multi-product-button" onClick={() => openProductDetail(sale)}><strong>{items.map((item) => productAlias(item.product)).join(" / ")}</strong><small>{items.length} productos · Ver detalle</small></button>;
  }
  function adjustmentChanges(adjustment: InvoiceAdjustment) {
    const changes: string[] = [];
    const totalRows = Math.max(adjustment.previousItems.length, adjustment.adjustedItems.length);
    for (let index = 0; index < totalRows; index += 1) {
      const before = adjustment.previousItems[index];
      const after = adjustment.adjustedItems[index];
      if (before && !after) changes.push(`Producto eliminado: ${before.product} (${number.format(before.quantity)} bultos/cajas a ${money.format(before.unitPrice)})`);
      else if (!before && after) changes.push(`Producto agregado: ${after.product} (${number.format(after.quantity)} bultos/cajas a ${money.format(after.unitPrice)})`);
      else if (before && after) {
        if (before.product !== after.product) changes.push(`Producto: ${before.product} → ${after.product}`);
        if (before.quantity !== after.quantity) changes.push(`${after.product}: bultos/cajas ${number.format(before.quantity)} → ${number.format(after.quantity)}`);
        if (before.unitPrice !== after.unitPrice) changes.push(`${after.product}: precio ${money.format(before.unitPrice)} → ${money.format(after.unitPrice)}`);
      }
    }
    return changes.length ? changes : ["El ajuste no modificó productos, cantidades ni precios."];
  }
  function statusClass(value: string | null) {
    if (value === "OK") return "ok";
    if (value === "PAS" || value === "USDA REQUESTED") return "warning";
    return "adjusted";
  }
  function currentStatusValue(value: string | null): LoadStatus | string {
    return value && LOAD_STATUS_OPTIONS.includes(value as LoadStatus) ? value : value || "OK";
  }
  function toggleFilter(value: string, allValue: string, current: string[], update: (values: string[]) => void) {
    if (value === allValue) return update([allValue]);
    const withoutAll = current.filter((item) => item !== allValue);
    const next = withoutAll.includes(value) ? withoutAll.filter((item) => item !== value) : [...withoutAll, value];
    update(next.length ? next : [allValue]);
  }
  const overduePas = useMemo(() => {
    const today = localDateKey();
    return salesRows.filter((row) => !row.invoiceNumber && row.loadStatus === "PAS" && row.pasReviewDueDate && row.pasReviewDueDate <= today);
  }, [salesRows]);
  const filtered = useMemo(() => salesRows.filter((row) => {
    const text = `${row.customer} ${row.purchaseOrder ?? ""} ${row.pickupNumber} ${row.product} ${row.warehouse} ${row.invoiceNumber ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase())
      && (statusFilters.includes("TODOS") || statusFilters.some((filter) => filter === "SIN FACTURA" ? !row.invoiceNumber && !row.canceledAt : filter === "CANCELADAS" ? Boolean(row.canceledAt) : row.loadStatus === filter && !row.canceledAt))
      && (operationFilters.includes("TODAS") || operationFilters.includes(row.operationType));
  }), [salesRows, query, statusFilters, operationFilters]);

  const totals = useMemo(() => {
    const today = localDateKey();
    const currentMonth = today.slice(0, 7);
    const activeRows = salesRows.filter((row) => !row.canceledAt);
    const todayRows = activeRows.filter((row) => row.saleDate === today);
    const monthRows = activeRows.filter((row) => row.saleDate.startsWith(currentMonth));
    return {
      todaySales: todayRows.reduce((sum, row) => sum + (row.total ?? 0), 0),
      monthSales: monthRows.reduce((sum, row) => sum + (row.total ?? 0), 0),
      todayBoxes: todayRows.reduce((sum, row) => sum + row.boxes, 0),
      monthBoxes: monthRows.reduce((sum, row) => sum + row.boxes, 0),
      todayProfit: todayRows.reduce((sum, row) => sum + (row.profit ?? 0), 0),
      monthProfit: monthRows.reduce((sum, row) => sum + (row.profit ?? 0), 0),
      uninvoiced: activeRows.filter((row) => !row.invoiceNumber).reduce((sum, row) => sum + (row.total ?? 0), 0),
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
    if (form.operationType === "DIRECT_RESALE" && (!saleLineItems.length || saleLineItems.some((item) => !item.product || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.purchasePrice)) || Number(item.purchasePrice) < 0 || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0))) {
      setSaveState("Agrega al menos un producto y revisa cajas, precio de compra y precio de venta.");
      return;
    }
    const firstLine = saleLineItems[0];
    const directBoxes = saleLineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    setSaveState("Guardando…");
    const payload = {
      saleDate: form.saleDate, operationType: form.operationType, supplier: form.supplier, inventoryLotId: form.inventoryLotId ? Number(form.inventoryLotId) : null,
      customer: form.customer, sellerName: form.sellerName || null, purchaseOrder: form.purchaseOrder, warehouse: form.warehouse, pickupNumber: form.pickupNumber,
      boxes: form.operationType === "DIRECT_RESALE" ? directBoxes : Number(form.boxes),
      product: form.operationType === "DIRECT_RESALE" ? (firstLine?.product || "") : form.product,
      presentation: form.operationType === "DIRECT_RESALE" ? (firstLine?.presentation || "") : form.presentation,
      size: form.operationType === "DIRECT_RESALE" ? (firstLine?.size || "") : form.size,
      label: form.operationType === "DIRECT_RESALE" ? (firstLine?.label || "") : form.label,
      purchasePrice: form.operationType === "DIRECT_RESALE" ? (firstLine?.purchasePrice ?? null) : (form.purchasePrice ? Number(form.purchasePrice) : null),
      salePrice: form.operationType === "DIRECT_RESALE" ? (firstLine?.unitPrice ?? null) : (form.salePrice ? Number(form.salePrice) : null),
      items: form.operationType === "DIRECT_RESALE" ? saleLineItems : undefined,
      shipDate: null, pickupDate: form.pickupDate || null,
      dueDate: form.pickupDate ? new Date(new Date(`${form.pickupDate}T00:00:00Z`).getTime() + 21 * 86400000).toISOString().slice(0, 10) : null,
      loadStatus: editingSale?.loadStatus || "OK", invoiceNumber: null,
    };
    try {
      const response = await fetch("/api/usa/sales", { method: editingSale ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingSale ? { ...payload, id: editingSale.id, editSale: true } : payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
      setSalesRows((current) => editingSale ? current.map((sale) => sale.id === data.sale.id ? data.sale : sale) : [data.sale, ...current]);
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
        <div className="sidebar-brand"><img className="sidebar-logo" src="/norwest-logo.jpg" alt="Norwest Produce" /></div>
        <nav>
          <button className={`nav-item ${section === "dashboard" ? "active" : ""}`} onClick={() => setSection("dashboard")}><span>▦</span> Resumen</button>
          <button className={`nav-item ${section === "inventory" ? "active" : ""}`} onClick={() => void openInventorySection()}><span>▤</span> Inventario importado</button>
          <button className={`nav-item ${section === "invoicing" ? "active" : ""}`} onClick={() => openInvoicing()}><span>□</span> Facturación</button><a className="nav-item"><span>◎</span> Cartera</a><button className={`nav-item ${section === "catalogs" ? "active" : ""}`} onClick={() => void openCatalogs()}><span>◇</span> Catálogos</button><a className="nav-item"><span>⌁</span> Reportes</a><button className={`nav-item ${section === "settings" ? "active" : ""}`} onClick={openSettings}><span>⚙</span> Configuración</button>
        </nav>
        <div className="sidebar-bottom"><div className="operation-pill"><span>USA</span><div><strong>Norwest Produce LLC</strong><small>Operación activa</small></div></div><Link href="/">⇄ Cambiar empresa</Link></div>
      </aside>

      {section === "dashboard" && <section className="erp-content">
        <header className="topbar"><div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Ventas y operaciones</h1></div><div className="topbar-actions notification-anchor"><button className={`icon-button ${overduePas.length ? "has-notifications" : ""}`} aria-label={`Notificaciones${overduePas.length ? `: ${overduePas.length} pendientes` : ""}`} onClick={() => setNotificationsOpen((current) => !current)}>♢{overduePas.length > 0 && <b>{overduePas.length}</b>}</button>{notificationsOpen && <div className="notifications-popover"><div><strong>Notificaciones</strong><button type="button" onClick={() => setNotificationsOpen(false)}>×</button></div>{overduePas.length ? overduePas.map((row) => <button type="button" key={row.id} onClick={() => openStatusModal(row, "PAS")}><span>Revisar PAS vencido</span><strong>{row.customer}</strong><small>Pickup #{row.pickupNumber} · venció {formatDate(row.pasReviewDueDate || null)}</small></button>) : <p>No hay revisiones pendientes.</p>}</div>}<button className="primary-button" onClick={openNewSale}>＋ Nueva venta</button></div></header>
        <section className="summary-grid">
          <article className="metric-card accent-green"><div className="metric-icon">$</div><p>Vendido hoy</p><strong>{money.format(totals.todaySales)}</strong><span>Acumulado del mes: <b>{money.format(totals.monthSales)}</b></span></article>
          <article className="metric-card accent-blue"><div className="metric-icon">□</div><p>Cajas vendidas hoy</p><strong>{number.format(totals.todayBoxes)}</strong><span>Acumulado del mes: <b>{number.format(totals.monthBoxes)}</b></span></article>
          <article className="metric-card accent-gold"><div className="metric-icon">!</div><p>Por facturar</p><strong>{money.format(totals.uninvoiced)}</strong><span>{salesRows.filter((row) => !row.invoiceNumber && !row.canceledAt).length} partidas sin factura</span></article>
          <article className="metric-card accent-earth"><div className="metric-icon">↗</div><p>Utilidad de hoy</p><strong>{money.format(totals.todayProfit)}</strong><span>Acumulado del mes: <b>{money.format(totals.monthProfit)}</b></span></article>
        </section>
        <section className="sales-panel">
          <div className="panel-heading"><div><h2>Registro de ventas</h2><p>Partidas importadas de “VENTAS NORWEST DIC 2025 - 2026”</p></div><span className="record-count">{filtered.length} {filtered.length === 1 ? "partida" : "partidas"}</span></div>
          <div className="filters"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, PO#, PU#, producto o factura" /></label>
            <details className="filter-multiselect"><summary>{statusFilters.includes("TODOS") ? "TODOS LOS ESTATUS" : statusFilters.length === 1 ? statusFilters[0] : `${statusFilters.length} ESTATUS`}</summary><div className="filter-options">{["TODOS", ...LOAD_STATUS_OPTIONS, "SIN FACTURA", "CANCELADAS"].map((option) => <label key={option}><input type="checkbox" checked={statusFilters.includes(option)} onChange={() => toggleFilter(option, "TODOS", statusFilters, setStatusFilters)} /><span>{option === "TODOS" ? "Todos los estatus" : option}</span></label>)}</div></details>
            <details className="filter-multiselect"><summary>{operationFilters.includes("TODAS") ? "TODAS LAS OPERACIONES" : operationFilters.length === 1 ? (operationFilters[0] === "DIRECT_RESALE" ? "COMPRA Y REVENTA" : "INVENTARIO IMPORTADO") : `${operationFilters.length} OPERACIONES`}</summary><div className="filter-options">{[["TODAS", "Todas las operaciones"], ["DIRECT_RESALE", "Compra y reventa"], ["IMPORTED_INVENTORY", "Inventario importado"]].map(([value, label]) => <label key={value}><input type="checkbox" checked={operationFilters.includes(value)} onChange={() => toggleFilter(value, "TODAS", operationFilters, setOperationFilters)} /><span>{label}</span></label>)}</div></details>
          </div>
          <div className="table-wrap"><table className="sales-table"><thead><tr><th>Fecha</th><th>Operación</th><th>Cliente</th><th>PO #</th><th>Pickup #</th><th>Bodega</th><th>Día de pickup</th><th>Producto</th><th className="numeric">Cajas</th><th className="numeric">Precio</th><th className="numeric">Total</th><th>Estatus</th><th>Factura</th><th>Editar</th></tr></thead>
            <tbody>{filtered.map((row, index) => { return <tr className={saleRowClass(row)} key={row.id ?? `${row.sourceRow}-${index}`}>
              <td className="date-cell">{formatDate(row.saleDate)}</td><td><span className={`operation-tag ${row.operationType === "IMPORTED_INVENTORY" ? "inventory" : "resale"}`}>{row.operationType === "IMPORTED_INVENTORY" ? "Inventario" : "Reventa"}</span></td>
              <td><strong>{row.customer}</strong></td><td>{row.purchaseOrder || "N/A"}</td><td><button type="button" className="pickup-number-button" onClick={() => openSocPreview(row)}>{row.pickupNumber}</button></td><td>{row.warehouse}</td><td className="date-cell"><input disabled={Boolean(row.canceledAt)} className="pickup-date-input" aria-label={`Cambiar día de pickup de ${row.customer}`} type="date" value={row.pickupDate || ""} onChange={(e) => void updatePickupDate(row, e.target.value)} />{row.pickupDate === localDateKey() && <small>Pickup hoy</small>}</td>
              <td>{productCell(row)}</td><td className="numeric">{number.format(row.boxes)}</td>
              <td className="numeric">{invoiceItemsFor(row).length > 1 ? <button type="button" className="multi-price-button" onClick={() => openProductDetail(row)}>Varios</button> : row.invoiceNumber ? <button type="button" className="multi-price-button" onClick={() => openProductDetail(row)}>{money.format(invoiceItemsFor(row)[0]?.unitPrice ?? row.salePrice ?? 0)}</button> : row.salePrice == null ? <span className="pending-text">Pend.</span> : money.format(row.salePrice)}</td><td className="numeric strong-number">{row.total == null ? "—" : money.format(row.total)}</td>
              <td>{row.canceledAt ? <div className="cancellation-status"><strong>Cancelada</strong><small>{row.canceledBy} · {row.cancellationReason}</small></div> : <div className="sale-status-cell"><select disabled={Boolean(row.invoiceNumber)} title={row.invoiceNumber ? "El estatus queda bloqueado al facturar" : undefined} className={`status-select ${statusClass(row.loadStatus)}`} aria-label={`Cambiar estatus de ${row.customer}`} value={currentStatusValue(row.loadStatus)} onChange={(event) => void changeLoadStatus(row, event.target.value as LoadStatus)}>{row.loadStatus && !LOAD_STATUS_OPTIONS.includes(row.loadStatus as LoadStatus) && <option value={row.loadStatus} disabled>{row.loadStatus} · anterior</option>}{LOAD_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>{row.loadStatus === "PAS" && <button type="button" disabled={Boolean(row.invoiceNumber)} className={`status-detail-button ${row.pasReviewDueDate && row.pasReviewDueDate <= localDateKey() ? "overdue" : ""}`} onClick={() => openStatusModal(row, "PAS")}>{row.pasReviewDueDate && row.pasReviewDueDate <= localDateKey() ? "Revisar PAS vencido" : `Revisar ${formatDate(row.pasReviewDueDate || null)}`}</button>}{row.loadStatus === "USDA REQUESTED" && (row.usdaInspectionStatus === "ATTACHED" && row.usdaInspectionFileName ? <a className="status-detail-button attached" href={`/api/usa/usda-inspections?saleId=${row.id}`} target="_blank" rel="noreferrer">Ver inspección</a> : <button type="button" className="status-detail-button overdue" onClick={() => openStatusModal(row, "USDA REQUESTED")}>Inspección pendiente</button>)}</div>}</td><td>{row.invoiceNumber ? <button type="button" className="invoice-number-button" onClick={() => openInvoicePreview(row)}><span className="invoice-chip invoice-ok">OK</span><small>{row.invoiceNumber}</small></button> : row.canceledAt ? <span className="muted">—</span> : <button type="button" className="invoice-button" onClick={() => openInvoicing(row)}>Facturar</button>}</td><td><div className="row-actions">{!row.invoiceNumber && !row.canceledAt ? <><button type="button" className="edit-button" onClick={() => openEditSale(row)}>Editar</button><button type="button" className="delete-button" onClick={() => openCancelSale(row)}>Eliminar</button></> : <span className="muted">—</span>}</div></td>
            </tr>; })}</tbody></table></div>
        </section>
      </section>}

      {section === "catalogs" && <section className="erp-content">
        <header className="topbar"><div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Catálogos</h1></div></header>
        <section className="catalog-summary">
          <button className={`catalog-type-card ${partnerTypeFilter === "SUPPLIER" ? "active" : ""}`} onClick={() => setPartnerTypeFilter("SUPPLIER")}><span className="catalog-icon">⇄</span><div><strong>Proveedores</strong><small>{partners.filter((partner) => partner.partnerType === "SUPPLIER").length} registrados</small></div></button>
          <button className={`catalog-type-card ${partnerTypeFilter === "CUSTOMER" ? "active" : ""}`} onClick={() => setPartnerTypeFilter("CUSTOMER")}><span className="catalog-icon customer">◎</span><div><strong>Clientes</strong><small>{partners.filter((partner) => partner.partnerType === "CUSTOMER").length} registrados</small></div></button>
          <button className={`catalog-type-card ${partnerTypeFilter === "WAREHOUSE" ? "active" : ""}`} onClick={() => setPartnerTypeFilter("WAREHOUSE")}><span className="catalog-icon warehouse">▣</span><div><strong>Bodegas</strong><small>{coldStorages.length} registradas</small></div></button>
          <button className={`catalog-type-card ${partnerTypeFilter === "PRODUCT" ? "active" : ""}`} onClick={() => setPartnerTypeFilter("PRODUCT")}><span className="catalog-icon product">▦</span><div><strong>Productos</strong><small>{products.length} registrados</small></div></button>
        </section>
        {partnerTypeFilter === "PRODUCT" ? <section className="sales-panel catalog-panel">
          <div className="panel-heading"><div><h2>Productos</h2><p>Productos, presentaciones, tamaños y etiquetas disponibles para ventas e inventario.</p></div><button className="primary-button" onClick={() => openProductForm("catalog")}>＋ Alta de producto</button></div>
          <div className="table-wrap catalog-table products-catalog-table"><table><thead><tr><th>Producto</th><th>Alias</th><th>Presentación</th><th>Tamaño</th><th>Etiqueta</th></tr></thead>
            <tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td><span className="product-alias-chip">{product.alias}</span></td><td>{product.presentation || "—"}</td><td>{product.size || "—"}</td><td>{product.label || "—"}</td></tr>)}</tbody></table></div>
          {products.length === 0 && <div className="catalog-empty"><strong>Aún no hay productos registrados</strong><span>Usa “Alta de producto” o agrega uno desde una venta.</span></div>}
        </section> : partnerTypeFilter === "WAREHOUSE" ? <section className="sales-panel catalog-panel">
          <div className="panel-heading"><div><h2>Bodegas</h2><p>Catálogo de bodegas de destino de la operación USA</p></div><button className="primary-button" onClick={() => openColdStorageForm("catalog")}>＋ Alta de bodega</button></div>
          <div className="table-wrap catalog-table"><table><thead><tr><th>Nombre</th><th>Dirección</th><th>Teléfono</th><th></th></tr></thead>
            <tbody>{coldStorages.map((coldStorage) => <tr key={coldStorage.id}><td><strong>{coldStorage.name}</strong></td><td>{coldStorage.address}</td><td>{coldStorage.phone}</td><td><button type="button" className="edit-button" onClick={() => openColdStorageForm("catalog", coldStorage)}>Editar</button></td></tr>)}</tbody></table></div>
          {coldStorages.length === 0 && <div className="catalog-empty"><strong>Aún no hay bodegas registradas</strong><span>Usa el botón de alta para crear el primer registro.</span></div>}
        </section> : <section className="sales-panel catalog-panel">
          <div className="panel-heading"><div><h2>{partnerTypeFilter === "SUPPLIER" ? "Proveedores" : "Clientes"}</h2><p>Catálogo exclusivo de la operación USA</p></div><button className="primary-button" onClick={() => void openPartnerForm(partnerTypeFilter)}>＋ Alta de {partnerTypeFilter === "SUPPLIER" ? "proveedor" : "cliente"}</button></div>
          <div className="table-wrap catalog-table"><table><thead><tr><th>Nombre</th><th>PACA #</th><th>TAX ID #</th><th>Blue Book #</th><th>DUNS & Bradstreet #</th><th>Dirección</th><th>{partnerTypeFilter === "SUPPLIER" ? "Contacto para pagos" : "Contacto para cobros"}</th><th></th></tr></thead>
            <tbody>{partners.filter((partner) => partner.partnerType === partnerTypeFilter).map((partner) => <tr key={partner.id}><td><strong>{partner.name}</strong></td><td>{partner.pacaNumber || "Pendiente"}</td><td>{partner.taxId || "Pendiente"}</td><td>{partner.blueBookNumber || "Pendiente"}</td><td>{partner.dunsNumber || "Pendiente"}</td><td><strong>{[partner.street, partner.exteriorNumber && `#${partner.exteriorNumber}`, partner.interiorNumber && `Int. ${partner.interiorNumber}`].filter(Boolean).join(" ") || "Pendiente"}</strong><small>{partner.city}, {partner.stateCode} {partner.postalCode}</small></td><td><strong>{partner.contactName}</strong><small>{partner.contactEmail} · {partner.contactPhone}</small></td><td><button type="button" className="edit-button" onClick={() => void editPartner(partner)}>Editar</button></td></tr>)}</tbody></table></div>
          {partners.filter((partner) => partner.partnerType === partnerTypeFilter).length === 0 && <div className="catalog-empty"><strong>Aún no hay {partnerTypeFilter === "SUPPLIER" ? "proveedores" : "clientes"} registrados</strong><span>Usa el botón de alta para crear el primer registro.</span></div>}
        </section>}
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
          <div className="table-wrap catalog-table"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Pickup #</th><th>Bodega</th><th>Producto</th><th className="numeric">Total</th><th></th></tr></thead><tbody>{salesRows.filter((row) => !row.invoiceNumber).map((row, index) => <tr className={invoiceSale?.id === row.id ? "selected-invoice-row" : ""} key={row.id ?? index}><td>{formatDate(row.saleDate)}</td><td><strong>{row.customer}</strong><small>PO# {row.purchaseOrder || "N/A"}</small></td><td>{row.pickupNumber}</td><td>{row.warehouse}</td><td>{row.product}</td><td className="numeric strong-number">{row.total == null ? "—" : money.format(row.total)}</td><td><button type="button" className="invoice-button" onClick={() => openInvoicePreparation(row)}>Preparar factura</button></td></tr>)}</tbody></table></div>
        </section>
      </section>}

      {section === "settings" && <section className="erp-content">
        <header className="topbar"><div><p className="eyebrow">Norwest Produce LLC · USA</p><h1>Configuración de la empresa</h1></div></header>
        <div className="settings-layout">
          <form className="sales-panel settings-card" onSubmit={saveCompanySettings}>
            <div className="panel-heading"><div><h2>Datos de Norwest Produce LLC</h2><p>Esta información se utilizará en documentos y registros del módulo USA.</p></div></div>
            <div className="settings-form-grid">
              <label className="span-2">Nombre legal *<input required value={companyForm.legalName} onChange={(e) => setCompanyForm({...companyForm, legalName:e.target.value})} /></label>
              <label className="span-2">Dirección / calle<input value={companyForm.street} onChange={(e) => setCompanyForm({...companyForm, street:e.target.value})} /></label>
              <label>Ciudad<input value={companyForm.city} onChange={(e) => setCompanyForm({...companyForm, city:e.target.value})} /></label><label>Estado<input value={companyForm.state} onChange={(e) => setCompanyForm({...companyForm, state:e.target.value})} /></label><label>ZIP Code<input value={companyForm.postalCode} onChange={(e) => setCompanyForm({...companyForm, postalCode:e.target.value})} /></label>
              <label>Blue Book #<input value={companyForm.blueBookNumber} onChange={(e) => setCompanyForm({...companyForm, blueBookNumber:e.target.value})} /></label><label>PACA #<input value={companyForm.pacaNumber} onChange={(e) => setCompanyForm({...companyForm, pacaNumber:e.target.value})} /></label><label>DUNS & Bradstreet #<input value={companyForm.dunsNumber} onChange={(e) => setCompanyForm({...companyForm, dunsNumber:e.target.value})} /></label><label>TAX ID #<input value={companyForm.taxId} onChange={(e) => setCompanyForm({...companyForm, taxId:e.target.value})} /></label>
              <label className="profit-setting">% de utilidad de Norwest<input required min="0" max="100" step="0.01" type="number" value={companyForm.norwestProfitPercentage} onChange={(e) => setCompanyForm({...companyForm, norwestProfitPercentage:e.target.value})} /><small>Se descuenta primero de la utilidad total. Valor inicial: 16%.</small></label>
            </div>
            {companySaveState && <p className="form-message settings-message">{companySaveState}</p>}<div className="settings-actions"><button type="submit" className="primary-button">Guardar configuración</button></div>
          </form>
          <section className="sales-panel settings-card">
            <div className="panel-heading"><div><h2>Usuarios y vendedores</h2><p>Alias, correo y permisos por usuario.</p></div><button type="button" className="primary-button" onClick={() => openUserForm()}>＋ Agregar usuario</button></div>
            <div className="table-wrap settings-users-table"><table><thead><tr><th>Nombre</th><th>Alias</th><th>Correo</th><th>Estatus</th><th>Permisos</th><th></th></tr></thead><tbody>{users.map((user) => { let permissionCount = 0; try { permissionCount = (JSON.parse(user.permissions) as string[]).length; } catch { permissionCount = 0; } return <tr key={user.id}><td><strong>{user.fullName}</strong></td><td>{user.alias}</td><td>{user.email}</td><td><span className={`status-tag ${user.active ? "ok" : "adjusted"}`}>{user.active ? "Activo" : "Inactivo"}</span></td><td>{permissionCount} autorizaciones</td><td><button type="button" className="edit-button" onClick={() => openUserForm(user)}>Editar</button></td></tr>; })}</tbody></table></div>
            {!users.length && <div className="catalog-empty"><strong>Aún no hay usuarios internos</strong><span>Agrega al primer usuario o vendedor para asignarlo a los clientes.</span></div>}
          </section>
        </div>
      </section>}

      {invoiceStep !== "closed" && invoiceSale && <div className="modal-backdrop invoice-workflow-backdrop">
        {invoiceStep === "pickup" && <section className="sale-modal invoice-gate-modal">
          <div className="modal-heading"><div><p className="eyebrow">Preparar factura</p><h2>¿El cliente ya recogió el producto?</h2><p className="modal-intro">Pickup #{invoiceSale.pickupNumber} · {invoiceSale.customer}</p></div></div>
          <div className="pickup-confirmation">
            <button type="button" className={`confirmation-choice ${pickedUp === true ? "selected" : ""}`} onClick={() => setPickedUp(true)}><strong>Sí, ya recogió</strong><small>Continuar para adjuntar el BOL de la bodega.</small></button>
            <button type="button" className={`confirmation-choice danger-choice ${pickedUp === false ? "selected" : ""}`} onClick={() => setPickedUp(false)}><strong>No, todavía no</strong><small>La venta permanecerá pendiente y no podrá facturarse.</small></button>
          </div>
          {pickedUp === false && <p className="blocking-notice">No se puede facturar hasta que el cliente recoja el producto y exista un BOL.</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeInvoicePreparation}>Cancelar</button><button type="button" className="primary-button" disabled={pickedUp !== true} onClick={() => setInvoiceStep("bol")}>Continuar</button></div>
        </section>}

        {invoiceStep === "bol" && <section className="sale-modal invoice-gate-modal">
          <div className="modal-heading"><div><button type="button" className="back-link" onClick={() => setInvoiceStep("pickup")}>← Regresar</button><p className="eyebrow">BOL obligatorio</p><h2>Adjunta el Bill of Lading</h2><p className="modal-intro">Debe ser el BOL emitido por la bodega. Sin este archivo la factura no puede generarse.</p></div></div>
          <label
            className={`bol-dropzone ${bolFile ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
            onDrop={(event) => { event.preventDefault(); selectBolFile(event.dataTransfer.files?.[0]); }}
          >
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => selectBolFile(event.target.files?.[0])} />
            <span className="bol-icon">⇧</span>
            <strong>{bolFile ? bolFile.name : "Arrastra o selecciona archivo BOL"}</strong>
            <small>{bolFile ? `${(bolFile.size / 1024 / 1024).toFixed(2)} MB · Archivo listo` : "PDF, JPG, PNG o WEBP · máximo 10 MB"}</small>
          </label>
          {invoiceSaveState && invoiceStep === "bol" && <p className="form-message">{invoiceSaveState}</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeInvoicePreparation}>Cancelar</button><button type="button" className="primary-button" disabled={!bolFile || bolFile.size > 10 * 1024 * 1024} onClick={() => setInvoiceStep("items")}>Adjuntar y continuar</button></div>
        </section>}

        {invoiceStep === "items" && <form className="sale-modal invoice-items-modal" onSubmit={issueInvoice}>
          <div className="modal-heading"><div><button type="button" className="back-link" onClick={() => setInvoiceStep("bol")}>← Cambiar BOL</button><p className="eyebrow">Revisión final</p><h2>Partidas de la factura</h2><p className="modal-intro">Modifica cantidades o precios y agrega o elimina productos según lo que realmente se entregó.</p></div><span className="bol-attached-chip">✓ BOL: {bolFile?.name}</span></div>
          <datalist id="invoice-products">{products.map((product) => <option key={product.id} value={product.name} />)}</datalist>
          <div className="invoice-edit-table"><div className="invoice-edit-head"><span>Producto</span><span>Presentación</span><span>Tamaño</span><span>Etiqueta</span><span>Cantidad</span><span>Precio</span><span></span></div>{invoiceItems.map((item, index) => <div className="invoice-edit-row" key={index}>
            <input required list="invoice-products" aria-label="Producto" value={item.product} onChange={(event) => { const product = products.find((entry) => entry.name === event.target.value); updateInvoiceItem(index, product ? { product: product.name, presentation: product.presentation || "", size: product.size || "", label: product.label || "" } : { product: event.target.value }); }} />
            <input aria-label="Presentación" value={item.presentation} onChange={(event) => updateInvoiceItem(index, { presentation: event.target.value })} /><input aria-label="Tamaño" value={item.size} onChange={(event) => updateInvoiceItem(index, { size: event.target.value })} /><input aria-label="Etiqueta" value={item.label} onChange={(event) => updateInvoiceItem(index, { label: event.target.value })} />
            <input required min="1" step="1" type="number" aria-label="Cantidad" value={item.quantity} onChange={(event) => updateInvoiceItem(index, { quantity: Number(event.target.value) })} /><input required min="0" step="0.01" type="number" aria-label="Precio" value={item.unitPrice} onChange={(event) => updateInvoiceItem(index, { unitPrice: Number(event.target.value) })} />
            <button type="button" aria-label="Eliminar partida" disabled={invoiceItems.length === 1} onClick={() => setInvoiceItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
          </div>)}</div>
          <button type="button" className="add-expense-button invoice-add-item" onClick={() => setInvoiceItems((current) => [...current, { product: "", presentation: "", size: "", label: "", quantity: 1, unitPrice: 0 }])}>＋ Agregar producto</button>
          <div className="invoice-editor-total"><span>Total de factura</span><strong>{money.format(invoiceItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0))}</strong></div>
          {invoiceSaveState && <p className="form-message">{invoiceSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeInvoicePreparation}>Cancelar</button><button type="submit" className="primary-button">Generar factura</button></div>
        </form>}
      </div>}

      {partnerModal && <div className={`modal-backdrop ${partnerTarget ? "modal-backdrop-elevated" : ""}`}><form className="sale-modal partner-modal" onSubmit={savePartner}>
        <div className="modal-heading"><div><p className="eyebrow">Catálogo USA</p><h2>{editingPartnerId ? "Editar" : "Alta de"} {partnerModal === "SUPPLIER" ? "proveedor" : "cliente"}</h2><p className="modal-intro">Los campos marcados con * son obligatorios. Los demás pueden agregarse o modificarse después.</p></div></div>
        {!editingPartnerId && <label className="dual-role-check"><input type="checkbox" checked={alsoOppositeType} onChange={(e) => setAlsoOppositeType(e.target.checked)} /><span><strong>{partnerModal === "SUPPLIER" ? "También es cliente" : "También es proveedor"}</strong><small>Al guardar, la empresa se agregará automáticamente en ambos catálogos.</small></span></label>}
        <section className="form-section partner-section"><div className="form-section-heading"><span>1</span><div><h3>Información fiscal y comercial</h3></div></div><div className="form-grid partner-grid">
          <label className="span-2">Nombre *<input required value={partnerForm.name} onChange={(e) => setPartnerForm({...partnerForm, name:e.target.value})} /></label><label>PACA #<input value={partnerForm.pacaNumber} onChange={(e) => setPartnerForm({...partnerForm, pacaNumber:e.target.value})} /></label><label>TAX ID #<input value={partnerForm.taxId} onChange={(e) => setPartnerForm({...partnerForm, taxId:e.target.value})} /></label><label>BLUE BOOK #<input value={partnerForm.blueBookNumber} onChange={(e) => setPartnerForm({...partnerForm, blueBookNumber:e.target.value})} /></label><label>DUNS and BRADSTREET #<input value={partnerForm.dunsNumber} onChange={(e) => setPartnerForm({...partnerForm, dunsNumber:e.target.value})} /></label>{(partnerModal === "CUSTOMER" || alsoOppositeType) && <><label>Vendedor *<select required value={partnerForm.assignedSeller} onChange={(e) => setPartnerForm({...partnerForm, assignedSeller:e.target.value})}><option value="">Selecciona un vendedor</option>{users.filter((user) => user.active).map((user) => <option key={user.id} value={user.fullName}>{user.fullName}</option>)}</select></label><label className="client-profit-field">% de utilidad del cliente<input min="0" max="100" step="0.01" type="number" value={partnerForm.profitPercentage} onChange={(e) => setPartnerForm({...partnerForm, profitPercentage:e.target.value})} /><small>Se aplica sobre la utilidad restante después de descontar primero el {Number(companyForm.norwestProfitPercentage || 16)}% de Norwest.</small></label></>}
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
          <div className="modal-heading"><div>{!editingSale && <button type="button" className="back-link" onClick={() => setModalStep("choose")}>← Cambiar tipo</button>}<p className="eyebrow">{form.operationType === "DIRECT_RESALE" ? "Compra y reventa" : "Inventario importado"}</p><h2>{editingSale ? "Editar venta" : "Nueva venta"}</h2>{editingSale && <p className="modal-intro">Modifica los datos de la venta y guarda los cambios.</p>}</div></div>

          {form.operationType === "DIRECT_RESALE" ? <>
            <section className="form-section purchase-section"><div className="form-section-heading"><span>1</span><div><h3>Información de la compra</h3><p>Datos del proveedor y del producto adquirido.</p></div></div>
              <div className="form-grid purchase-header-fields"><label>Proveedor / a quién se compró<select required value={form.supplier} onChange={(e) => e.target.value === "__new__" ? void openPartnerForm("SUPPLIER", "saleSupplier") : setForm({...form, supplier:e.target.value})}><option value="">Selecciona un proveedor</option>{partners.filter((partner) => partner.partnerType === "SUPPLIER").map((partner) => <option key={partner.id} value={partner.name}>{partner.name}</option>)}<option value="__new__">＋ Agregar nuevo proveedor</option></select></label><label>PU# de compra<input required value={form.pickupNumber} onChange={(e) => setForm({...form, pickupNumber:e.target.value})} placeholder="Número de pickup" /></label></div>
              <div className="sale-lines-heading"><div><strong>Productos de la venta</strong><small>Puedes agregar el mismo producto con distintas presentaciones, tamaños o etiquetas.</small></div><button type="button" className="add-expense-button" onClick={() => addSaleLineItem()}>＋ Agregar producto</button></div>
              <div className="sale-lines">{saleLineItems.map((item, index) => { const productNames = Array.from(new Set(products.map((product) => product.name))).sort((a, b) => a.localeCompare(b)); return <article key={`${index}-${item.product}-${item.presentation}-${item.size}-${item.label}`}>
                <label><span>Producto</span><select required value={item.product} onChange={(event) => changeSaleLineProduct(index, event.target.value)}><option value="">Selecciona producto</option>{productNames.map((name) => <option key={name} value={name}>{name}</option>)}<option value="__new__">＋ Agregar nuevo producto</option></select></label>
                {(["presentation", "size", "label"] as const).map((field) => { const labels = { presentation: "Presentación", size: "Tamaño", label: "Etiqueta" }; return <label key={field}><span>{labels[field]}</span><select value={item[field]} disabled={!item.product} onChange={(event) => changeSaleLineCatalogValue(index, field, event.target.value)}><option value="">Sin {labels[field].toLocaleLowerCase()}</option>{saleLineCatalogValues(item.product, field).map((value) => <option key={value} value={value}>{value}</option>)}<option value="__new__">＋ Agregar nuevo</option></select></label>; })}
                <label><span>Bultos / cajas</span><input required min="1" step="1" type="number" value={item.quantity} onChange={(event) => updateSaleLineItem(index, { quantity: Number(event.target.value) })} /></label>
                <label><span>Precio compra</span><input required min="0" step="0.01" type="number" value={item.purchasePrice ?? 0} onChange={(event) => updateSaleLineItem(index, { purchasePrice: Number(event.target.value) })} /></label>
                <label><span>Precio venta</span><input required min="0" step="0.01" type="number" value={item.unitPrice} onChange={(event) => updateSaleLineItem(index, { unitPrice: Number(event.target.value) })} /></label>
                <div className="sale-line-total"><span>Total</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>
                <button type="button" className="sale-line-remove" aria-label={`Eliminar ${item.product}`} onClick={() => setSaleLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
              </article>; })}</div>
              {!saleLineItems.length && <div className="sale-lines-empty">Agrega el primer producto para continuar.</div>}
            </section>
          </> : <section className="form-section inventory-section"><div className="form-section-heading"><span>1</span><div><h3>Selecciona del inventario</h3><p>Solo aparecen partidas con cajas disponibles.</p></div></div>
            {inventoryLoading ? <div className="inventory-empty">Consultando inventario…</div> : inventory.length === 0 ? <div className="inventory-empty"><strong>No hay inventario importado disponible</strong><span>Cuando se registren entradas de importación, aparecerán aquí para poder venderlas.</span></div> : <div className="inventory-list">{inventory.filter((lot) => lot.availableBoxes > 0 || lot.id === editingSale?.inventoryLotId).map((lot) => { const available = lot.availableBoxes + (editingSale?.inventoryLotId === lot.id ? editingSale.boxes : 0); return <button key={lot.id} type="button" className={`inventory-row ${form.inventoryLotId === String(lot.id) ? "selected" : ""}`} onClick={() => selectInventoryLot(lot)}><span className="inventory-radio"/><span><strong>{lot.product}</strong><small>{[lot.presentation, lot.size, lot.label].filter(Boolean).join(" · ") || "Sin detalle"}</small></span><span><strong>{lot.warehouse}</strong><small>Recibido {formatDate(lot.receivedDate)}</small></span><span className="inventory-boxes"><strong>{number.format(available)}</strong><small>cajas disponibles</small></span></button>; })}</div>}
          </section>}

          {(form.operationType === "DIRECT_RESALE" || selectedLot) && <section className="form-section sale-section"><div className="form-section-heading"><span>2</span><div><h3>Información de la venta</h3><p>Datos del cliente, entrega y precio de venta.</p></div></div>
            <div className="form-grid"><label>Fecha de venta<input required type="date" value={form.saleDate} onChange={(e) => setForm({...form, saleDate:e.target.value})} /></label><label>Cliente / a quién se vendió<select required value={form.customer} onChange={(e) => { if (e.target.value === "__new__") return void openPartnerForm("CUSTOMER", "saleCustomer"); const customer = partners.find((partner) => partner.partnerType === "CUSTOMER" && partner.name === e.target.value); setForm({...form, customer:e.target.value, sellerName:customer?.assignedSeller || ""}); }}><option value="">Selecciona un cliente</option>{partners.filter((partner) => partner.partnerType === "CUSTOMER").map((partner) => <option key={partner.id} value={partner.name}>{partner.name}</option>)}<option value="__new__">＋ Agregar nuevo cliente</option></select></label><label>Vendedor<input readOnly value={form.sellerName} placeholder="Asignado desde el cliente" /></label><label>PO# del cliente<input value={form.purchaseOrder} onChange={(e) => setForm({...form, purchaseOrder:e.target.value})} /></label><label>Bodega Destino<select required value={selectedSaleWarehouse?.id || (form.warehouse ? `legacy:${form.warehouse}` : "")} onChange={(e) => chooseSaleWarehouse(e.target.value)}><option value="">Selecciona una bodega</option>{coldStorages.map((item) => <option key={`catalog:${item.id}`} value={item.id}>{item.name}</option>)}{registeredSaleWarehouses.map((name) => <option key={`legacy:${name}`} value={`legacy:${name}`}>{name}</option>)}{form.warehouse && !selectedSaleWarehouse && !registeredSaleWarehouses.includes(form.warehouse) && <option value={`legacy:${form.warehouse}`}>{form.warehouse}</option>}<option value="__new__">＋ Agregar bodega</option></select>{selectedSaleWarehouse && <small className="field-help">{selectedSaleWarehouse.address} · {selectedSaleWarehouse.phone}</small>}</label>{form.operationType === "IMPORTED_INVENTORY" && <><label>Cajas<input required min="1" max={selectedLotAvailable} type="number" value={form.boxes} onChange={(e) => setForm({...form, boxes:e.target.value})} /></label><label>Precio de venta<input required min="0" step="0.01" type="number" value={form.salePrice} onChange={(e) => setForm({...form, salePrice:e.target.value})} /></label></>}<label>Día de pickup<input type="date" value={form.pickupDate} onChange={(e) => setForm({...form, pickupDate:e.target.value})} /></label></div>
          </section>}
          <div className="form-total"><span>Total calculado</span><strong>{form.operationType === "DIRECT_RESALE" ? money.format(saleLineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)) : form.boxes && form.salePrice ? money.format(Number(form.boxes) * Number(form.salePrice)) : "$0.00"}</strong></div>
          {saveState && <p className="form-message">{saveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button><button className="primary-button" type="submit" disabled={form.operationType === "IMPORTED_INVENTORY" && !selectedLot}>{editingSale ? "Guardar cambios" : "Guardar venta"}</button></div>
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
        <div className="modal-heading"><div><p className="eyebrow">Catálogo USA</p><h2>{editingColdStorageId ? "Editar" : "Agregar"} bodega</h2><p className="modal-intro">{coldStorageTarget === "catalog" ? "Los cambios se reflejarán en los selectores de bodega del sistema." : `Al guardarla regresarás a ${coldStorageTarget === "sale" ? "la venta" : "la entrada de inventario"} con esta bodega seleccionada.`}</p></div></div>
        <section className="form-section"><div className="form-grid"><label>Nombre de la bodega *<input required value={coldStorageForm.name} onChange={(e) => setColdStorageForm({...coldStorageForm, name:e.target.value})} /></label><label className="span-2">Dirección *<input required value={coldStorageForm.address} onChange={(e) => setColdStorageForm({...coldStorageForm, address:e.target.value})} /></label><label>Teléfono *<input required type="tel" inputMode="numeric" minLength={10} maxLength={10} pattern="[0-9]{10}" placeholder="10 dígitos" value={coldStorageForm.phone} onChange={(e) => setColdStorageForm({...coldStorageForm, phone:e.target.value.replace(/\D/g, "").slice(0, 10)})} /></label></div></section>
        {coldStorageSaveState && <p className="form-message">{coldStorageSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setColdStorageModal(false)}>Cancelar</button><button type="submit" className="primary-button">{editingColdStorageId ? "Guardar cambios" : "Registrar bodega"}</button></div>
      </form></div>}

      {productModal && <div className="modal-backdrop modal-backdrop-elevated"><form className="sale-modal product-modal" onSubmit={saveProduct}>
        <div className="modal-heading"><div><p className="eyebrow">Catálogo USA</p><h2>Agregar nuevo producto</h2><p className="modal-intro">{productTarget === "catalog" ? "El producto quedará disponible para ventas e inventario." : "Al guardarlo regresarás a la captura anterior con el producto seleccionado."}</p></div></div>
        <section className="form-section"><div className="form-grid"><label>Producto *<input required value={productForm.name} onChange={(e) => setProductForm({...productForm, name:e.target.value})} /></label><label>Alias *<input required maxLength={3} pattern="[A-Za-z]{1,3}" title="De 1 a 3 letras" value={productForm.alias} onChange={(e) => setProductForm({...productForm, alias:e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3)})} placeholder="Máx. 3 letras" /></label><label>Presentación<input value={productForm.presentation} onChange={(e) => setProductForm({...productForm, presentation:e.target.value})} placeholder="Ej. caja 25 lb" /></label><label>Tamaño<input value={productForm.size} onChange={(e) => setProductForm({...productForm, size:e.target.value})} /></label><label>Etiqueta<input value={productForm.label} onChange={(e) => setProductForm({...productForm, label:e.target.value})} /></label></div></section>
        {productSaveState && <p className="form-message">{productSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setProductModal(false); setProductTarget(null); setProductTargetLine(null); }}>Cancelar</button><button type="submit" className="primary-button">Registrar producto</button></div>
      </form></div>}

      {userModal && <div className="modal-backdrop modal-backdrop-elevated"><form className="sale-modal user-modal" onSubmit={saveUser}>
        <div className="modal-heading"><div><p className="eyebrow">Configuración USA</p><h2>{editingUserId ? "Editar usuario" : "Agregar usuario"}</h2><p className="modal-intro">Define sus datos y lo que podrá consultar o modificar.</p></div></div>
        <section className="form-section"><div className="form-grid"><label>Nombre completo *<input required value={userForm.fullName} onChange={(e) => setUserForm({...userForm, fullName:e.target.value})} /></label><label>Alias *<input required value={userForm.alias} onChange={(e) => setUserForm({...userForm, alias:e.target.value})} /></label><label>Correo *<input required type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email:e.target.value})} /></label>{editingUserId ? <><label>Contraseña actual<div className="password-input"><input minLength={8} type={visibleUserPasswords.current ? "text" : "password"} autoComplete="current-password" value={userForm.currentPassword} onChange={(e) => setUserForm({...userForm, currentPassword:e.target.value})} placeholder="Necesaria para cambiarla" /><button type="button" className={visibleUserPasswords.current ? "is-visible" : ""} aria-label={visibleUserPasswords.current ? "Ocultar contraseña actual" : "Mostrar contraseña actual"} aria-pressed={visibleUserPasswords.current} onClick={() => setVisibleUserPasswords((current) => ({...current, current:!current.current}))}>👁</button></div></label><label>Nueva contraseña<div className="password-input"><input minLength={8} type={visibleUserPasswords.next ? "text" : "password"} autoComplete="new-password" value={userForm.newPassword} onChange={(e) => setUserForm({...userForm, newPassword:e.target.value})} placeholder="Mínimo 8 caracteres" /><button type="button" className={visibleUserPasswords.next ? "is-visible" : ""} aria-label={visibleUserPasswords.next ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"} aria-pressed={visibleUserPasswords.next} onClick={() => setVisibleUserPasswords((current) => ({...current, next:!current.next}))}>👁</button></div></label><label>Confirmar nueva contraseña<div className="password-input"><input minLength={8} type={visibleUserPasswords.confirm ? "text" : "password"} autoComplete="new-password" value={userForm.confirmNewPassword} onChange={(e) => setUserForm({...userForm, confirmNewPassword:e.target.value})} placeholder="Repite la nueva contraseña" /><button type="button" className={visibleUserPasswords.confirm ? "is-visible" : ""} aria-label={visibleUserPasswords.confirm ? "Ocultar confirmación" : "Mostrar confirmación"} aria-pressed={visibleUserPasswords.confirm} onClick={() => setVisibleUserPasswords((current) => ({...current, confirm:!current.confirm}))}>👁</button></div></label></> : <label>Contraseña *<div className="password-input"><input required minLength={8} type={visibleUserPasswords.password ? "text" : "password"} autoComplete="new-password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password:e.target.value})} placeholder="Mínimo 8 caracteres" /><button type="button" className={visibleUserPasswords.password ? "is-visible" : ""} aria-label={visibleUserPasswords.password ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visibleUserPasswords.password} onClick={() => setVisibleUserPasswords((current) => ({...current, password:!current.password}))}>👁</button></div></label>}<label className="user-active-check"><input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm({...userForm, active:e.target.checked})} /> Usuario activo</label></div>{editingUserId && <p className="password-change-help">Para conservar la contraseña actual, deja vacíos los tres campos de contraseña.</p>}</section>
        <section className="form-section"><div className="form-section-heading"><span>✓</span><div><h3>Permisos del usuario</h3><p>Autoriza individualmente cada área.</p></div></div><div className="permissions-grid">{PERMISSION_OPTIONS.map(([key, label]) => <label key={key}><input type="checkbox" checked={userForm.permissions.includes(key)} onChange={(e) => setUserForm({...userForm, permissions:e.target.checked ? [...userForm.permissions, key] : userForm.permissions.filter((item) => item !== key)})} /><span>{label}</span></label>)}</div></section>
        {userSaveState && <p className="form-message">{userSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setUserModal(false)}>Cancelar</button><button type="submit" className="primary-button">{editingUserId ? "Guardar cambios" : "Crear usuario"}</button></div>
      </form></div>}

      {statusModalSale && statusModalType === "PAS" && <div className="modal-backdrop modal-backdrop-elevated"><form className="sale-modal status-modal" onSubmit={savePasStatus}>
        <div className="modal-heading"><div><p className="eyebrow">Estatus · PAS</p><h2>{statusModalSale.loadStatus === "PAS" ? "Revisar plazo abierto" : "Price After Sale"}</h2><p className="modal-intro">Pickup #{statusModalSale.pickupNumber} · {statusModalSale.customer}</p></div></div>
        {statusModalSale.loadStatus === "PAS" && statusModalSale.pasReviewDueDate && <div className={`pas-current-term ${statusModalSale.pasReviewDueDate <= localDateKey() ? "expired" : ""}`}><span>Plazo actual</span><strong>{statusModalSale.pasReviewDueDate <= localDateKey() ? "Vencido" : "Abierto"} hasta {formatDate(statusModalSale.pasReviewDueDate)}</strong></div>}
        <section className="form-section"><label>¿Cuántos días quedará abierto el precio? *<input autoFocus required min="1" max="365" step="1" type="number" value={pasDays} onChange={(event) => setPasDays(event.target.value)} placeholder="Ej. 3" /></label><p className="field-help">Al vencer, el sistema mostrará una notificación para revisar el acuerdo o conceder más días.</p></section>
        {statusSaveState && <p className="form-message">{statusSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeStatusModal}>Cancelar</button><button type="submit" className="primary-button">{statusModalSale.loadStatus === "PAS" ? "Dar nuevos días" : "Guardar PAS"}</button></div>
      </form></div>}

      {statusModalSale && statusModalType === "USDA REQUESTED" && <div className="modal-backdrop modal-backdrop-elevated"><section className="sale-modal status-modal">
        <div className="modal-heading"><div><p className="eyebrow">Estatus · USDA Requested</p><h2>Inspección USDA</h2><p className="modal-intro">Pickup #{statusModalSale.pickupNumber} · {statusModalSale.customer}</p></div></div>
        <section className="form-section"><div className="usda-explanation"><strong>Adjunta la inspección si ya la recibiste.</strong><span>Si los inspectores todavía no han acudido o el documento tarda en llegar, puedes guardar el estatus como pendiente y agregarlo después.</span></div><label className={`document-drop-zone ${usdaFile ? "has-file" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectUsdaFile(event.dataTransfer.files[0]); }}><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => selectUsdaFile(event.target.files?.[0])} /><span>{usdaFile ? "✓" : "⇧"}</span><strong>{usdaFile ? usdaFile.name : "Arrastra o selecciona la inspección USDA"}</strong><small>PDF, JPG, PNG o WEBP · Máximo 10 MB</small></label></section>
        {statusSaveState && <p className="form-message">{statusSaveState}</p>}<div className="modal-actions status-modal-actions"><button type="button" className="secondary-button" onClick={closeStatusModal}>Cancelar</button><button type="button" className="secondary-button" onClick={() => void saveUsdaStatus(true)}>Aún no la tengo</button><button type="button" className="primary-button" disabled={!usdaFile} onClick={() => void saveUsdaStatus(false)}>Guardar inspección</button></div>
      </section></div>}

      {productDetailSale && <div className="modal-backdrop modal-backdrop-elevated"><section className="sale-modal product-detail-modal">
        <div className="modal-heading"><div><p className="eyebrow">Detalle de la carga</p><h2>Productos · Pickup #{productDetailSale.pickupNumber}</h2><p className="modal-intro">{productDetailSale.customer}</p></div></div>
        {productDetailSale.canceledAt && <div className="canceled-record-notice"><strong>Venta cancelada</strong><span>{productDetailSale.canceledBy} · {productDetailSale.cancellationReason}</span></div>}
        {productDetailSale.invoiceNumber && <div className="locked-detail-notice"><strong>Factura emitida · sólo consulta</strong><span>Para cambiar productos, bultos/cajas o precios, utiliza Crear ajuste desde la vista de la factura.</span></div>}
        <div className="product-detail-list">{productDetailItems.map((item, index) => <article key={`${item.product}-${index}`}><span className="product-alias-chip">{productAlias(item.product)}</span><div><strong>{item.product}</strong><small>{[item.presentation, item.size, item.label].filter(Boolean).join(" · ") || "Sin presentación especificada"}</small></div><div className="product-detail-edit"><label><span>Bultos / cajas</span><input disabled={Boolean(productDetailSale.canceledAt || productDetailSale.invoiceNumber)} min="1" step="1" type="number" value={item.quantity} onChange={(event) => updateProductDetailItem(index, { quantity: Number(event.target.value) })} /></label><label><span>Precio</span><input disabled={Boolean(productDetailSale.canceledAt || productDetailSale.invoiceNumber)} min="0" step="0.01" type="number" value={item.unitPrice} onChange={(event) => updateProductDetailItem(index, { unitPrice: Number(event.target.value) })} /></label><div><span>Total</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div></div></article>)}</div>
        <div className="product-detail-summary"><span>Total de bultos/cajas: <strong>{number.format(productDetailItems.reduce((sum, item) => sum + item.quantity, 0))}</strong></span><span>Total de la carga: <strong>{money.format(productDetailItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</strong></span></div>
        {productDetailSaveState && <p className="form-message">{productDetailSaveState}</p>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeProductDetail}>{productDetailSale.canceledAt || productDetailSale.invoiceNumber ? "Cerrar" : "Cancelar"}</button>{!productDetailSale.canceledAt && !productDetailSale.invoiceNumber && <button type="button" className="primary-button" onClick={() => void saveProductDetail()}>Guardar cambios</button>}</div>
      </section></div>}

      {cancelSale && <div className="modal-backdrop modal-backdrop-elevated"><form className="sale-modal cancellation-modal" onSubmit={confirmCancelSale}>
        <div className="modal-heading"><div><p className="eyebrow">Conservar historial</p><h2>Eliminar / cancelar venta</h2><p className="modal-intro">La venta y su Sales Order no desaparecerán. Quedarán marcados como cancelados con el motivo registrado.</p></div></div>
        <section className="form-section"><div className="cancellation-sale-summary"><strong>{cancelSale.customer}</strong><span>Pickup #{cancelSale.pickupNumber}</span><span>{number.format(cancelSale.boxes)} bultos/cajas</span></div><div className="form-grid">
          <label>¿Quién canceló? *<select required value={cancelParty} onChange={(event) => { const party = event.target.value as "CLIENTE CANCELÓ" | "NW CANCELÓ"; setCancelParty(party); setCancelReason(party === "CLIENTE CANCELÓ" ? "Sin Razón" : "Producto no disponible"); }}><option>CLIENTE CANCELÓ</option><option>NW CANCELÓ</option></select></label>
          <label>Razón *<select required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)}>{(cancelParty === "CLIENTE CANCELÓ" ? customerCancellationReasons : nwCancellationReasons).map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label>
        </div></section>
        {cancelSaveState && <p className="form-message">{cancelSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCancelSale(null)}>Regresar</button><button type="submit" className="danger-button">Confirmar cancelación</button></div>
      </form></div>}

      {adjustmentSale && <div className="modal-backdrop adjustment-modal-backdrop"><form className="sale-modal sale-modal-wide adjustment-modal" onSubmit={saveInvoiceAdjustment}>
        <div className="modal-heading"><div><p className="eyebrow">Ajuste posterior a facturación</p><h2>Factura {adjustmentSale.invoiceNumber}</h2><p className="modal-intro">La factura original permanecerá intacta. El sistema generará una nota ligada a ella por la diferencia.</p></div></div>
        <section className="form-section adjustment-reason-section"><div className="form-grid"><label>Motivo<select value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value as InvoiceAdjustment["reason"])}><option>CAMBIO DE PRECIO</option><option>RECHAZO PARCIAL</option><option>PRODUCTO ELIMINADO</option><option>CARGA POR ERROR</option><option>OTRO</option></select></label><label className="span-2">Descripción del ajuste<input required value={adjustmentNotes} onChange={(event) => setAdjustmentNotes(event.target.value)} placeholder="Ej. Rechazo parcial por calidad; se acreditan 25 cajas" /></label></div></section>
        <div className="adjustment-items">{adjustmentItems.map((item, index) => <article key={`${item.product}-${index}`}><label><span>Producto</span><select value={item.product} onChange={(event) => setAdjustmentItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, product: event.target.value } : row))}><option value={item.product}>{item.product}</option>{products.filter((product) => product.name !== item.product).map((product) => <option key={product.id} value={product.name}>{product.name}</option>)}</select></label><label><span>Bultos / cajas</span><input min="1" step="1" type="number" value={item.quantity} onChange={(event) => setAdjustmentItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) } : row))} /></label><label><span>Precio</span><input min="0" step="0.01" type="number" value={item.unitPrice} onChange={(event) => setAdjustmentItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: Number(event.target.value) } : row))} /></label><strong>{money.format(item.quantity * item.unitPrice)}</strong><button type="button" aria-label={`Eliminar ${item.product}`} onClick={() => setAdjustmentItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}>×</button></article>)}</div>
        <button type="button" className="secondary-button add-adjustment-item" onClick={() => setAdjustmentItems((current) => [...current, { product: products[0]?.name || "Producto", presentation: products[0]?.presentation || "", size: products[0]?.size || "", label: products[0]?.label || "", quantity: 1, unitPrice: 0 }])}>＋ Agregar producto</button>
        <div className="adjustment-summary"><span>Total vigente <strong>{money.format(invoiceItemsFor(adjustmentSale).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</strong></span><span>Nuevo total <strong>{money.format(adjustmentItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</strong></span><span>Diferencia <strong>{money.format(adjustmentItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - invoiceItemsFor(adjustmentSale).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</strong></span></div>
        {adjustmentSaveState && <p className="form-message">{adjustmentSaveState}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeInvoiceAdjustment}>Cancelar</button><button type="submit" className="primary-button">Generar ajuste</button></div>
      </form></div>}

      {invoicePreview && !adjustmentPreview && <div className="modal-backdrop invoice-preview-backdrop"><section className="sale-modal invoice-preview-modal">
        <div className="invoice-toolbar"><div><p className="eyebrow">Vista previa</p><h2>Factura {invoicePreview.invoiceNumber}</h2></div><div><button type="button" className="secondary-button" onClick={() => openInvoiceAdjustment(invoicePreview)}>Crear ajuste</button><button type="button" className="secondary-button" onClick={() => setInvoicePreview(null)}>Cerrar</button><button type="button" className="primary-button" onClick={() => window.print()}>Imprimir PDF</button></div></div>
        {invoicePreview.canceledAt && <div className="canceled-record-notice"><strong>Venta cancelada</strong><span>{invoicePreview.canceledBy} · {invoicePreview.cancellationReason}</span></div>}{adjustmentsFor(invoicePreview).length > 0 && <div className="invoice-adjustment-history"><strong>Ajustes registrados</strong>{adjustmentsFor(invoicePreview).map((adjustment) => <article key={adjustment.number}><div><b>{adjustment.number}</b><span>{new Date(adjustment.createdAt).toLocaleString("es-MX")} · {adjustment.documentType}</span></div><p><strong>{adjustment.reason}</strong> · {adjustment.notes}</p><ul>{adjustmentChanges(adjustment).map((change) => <li key={change}>{change}</li>)}</ul><button type="button" onClick={() => setAdjustmentPreview({ sale: invoicePreview, adjustment })}>Ver / imprimir ajuste</button></article>)}</div>}
        <article className="print-document commercial-document invoice-document">
          <div className="document-top"><div className="document-company"><img src="/norwest-logo.jpg" alt="Norwest Produce" width="390" height="142" /><div><strong>{companyForm.legalName}</strong><span>{companyForm.street}</span><span>{[companyForm.city, companyForm.state, companyForm.postalCode].filter(Boolean).join(", ")}</span></div></div><div className="document-title-block"><h3><span>INVOICE:</span><b>{invoicePreview.invoiceNumber}</b></h3><dl><dt>ISSUED:</dt><dd>{formatDocumentDate(invoicePreview.saleDate)}</dd><dt>P.O. #:</dt><dd>{invoicePreview.purchaseOrder || "N/A"}</dd><dt>PICKUP #:</dt><dd>{invoicePreview.pickupNumber}</dd><dt>PICKUP DATE:</dt><dd>{formatDocumentDate(invoicePreview.pickupDate)}</dd><dt>CREDIT TERMS:</dt><dd>21 Days</dd><dt>DUE DATE:</dt><dd>{formatDocumentDate(invoicePreview.dueDate)}</dd></dl></div></div>
          <div className="document-parties two-columns"><section><h4>BILL TO:</h4><strong>{invoicePreview.customer}</strong>{partnerAddress(documentCustomer).map((line) => <span key={line}>{line}</span>)}</section><section><h4>SHIP TO:</h4><strong>{invoicePreview.warehouse}</strong>{documentWarehouse ? <><span>{documentWarehouse.address}</span><span>PH: {documentWarehouse.phone}</span></> : <span>Pickup destination</span>}</section></div>
          <table className="document-items"><thead><tr><th>Description</th><th>Size</th><th>Label</th><th>Unit</th><th className="numeric">Qty</th><th className="numeric">Unit Price</th><th className="numeric">Total</th></tr></thead><tbody>{documentItems.map((item, index) => <tr key={index}><td>{item.product}</td><td>{item.size || "—"}</td><td>{item.label || "—"}</td><td>{item.presentation || "—"}</td><td className="numeric">{number.format(item.quantity)}</td><td className="numeric">{money.format(item.unitPrice)}</td><td className="numeric">{money.format(item.quantity * item.unitPrice)}</td></tr>)}{Array.from({ length: Math.max(0, 5 - documentItems.length) }).map((_, index) => <tr className="empty-item-row" key={`empty-${index}`}><td /><td /><td /><td /><td /><td /><td /></tr>)}</tbody><tfoot><tr><td colSpan={6}>TOTAL:</td><td className="numeric">{money.format(documentTotal)}</td></tr></tfoot></table>
          <p className="amount-words">{amountInWords(documentTotal)}</p>
          <p className="remit-note">Please remit payments to:</p><div className="payment-details"><section><strong>BANKING INFORMATION:</strong><span>Bank: IBC BANK</span><span>Acc. Name: NORWEST PRODUCE LLC</span><span>Acc. Number: 2516358520</span><span>Wire Routing: 114902528</span></section><section><strong>ADDRESS:</strong><span>1 S Broadway St</span><span>McAllen, TX. 78501</span></section></div>
          {invoicePreview.bolFileName && <a className="invoice-bol-link" href={`/api/usa/invoices?saleId=${invoicePreview.id}`} target="_blank" rel="noreferrer">BOL adjunto: {invoicePreview.bolFileName}</a>}
          <p className="document-terms invoice-terms">{INVOICE_TERMS}</p>
        </article>
      </section></div>}

      {adjustmentPreview && <div className="modal-backdrop invoice-preview-backdrop adjustment-preview-backdrop"><section className="sale-modal invoice-preview-modal">
        <div className="invoice-toolbar"><div><p className="eyebrow">Vista previa del ajuste</p><h2>{adjustmentPreview.adjustment.number}</h2></div><div><button type="button" className="secondary-button" onClick={() => setAdjustmentPreview(null)}>Volver a factura</button><button type="button" className="primary-button" onClick={() => window.print()}>Imprimir ajuste en PDF</button></div></div>
        <div className="adjustment-document-summary"><div><span>Factura original</span><strong>{adjustmentPreview.sale.invoiceNumber}</strong></div><div><span>Tipo</span><strong>{adjustmentPreview.adjustment.documentType}</strong></div><div><span>Motivo</span><strong>{adjustmentPreview.adjustment.reason}</strong></div><div><span>Diferencia</span><strong>{money.format(adjustmentPreview.adjustment.difference)}</strong></div><p>{adjustmentPreview.adjustment.notes}</p></div>
        <article className="print-document commercial-document invoice-document adjustment-print-document">
          <div className="document-top"><div className="document-company"><img src="/norwest-logo.jpg" alt="Norwest Produce" width="390" height="142" /><div><strong>{companyForm.legalName}</strong><span>{companyForm.street}</span><span>{[companyForm.city, companyForm.state, companyForm.postalCode].filter(Boolean).join(", ")}</span></div></div><div className="document-title-block"><h3><span>ADJUSTED INVOICE:</span><b>{adjustmentPreview.sale.invoiceNumber}</b></h3><dl><dt>ADJUSTMENT:</dt><dd>{adjustmentPreview.adjustment.number}</dd><dt>ISSUED:</dt><dd>{formatDocumentDate(adjustmentPreview.adjustment.createdAt.slice(0, 10))}</dd><dt>P.O. #:</dt><dd>{adjustmentPreview.sale.purchaseOrder || "N/A"}</dd><dt>PICKUP #:</dt><dd>{adjustmentPreview.sale.pickupNumber}</dd><dt>DUE DATE:</dt><dd>{formatDocumentDate(adjustmentPreview.sale.dueDate)}</dd></dl></div></div>
          <div className="document-parties two-columns"><section><h4>BILL TO:</h4><strong>{adjustmentPreview.sale.customer}</strong>{partnerAddress(partners.find((item) => item.partnerType === "CUSTOMER" && item.name === adjustmentPreview.sale.customer)).map((line) => <span key={line}>{line}</span>)}</section><section><h4>SHIP TO:</h4><strong>{adjustmentPreview.sale.warehouse}</strong><span>Pickup #{adjustmentPreview.sale.pickupNumber}</span></section></div>
          <table className="document-items"><thead><tr><th>Description</th><th>Size</th><th>Label</th><th>Unit</th><th className="numeric">Qty</th><th className="numeric">Unit Price</th><th className="numeric">Total</th></tr></thead><tbody>{adjustmentPreview.adjustment.adjustedItems.map((item, index) => <tr key={index}><td>{item.product}</td><td>{item.size || "—"}</td><td>{item.label || "—"}</td><td>{item.presentation || "—"}</td><td className="numeric">{number.format(item.quantity)}</td><td className="numeric">{money.format(item.unitPrice)}</td><td className="numeric">{money.format(item.quantity * item.unitPrice)}</td></tr>)}{Array.from({ length: Math.max(0, 5 - adjustmentPreview.adjustment.adjustedItems.length) }).map((_, index) => <tr className="empty-item-row" key={`adjustment-empty-${index}`}><td /><td /><td /><td /><td /><td /><td /></tr>)}</tbody><tfoot><tr><td colSpan={6}>CORRECTED TOTAL:</td><td className="numeric">{money.format(adjustmentPreview.adjustment.adjustedTotal)}</td></tr></tfoot></table>
          <p className="amount-words">{amountInWords(adjustmentPreview.adjustment.adjustedTotal)}</p><div className="printed-adjustment-detail"><strong>Adjustment detail</strong><span>{adjustmentPreview.adjustment.reason} · {adjustmentPreview.adjustment.notes}</span><span>Original total: {money.format(adjustmentPreview.adjustment.previousTotal)} · Difference: {money.format(adjustmentPreview.adjustment.difference)}</span></div><p className="document-terms invoice-terms">{INVOICE_TERMS}</p>
        </article>
      </section></div>}

      {socPreview && <div className="modal-backdrop invoice-preview-backdrop"><section className="sale-modal invoice-preview-modal">
        <div className="invoice-toolbar"><div><p className="eyebrow">Vista previa</p><h2>Sales Order Confirmation {socPreview.pickupNumber}</h2></div><div><button type="button" className="secondary-button" onClick={() => setSocPreview(null)}>Cerrar</button><button type="button" className="primary-button" onClick={() => window.print()}>Imprimir PDF</button></div></div>
        {socPreview.canceledAt && <div className="canceled-record-notice"><strong>Venta cancelada</strong><span>{socPreview.canceledBy} · {socPreview.cancellationReason}</span></div>}<article className="print-document commercial-document soc-document">
          <div className="document-top"><div className="document-company"><img src="/norwest-logo.jpg" alt="Norwest Produce" width="390" height="142" /><div><strong>{companyForm.legalName}</strong><span>{companyForm.street}</span><span>{[companyForm.city, companyForm.state, companyForm.postalCode].filter(Boolean).join(", ")}</span></div></div><div className="document-title-block soc-title"><h3>SALES CONFIRMATION</h3><dl><dt>ORDER #:</dt><dd>{socPreview.pickupNumber}</dd><dt>DATE:</dt><dd>{formatDocumentDate(socPreview.saleDate)}</dd></dl></div></div>
          <div className="document-parties three-columns"><section><h4>CUSTOMER:</h4><strong>{socPreview.customer}</strong>{partnerAddress(documentCustomer).map((line) => <span key={line}>{line}</span>)}</section><section><h4>SHIP TO:</h4><strong>{socPreview.warehouse}</strong><span>{documentWarehouse?.address || "Destination address pending"}</span></section><section><h4>WAREHOUSE:</h4><strong>{documentWarehouse?.name || socPreview.warehouse}</strong>{documentWarehouse && <><span>{documentWarehouse.address}</span><span>PH: {documentWarehouse.phone}</span></>}</section></div>
          <dl className="soc-order-meta"><div><dt>P.O. Date</dt><dd>{formatDocumentDate(socPreview.saleDate)}</dd></div><div><dt>P.O. #</dt><dd>{socPreview.purchaseOrder || "N/A"}</dd></div><div><dt>P.U. #</dt><dd>{socPreview.pickupNumber}</dd></div><div><dt>Buyer</dt><dd>{documentCustomer?.contactName || "Pending"}</dd></div><div><dt>Ship Terms</dt><dd>{socPreview.warehouse}</dd></div><div><dt>Payment Terms</dt><dd>21 Days</dd></div></dl>
          <table className="document-items"><thead><tr><th>Description</th><th>Size</th><th>Label</th><th>Unit</th><th className="numeric">Qty</th><th className="numeric">Unit Price</th><th className="numeric">Total</th></tr></thead><tbody>{documentItems.map((item, index) => <tr key={index}><td>{item.product}</td><td>{item.size || "—"}</td><td>{item.label || "—"}</td><td>{item.presentation || "—"}</td><td className="numeric">{number.format(item.quantity)}</td><td className="numeric">{money.format(item.unitPrice)}</td><td className="numeric">{money.format(item.quantity * item.unitPrice)}</td></tr>)}{Array.from({ length: Math.max(0, 5 - documentItems.length) }).map((_, index) => <tr className="empty-item-row" key={`empty-${index}`}><td /><td /><td /><td /><td /><td /><td /></tr>)}</tbody><tfoot><tr><td colSpan={6}>TOTAL:</td><td className="numeric">{money.format(documentTotal)}</td></tr></tfoot></table>
          <p className="amount-words">{amountInWords(documentTotal)}</p>
          <p className="document-terms soc-terms">{SALES_ORDER_TERMS}</p>
        </article>
      </section></div>}
    </main>
  );
}
