export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  id: number;
  patientId: number;
  patientName: string;
  appointmentId: number;
  date: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'paid' | 'pending';
  hospitalId: number;
}

export interface InvoiceListResponse { invoices: Invoice[]; }
export interface InvoiceResponse { invoice: Invoice; }