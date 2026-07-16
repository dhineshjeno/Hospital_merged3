import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getLabResults } from '../../services/labService';
import type { LabResult } from '../../types/lab';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';
import { TableSkeleton } from '../../components/Skeleton';

export default function MyLabResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.patientId) return;
    getLabResults(Number(user.patientId))
      .then(setResults)
      .catch(() => setError('Could not load your lab results'))
      .finally(() => setIsLoading(false));
  }, [user?.patientId]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">My lab results</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <TableSkeleton />}
      {!isLoading && !error && results.length === 0 && (
        <p className="text-gray-500 text-sm">No lab results on file yet.</p>
      )}
      {!isLoading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id}>
              <button
                onClick={() => navigate(`/my/lab-results/${r.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{r.testName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isAbnormal && <StatusBadge status="abnormal" />}
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                {r.status === 'completed' && r.value && (
                  <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-700 flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Result</p>
                      <p className={`text-sm font-mono font-semibold ${r.isAbnormal ? 'text-danger' : 'text-gray-900 dark:text-gray-100'}`}>
                        {r.value} {r.unit}
                      </p>
                    </div>
                    {r.referenceRange && (
                      <div>
                        <p className="text-xs text-gray-400">Reference range</p>
                        <p className="text-sm font-mono text-gray-600 dark:text-gray-300">{r.referenceRange}</p>
                      </div>
                    )}
                  </div>
                )}
              </button>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}