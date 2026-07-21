export type Sale = {
  id?: number;
  sourceRow?: number;
  organizationCode?: string;
  operationType: "DIRECT_RESALE" | "IMPORTED_INVENTORY";
  supplier?: string | null;
  inventoryLotId?: number | null;
  saleDate: string;
  customer: string;
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
  paymentStatus: string | null;
  invoiceNumber: string | null;
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
  availableBoxes: number;
  unitCost: number | null;
};
