export type TransactionCategory =
  | 'personal_expense'
  | 'tailoring_expense'
  | 'clothing_overhead'
  | 'tailoring_income'
  | 'clothing_income'
  | 'cost_of_goods_sold'
  | 'supplier_return';

export type TransactionStatus = 'active' | 'refunded';

export interface TransactionRecord {
  id: number;
  amount: number;
  category: TransactionCategory;
  description: string;
  customerName: string | null;
  notes: string | null;
  createdAt: Date;
  quantity: number;
  status: TransactionStatus;
  inventoryItemId: number | null;
}

export interface ShipmentRecord {
  id: number;
  courierFee: number;
  deliveryDate: Date;
  courierTransactionId: number | null;
  supplier: string | null;
}

export interface InventoryItemRecord {
  id: number;
  shipmentId: number | null;
  brand: string;
  quantity: number;
  initialQuantity: number;
  wholesaleCost: number;
  trueCost: number;
}

export interface SettingsRecord {
  key: string;
  value: string;
}

export interface DashboardMetrics {
  tailoringNet: number;
  clothingNet: number;
  totalBusinessProfit: number;
  safetyPocket: number;
  totalAvailableStock: number;
  totalSoldQuantity: number;
  totalRemainingStock: number;
}

export interface ShipmentWithItems extends ShipmentRecord {
  items: InventoryItemRecord[];
}

export interface ExchangeItem {
  inventoryItemId: number;
  quantity: number;
  reason: 'faulty' | 'unsold';
}
