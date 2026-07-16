import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPatients } from '../../services/patientService';
import { getAppointments } from '../../services/appointmentService';
import { getInvoices } from '../../services/billingService';
import type { Patient } from '../../types/patient';
import type { Appointment } from '../../types/appointment';
import type { Invoice } from '../../types/billing';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import { getBillingSummary } from '../../services/billingService';

function groupByMonth<T>(items: T[], getDate: (item: T) => string, getValue: (item: T) => number) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const month = getDate(item).slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + getValue(item));
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value }));
}

export default function AdminAnalytics() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingSummary, setBillingSummary] = useState<{
  totalInvoices: number; paidAmount: number; pendingAmount: number; totalAmount: number;
} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const today = new Date();
const dateFrom = `${today.getFullYear()}-01-01`;
const dateTo = today.toISOString().split('T')[0];

Promise.all([getPatients(), getAppointments(), getInvoices(), getBillingSummary(dateFrom, dateTo)])
  .then(([p, a, i, summary]) => {
    setPatients(p); setAppointments(a); setInvoices(i); setBillingSummary(summary);
  })
      .catch(() => setError('Could not load analytics data'))
      .finally(() => setIsLoading(false));
  }, []);

  const patientTrend = useMemo(() => groupByMonth(patients, (p) => p.registeredAt ?? '2026-01', () => 1), [patients]);
  const appointmentTrend = useMemo(() => groupByMonth(appointments, (a) => a.date, () => 1), [appointments]);
  const revenueTrend = useMemo(() => groupByMonth(invoices.filter((i) => i.status === 'paid'), (i) => i.date, (i) => i.totalAmount), [invoices]);

  if (isLoading) return <Layout><p className="text-gray-500">Loading analytics...</p></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="mb-4"><Alert variant="info">Charts are sparse with this little test data — they'll fill in as real patients, appointments and invoices accumulate.</Alert></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Patient registrations</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={patientTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Appointment volume</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={appointmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Revenue (paid invoices)</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
<Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        {billingSummary && (
  <Card>
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Revenue summary (this year)</h2>
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <p className="text-xs text-gray-400 mb-1">Collected</p>
        <p className="text-lg font-mono font-semibold text-green-800 dark:text-green-300">
          ₹{billingSummary.paidAmount.toLocaleString('en-IN')}
        </p>
      </div>
      <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <p className="text-xs text-gray-400 mb-1">Outstanding</p>
        <p className="text-lg font-mono font-semibold text-amber-800 dark:text-amber-300">
          ₹{billingSummary.pendingAmount.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
    <p className="text-xs text-gray-400 text-center mt-3">
      {billingSummary.totalInvoices} invoices · ₹{billingSummary.totalAmount.toLocaleString('en-IN')} total billed
    </p>
  </Card>
)}
      </div>
    </Layout>
  );
}