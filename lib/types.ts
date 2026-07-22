export type Sale = {
  id?: number;
  sourceRow?: number;
  organizationCode?: string;
  operationType: "DIRECT_RESALE" | "IMPORTED_INVENTORY";
  supplier?: string | null;
  inventoryLotId?: number | null;
  saleDate: string;
  customer: string;
  sellerName?: string | null;
  purchaseOrder: string | null;
  warehouse: string;
  pickupNumber: string;
  boxes: number;
  product: string;
  presentation?: string | null;
  size: string | null;
  label: string | null;
  purchasePrice: number | null;
  salePrice: number | null;
  profit: number | null;
  shipDate: string | null;
  pickupDate: string | null;
  total: number | null;
  dueDate: string | null;
  loadStatus: string | null;
  statusUpdatedAt?: string | null;
  pasReviewDays?: number | null;
  pasReviewDueDate?: string | null;
  usdaInspectionStatus?: string | null;
  usdaInspectionObjectKey?: string | null;
  usdaInspectionFileName?: string | null;
  usdaInspectionContentType?: string | null;
  usdaInspectionUploadedAt?: string | null;
  paymentStatus: string | null;
  invoiceNumber: string | null;
  invoiceItems?: string | null;
  bolObjectKey?: string | null;
  bolFileName?: string | null;
  bolContentType?: string | null;
  bolUploadedAt?: string | null;
};

export type InvoiceItem = {
  product: string;
  presentation: string;
  size: string;
  label: string;
  quantity: number;
  unitPrice: number;
};

export type NewSale = Omit<Sale, "id" | "sourceRow" | "organizationCode" | "profit" | "total">;

export type InventoryLot = {
  id: number;
  organizationCode: string;
  receivedDate: string;
  supplier: string | null;
  warehouse: string;
  pickupNumber: string | null;
  product: string;
  presentation: string | null;
  size: string | null;
  label: string | null;
  totalBoxes: number;
  boxesPerPallet: number | null;
  palletsPerLoad: number | null;
  availableBoxes: number;
  unitCost: number | null;
  purchasePrice: number | null;
  freightCost: number;
  mexicoCustomsCost: number;
  usCustomsCost: number;
  overweightCost: number;
  redLightCost: number;
  coldStorage: string | null;
  coldStorageCost: number;
  additionalExpenses: string;
  costCurrencies: string;
  exchangeRate: number | null;
  totalImportCost: number | null;
};

export type ColdStorage = {
  id: number;
  organizationCode: string;
  name: string;
  address: string;
  phone: string;
};

export type Product = {
  id: number;
  organizationCode: string;
  name: string;
  alias: string;
  presentation: string | null;
  size: string | null;
  label: string | null;
};

export type PartnerType = "SUPPLIER" | "CUSTOMER";

export type BusinessPartner = {
  id: number;
  organizationCode: string;
  partnerType: PartnerType;
  name: string;
  pacaNumber: string;
  taxId: string;
  blueBookNumber: string;
  dunsNumber: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  stateCode: string;
  stateName: string;
  city: string;
  postalCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  assignedSeller: string | null;
  profitPercentage: number;
  createdAt?: string;
};

export type NewBusinessPartner = Omit<BusinessPartner, "id" | "organizationCode" | "createdAt">;

export type CompanySettings = {
  id: number;
  organizationCode: string;
  legalName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  blueBookNumber: string;
  pacaNumber: string;
  dunsNumber: string;
  taxId: string;
};

export type UserAccount = {
  id: number;
  organizationCode: string;
  fullName: string;
  alias: string;
  email: string;
  permissions: string;
  active: boolean;
  createdAt?: string;
};
