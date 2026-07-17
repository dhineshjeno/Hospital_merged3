import api from './api';
import type { PharmacyItem } from '../types/pharmacy';

interface P3Medicine {
  medicine_id: string;
  medicine_name: string;
  category?: string;
  current_stock?: number;
  unit_of_measure?: string;
  reorder_level?: number;
}

interface P3Response {
  status: string;
  data: P3Medicine[];
}

function adaptMedicine(m: P3Medicine, index: number): PharmacyItem {
  const qty = m.current_stock ?? 0;
  const reorder = m.reorder_level ?? 50;
  let status: PharmacyItem['status'] = 'in-stock';
  if (qty === 0) status = 'out-of-stock';
  else if (qty < reorder) status = 'low-stock';
  return {
    id: index + 1,
    medicineName: m.medicine_name,
    category: m.category ?? 'General',
    quantity: qty,
    unit: m.unit_of_measure ?? 'units',
    reorderLevel: reorder,
    status,
    hospitalId: 1,
  };
}

export async function getPharmacyStock(): Promise<PharmacyItem[]> {
  const response = await api.get<P3Response>('/medicines', { params: { pageSize: 100 } });
  return response.data.data.map(adaptMedicine);
}