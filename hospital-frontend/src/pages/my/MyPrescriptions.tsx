import { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { getPatientPrescriptions } from '../../services/prescriptionService';
import type { Prescription } from '../../types/prescription';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import { TableSkeleton } from '../../components/Skeleton';

export default function MyPrescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.patientId) return;
    getPatientPrescriptions(user.patientId)
      .then(setPrescriptions)
      .catch(() => setError('Could not load your prescriptions'))
      .finally(() => setIsLoading(false));
  }, [user?.patientId]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">My prescriptions</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <TableSkeleton />}
      {!isLoading && !error && prescriptions.length === 0 && (
        <p className="text-gray-500 text-sm">No prescriptions on file yet.</p>
      )}
      {!isLoading && prescriptions.length > 0 && (
        <div className="space-y-4">
          {prescriptions.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.doctorName || 'Prescribed by doctor'}</p>
                  <p className="text-xs text-gray-400">{p.prescribedAt}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  p.status === 'active'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600'
                }`}>
                  {p.status}
                </span>
              </div>
              {p.items.length > 0 && (
                <div className="space-y-2">
                  {p.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-t border-gray-50 dark:border-slate-700">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Pill size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.medicationName}</p>
                        <p className="text-xs text-gray-500">{item.dosage} · {item.frequency} · {item.duration}</p>
                        {item.instructions && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.instructions}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {p.items.length === 0 && (
                <p className="text-xs text-gray-400">No items recorded yet.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}