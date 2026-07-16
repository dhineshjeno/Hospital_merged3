import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices } from '../../services/billingService';
import type { Invoice } from '../../types/billing';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';

export default function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getInvoices()
      .then(setInvoices)
      .catch(() => setError('Could not load invoices'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Billing</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading invoices...</p>}
      {!isLoading && !error && (
        <Card>
          {invoices.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No invoices yet.</p>}
          {invoices.length > 0 && (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Patient</th><th className="py-2">Date</th>
                  <th className="py-2">Amount</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} onClick={() => navigate(`/billing/${inv.id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-2.5">{inv.patientName}</td>
                    <td className="py-2.5">{inv.date}</td>
                    <td className="py-2.5 font-mono">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </Layout>
  );
}