import { useEffect, useMemo, useState } from 'react';
import { PackageSearch, AlertTriangle, XCircle } from 'lucide-react';
import { getPharmacyStock } from '../../services/pharmacyService';
import type { PharmacyItem } from '../../types/pharmacy';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';

export default function PharmacyStock() {
  const [stock, setStock] = useState<PharmacyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPharmacyStock()
      .then(setStock)
      .catch(() => setError('Could not load pharmacy stock'))
      .finally(() => setIsLoading(false));
  }, []);

  const lowStockCount = useMemo(() => stock.filter((s) => s.status === 'low-stock').length, [stock]);
  const outOfStockCount = useMemo(() => stock.filter((s) => s.status === 'out-of-stock').length, [stock]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Pharmacy stock</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading stock...</p>}
      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total medicines" value={stock.length} icon={<PackageSearch size={18} />} />
            <StatCard label="Low stock" value={lowStockCount} icon={<AlertTriangle size={18} />} />
            <StatCard label="Out of stock" value={outOfStockCount} icon={<XCircle size={18} />} />
          </div>
          {(lowStockCount > 0 || outOfStockCount > 0) && (
            <div className="mb-4"><Alert variant="warning">{outOfStockCount} medicine(s) out of stock and {lowStockCount} running low — reorder may be needed.</Alert></div>
          )}
          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Medicine</th><th className="py-2">Category</th>
                  <th className="py-2">Quantity</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2.5">{item.medicineName}</td>
                    <td className="py-2.5 text-gray-500">{item.category}</td>
                    <td className="py-2.5 font-mono">{item.quantity} {item.unit}</td>
                    <td className="py-2.5"><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </Layout>
  );
}