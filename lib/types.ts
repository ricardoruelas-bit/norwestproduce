export type Sale = {
  id?: number;
  sourceRow?: number;
  organizationCode?: string;
  operationType: "DIRECT_RESALE" | "IMPORTED_INVENTORY";
  saleDate: string;
  customer: string;
  purchaseOrder: string | null;
  warehouse: string;
  pickupNumber: string;
  boxes: number;
  product: string;
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
