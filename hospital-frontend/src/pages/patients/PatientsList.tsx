import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients } from '../../services/patientService';
import type { Patient } from '../../types/patient';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Input from '../../components/Input';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { TableSkeleton } from '../../components/Skeleton';

const PAGE_SIZE = 10;

export default function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(() => setError('Could not load patients'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (!showInactive && p.isActive === false) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || p.phone.includes(term);
    });
  }, [patients, search, showInactive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patients</h1>
        <Button onClick={() => navigate('/patients/new')}>+ Add patient</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="max-w-sm flex-1"><Input label="Search" value={search} onChange={handleSearchChange} placeholder="Name or phone..." /></div>
        <button
          onClick={() => { setShowInactive((v) => !v); setCurrentPage(1); }}
          className={`h-[42px] px-4 rounded-xl border text-sm font-medium transition ${showInactive ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
        >
          Show inactive
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <TableSkeleton />}
      {!isLoading && !error && (
        <Card>
          {filtered.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No patients match your search.</p>}
          {filtered.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="py-2">Name</th><th className="py-2">Age</th>
                      <th className="py-2">Phone</th><th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((p) => (
                      <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className={`border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer ${p.isActive === false ? 'opacity-50' : ''}`}>
                        <td className="py-2">{p.name}</td>
                        <td className="py-2">{p.age}</td>
                        <td className="py-2">{p.phone}</td>
                        <td className="py-2 flex items-center gap-1.5">
                          <StatusBadge status={p.status} />
                          {p.isActive === false && <StatusBadge status="inactive" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </>
          )}
        </Card>
      )}
    </Layout>
  );
}