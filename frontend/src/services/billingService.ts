import api from './api';
import type { Invoice } from '../types/billing';

interface P2Invoice {
  invoice_id: string;
  patient_id: string;
  appointment_id?: string;
  status: string;
  created_at: string;
  total_amount: number;
  discount_percent?: number;
  notes?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  items?: {
    invoice_item_id: string;
    service_name: string;
    quantity: number;
    rate: number;
    amount: number;
    description?: string;
  }[];
  payments?: {
    payment_id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
  }[];
}

interface P2ListResponse {
  success: boolean;
  data: P2Invoice[];
}

function adaptInvoice(inv: P2Invoice): Invoice {
  const patientName = inv.patient_first_name
    ? `${inv.patient_first_name} ${inv.patient_last_name ?? ''}`.trim()
    : '';
  const items = (inv.items ?? []).map((it) => ({
    description: `${it.service_name}${it.description ? ` — ${it.description}` : ''}`,
    amount: it.amount,
  }));
  return {
    id: inv.invoice_id as unknown as number,
    patientId: inv.patient_id as unknown as number,
    patientName,
    appointmentId: 0,
    date: inv.created_at?.split('T')[0] ?? '',
    items,
    totalAmount: inv.total_amount,
    status: inv.status === 'Paid' ? 'paid' : 'pending',
    hospitalId: 1,
  };
}

export async function getInvoices(patientId?: string | number): Promise<Invoice[]> {
  const params: Record<string, string> = {};
  if (patientId) params.patient_id = String(patientId);
  const response = await api.get<P2ListResponse>('/billing/invoices', { params });
  return response.data.data.map(adaptInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  const response = await api.get<{ success: boolean; data: P2Invoice }>(`/billing/invoices/${id}`);
  return adaptInvoice(response.data.data);
}

export async function createInvoice(data: {
  patientId: string; appointmentId: string;
  services: { serviceName: string; quantity: number; rate: number; description?: string }[];
  discountPercent?: number; notes?: string;
}): Promise<Invoice> {
  const payload = {
    patient_id: data.patientId,
    appointment_id: data.appointmentId,
    services: data.services.map((s) => ({
      service_name: s.serviceName,
      quantity: s.quantity,
      rate: s.rate,
      description: s.description,
    })),
    discount_percent: data.discountPercent,
    notes: data.notes,
  };
  const response = await api.post<{ success: boolean; data: P2Invoice }>('/billing/invoices', payload);
  return adaptInvoice(response.data.data);
}

export async function recordPayment(invoiceId: string, data: {
  amount: number;
  paymentMethod: 'Cash' | 'Cheque' | 'Card' | 'Net Banking' | 'UPI' | 'Insurance';
  transactionId?: string;
  notes?: string;
}): Promise<void> {
  await api.post(`/billing/invoices/${invoiceId}/payments`, {
    amount: data.amount,
    payment_method: data.paymentMethod,
    transaction_id: data.transactionId,
    notes: data.notes,
  });
}

export async function getBillingSummary(dateFrom: string, dateTo: string): Promise<{
  totalInvoices: number; paidAmount: number; pendingAmount: number; totalAmount: number;
}> {
  const response = await api.get<{
    success: boolean;
    data: { total_invoices: number; paid_amount: number; pending_amount: number; total_amount: number };
  }>('/billing/summary', { params: { date_from: dateFrom, date_to: dateTo } });
  const d = response.data.data;
  return {
    totalInvoices: d.total_invoices,
    paidAmount: d.paid_amount,
    pendingAmount: d.pending_amount,
    totalAmount: d.total_amount,
  };
}