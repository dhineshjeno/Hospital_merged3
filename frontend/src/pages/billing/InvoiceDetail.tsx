import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Receipt, CreditCard } from 'lucide-react';
import { getInvoiceById, recordPayment } from '../../services/billingService';
import type { Invoice } from '../../types/billing';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Card', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Net Banking', label: 'Net banking' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Insurance', label: 'Insurance' },
];

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  function load() {
    if (!id) return;
    getInvoiceById(id).then(setInvoice).catch(() => setError('Could not load invoice'));
  }

  useEffect(load, [id]);

  function handleDownload() {
    if (!invoice) return;
    downloadFile(`invoice-${invoice.id}.txt`, [
      'INVOICE', '=======',
      `Invoice: INV-${String(invoice.id).padStart(5, '0')}`,
      `Patient: ${invoice.patientName}`,
      `Date: ${invoice.date}`, '',
      ...invoice.items.map((it) => `${it.description} — ₹${it.amount}`),
      '', `Total: ₹${invoice.totalAmount.toLocaleString('en-IN')}`,
      `Status: ${invoice.status}`,
    ].join('\n'), 'text/plain');
  }

  async function handlePayment() {
    if (!id || !paymentAmount) return;
    setIsProcessing(true);
    try {
      await recordPayment(String(id), {
        amount: Number(paymentAmount),
        paymentMethod: paymentMethod as 'Cash' | 'Card' | 'UPI' | 'Net Banking' | 'Cheque' | 'Insurance',
        transactionId: transactionId || undefined,
      });
      setIsPaymentOpen(false);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setTransactionId('');
      load();
    } catch {
      setError('Could not record payment — please try again');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoice</h1>
        {invoice && (
          <div className="flex gap-2">
            {invoice.status === 'pending' && (
              <Button size="sm" onClick={() => setIsPaymentOpen(true)}>
                <span className="flex items-center gap-1.5"><CreditCard size={14} />Record payment</span>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <span className="flex items-center gap-1.5"><Download size={14} />Download</span>
            </Button>
          </div>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {invoice && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-primary" />
              <p className="font-mono text-sm text-gray-500">
                INV-{String(invoice.id).padStart(5, '0')}
              </p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><span className="text-gray-500">Patient</span><p className="text-gray-900 dark:text-gray-100">{invoice.patientName}</p></div>
            <div><span className="text-gray-500">Date</span><p className="text-gray-900 dark:text-gray-100">{invoice.date}</p></div>
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
            <div className="space-y-2 mb-3">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{item.description}</span>
                  <span className="font-mono">₹{item.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-gray-100 dark:border-slate-700 pt-3 font-semibold">
              <span className="text-gray-900 dark:text-gray-100">Total</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                ₹{invoice.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Record payment">
        {invoice && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Invoice total: <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
            </p>
            <Input
              label="Amount (₹)"
              type="number"
              value={paymentAmount}
              onChange={setPaymentAmount}
              placeholder={String(invoice.totalAmount)}
            />
            <Select
              label="Payment method"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHODS}
            />
            {(paymentMethod === 'Card' || paymentMethod === 'Net Banking' || paymentMethod === 'UPI') && (
              <Input
                label="Transaction ID"
                value={transactionId}
                onChange={setTransactionId}
                placeholder="UTR / transaction reference"
              />
            )}
            <Button onClick={handlePayment} disabled={isProcessing || !paymentAmount} fullWidth>
              {isProcessing ? 'Processing...' : `Record ₹${Number(paymentAmount || 0).toLocaleString('en-IN')} payment`}
            </Button>
          </>
        )}
      </Modal>
    </Layout>
  );
}