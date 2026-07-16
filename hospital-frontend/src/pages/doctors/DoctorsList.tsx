import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctors } from '../../services/doctorService';
import type { Doctor } from '../../types/doctor';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Input from '../../components/Input';
import StatusBadge from '../../components/StatusBadge';

export default function DoctorsList() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(() => setError('Could not load doctors'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter((d) => d.name.toLowerCase().includes(term) || d.specialty.toLowerCase().includes(term));
  }, [doctors, search]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Doctors</h1>
        <Button onClick={() => navigate('/doctors/new')}>+ Add doctor</Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input label="Search" value={search} onChange={setSearch} placeholder="Name or specialty..." />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading doctors...</p>}
      {!isLoading && !error && (
        <Card>
          {filtered.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No doctors match your search.</p>}
          {filtered.length > 0 && (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Name</th><th className="py-2">Specialty</th>
                  <th className="py-2">Phone</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} onClick={() => navigate(`/doctors/${d.id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-2">{d.name}</td>
                    <td className="py-2">{d.specialty}</td>
                    <td className="py-2">{d.phone}</td>
                    <td className="py-2"><StatusBadge status={d.status} /></td>
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