import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdmissions } from '../../services/wardService';
import type { Admission } from '../../types/ward';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { TableSkeleton } from '../../components/Skeleton';

export default function AdmissionsList() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    getAdmissions(statusFilter ? { status: statusFilter } : {})
      .then(setAdmissions)
      .catch(() => setError('Could not load admissions'))
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admissions</h1>
        <Button onClick={() => navigate('/admissions/new')}>+ Admit patient</Button>
      </div>

      <div className="flex gap-2 mb-4">
        {['active', 'transferred', 'discharged', ''].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${statusFilter === s ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <TableSkeleton />}
      {!isLoading && !error && (
        <Card>
          {admissions.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No admissions found.</p>}
          {admissions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="py-2">Patient</th><th className="py-2">Ward</th><th className="py-2">Bed</th>
                    <th className="py-2">Doctor</th><th className="py-2">Admitted</th>
                    <th className="py-2">Expected discharge</th><th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.id} onClick={() => navigate(`/admissions/${a.id}`)} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                      <td className="py-2.5 font-medium">{a.patientName}</td>
                      <td className="py-2.5">{a.wardName}</td>
                      <td className="py-2.5 font-mono">{a.bedNumber}</td>
                      <td className="py-2.5">{a.admittingDoctorName}</td>
                      <td className="py-2.5">{a.admissionDate}</td>
                      <td className="py-2.5">{a.expectedDischargeDate ?? '—'}</td>
                      <td className="py-2.5"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </Layout>
  );
}