import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationCode: text("organization_code").notNull().default("USA"),
    saleDate: text("sale_date").notNull(),
    customer: text("customer").notNull(),
    purchaseOrder: text("purchase_order"),
    warehouse: text("warehouse").notNull(),
    pickupNumber: text("pickup_number").notNull(),
    boxes: integer("boxes").notNull(),
    product: text("product").notNull(),
    size: text("size"),
    label: text("label"),
    purchasePrice: real("purchase_price"),
    salePrice: real("sale_price"),
    profit: real("profit"),
    shipDate: text("ship_date"),
    pickupDate: text("pickup_date"),
    total: real("total"),
    dueDate: text("due_date"),
    loadStatus: text("load_status").notNull().default("OK"),
    paymentStatus: text("payment_status").notNull().default("PENDIENTE"),
    invoiceNumber: text("invoice_number"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sales_org_date_idx").on(table.organizationCode, table.saleDate),
    index("sales_org_pickup_idx").on(table.organizationCode, table.pickupNumber),
  ],
);
