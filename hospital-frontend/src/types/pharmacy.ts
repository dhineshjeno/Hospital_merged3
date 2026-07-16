export interface PharmacyItem {
  id: number;
  medicineName: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  hospitalId: number;
}

export interface PharmacyStockResponse { stock: PharmacyItem[]; }