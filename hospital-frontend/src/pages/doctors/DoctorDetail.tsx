import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDoctorById, deleteDoctor } from '../../services/doctorService';
import type { Doctor } from '../../types/doctor';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoctorById(id).then(setDoctor).catch(() => setError('Could not load doctor'));
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm('Delete this doctor record? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await deleteDoctor(id);
      navigate('/doctors');
    } catch {
      setError('Could not delete doctor');
      setIsDeleting(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Doctor details</h1>
        {doctor && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/doctors/${id}/edit`)}>Edit</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {doctor && (
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500 text-sm">Name</span><p>{doctor.name}</p></div>
            <div><span className="text-gray-500 text-sm">Specialty</span><p>{doctor.specialty}</p></div>
            <div><span className="text-gray-500 text-sm">Phone</span><p>{doctor.phone}</p></div>
            <div><span className="text-gray-500 text-sm">Email</span><p>{doctor.email}</p></div>
            <div><span className="text-gray-500 text-sm">Experience</span><p>{doctor.experience} years</p></div>
            <div><span className="text-gray-500 text-sm">Status</span><div className="mt-1"><StatusBadge status={doctor.status} /></div></div>
          </div>
        </Card>
      )}
    </Layout>
  );
}