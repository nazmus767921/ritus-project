export type TransactionCategory =
  | 'personal_expense'
  | 'tailoring_expense'
  | 'clothing_overhead'
  | 'tailoring_income'
  | 'clothing_income';

export type TransactionStatus = 'active' | 'refunded';

export interface TransactionRecord {
  id: number;
  amount: number;
  category: TransactionCategory;
  description: string;
  createdAt: Date;
  status: TransactionStatus;
  inventoryItemId: number | null;
}

export interface ShipmentRecord {
  id: number;
  courierFee: number;
  deliveryDate: Date;
  courierTransactionId: number | null;
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
}

export interface ShipmentWithItems extends ShipmentRecord {
  items: InventoryItemRecord[];
}
