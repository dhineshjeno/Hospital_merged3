import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLabResults } from '../../services/labService';
import type { LabResult } from '../../types/lab';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Select from '../../components/Select';
import StatusBadge from '../../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

export default function LabResultsList() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getLabResults()
      .then(setResults)
      .catch(() => setError('Could not load lab results'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (abnormalOnly && !r.isAbnormal) return false;
      return true;
    });
  }, [results, statusFilter, abnormalOnly]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Lab results</h1>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-48"><Select label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} /></div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-transparent mb-1 select-none">.</span>
          <button
            onClick={() => setAbnormalOnly((v) => !v)}
            className={`h-[42px] px-4 rounded-xl border text-sm font-medium transition ${abnormalOnly ? 'border-danger bg-danger/5 text-danger' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            Abnormal only
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading lab results...</p>}
      {!isLoading && !error && (
        <Card>
          {filtered.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No lab results match your filters.</p>}
          {filtered.length > 0 && (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Patient</th><th className="py-2">Test</th>
                  <th className="py-2">Date</th><th className="py-2">Status</th><th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/lab-results/${r.id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-2.5">{r.patientName}</td>
                    <td className="py-2.5">{r.testName}</td>
                    <td className="py-2.5">{r.date}</td>
                    <td className="py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="py-2.5">{r.isAbnormal && <StatusBadge status="abnormal" />}</td>
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