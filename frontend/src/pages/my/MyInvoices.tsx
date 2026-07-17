import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getInvoices } from '../../services/billingService';
import type { Invoice } from '../../types/billing';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';

export default function MyInvoices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.patientId) return;
    getInvoices(user.patientId)
      .then(setInvoices)
      .catch(() => setError('Could not load your invoices'))
      .finally(() => setIsLoading(false));
  }, [user?.patientId]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">My invoices</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {!isLoading && !error && invoices.length === 0 && <p className="text-gray-500 text-sm">No invoices on file yet.</p>}
      {!isLoading && invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <button onClick={() => navigate(`/my/invoices/${inv.id}`)} className="w-full text-left flex items-center justify-between">
                <div>
                  <p className="font-medium font-mono text-sm">INV-{String(inv.id).padStart(5, '0')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{inv.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">₹{inv.totalAmount.toLocaleString('en-IN')}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}