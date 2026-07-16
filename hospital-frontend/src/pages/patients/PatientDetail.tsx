import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPatientById, deletePatient, setPatientActive } from '../../services/patientService';
import { getAppointments } from '../../services/appointmentService';
import type { Patient } from '../../types/patient';
import type { Appointment } from '../../types/appointment';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import HealthTimeline from '../../components/HealthTimeline';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  function load() {
    if (!id) return;
    getPatientById(id).then(setPatient).catch(() => setError('Could not load patient'));
    getAppointments().then((all) => setAppointments(all.filter((a) => String(a.patientId) === id))).catch(() => {});
  }

  useEffect(load, [id]);

  async function handleDeactivate() {
    if (!id) return;
    if (!window.confirm('Deactivate this patient record? It will be hidden from the active list but kept on file, and can be reactivated later.')) return;
    setIsWorking(true);
    try {
      await deletePatient(id);
      navigate('/patients');
    } catch {
      setError('Could not deactivate patient');
      setIsWorking(false);
    }
  }

  async function handleReactivate() {
    if (!id) return;
    setIsWorking(true);
    try {
      await setPatientActive(id, true);
      load();
    } catch {
      setError('Could not reactivate patient');
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient details</h1>
          {patient?.isActive === false && <StatusBadge status="inactive" />}
        </div>
        {patient && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/patients/${id}/edit`)}>Edit</Button>
            {patient.isActive === false ? (
              <Button size="sm" onClick={handleReactivate} disabled={isWorking}>{isWorking ? 'Reactivating...' : 'Reactivate'}</Button>
            ) : (
              <Button variant="danger" size="sm" onClick={handleDeactivate} disabled={isWorking}>{isWorking ? 'Deactivating...' : 'Deactivate'}</Button>
            )}
          </div>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {patient && (
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500 text-sm">Name</span><p className="text-gray-900 dark:text-gray-100">{patient.name}</p></div>
            <div><span className="text-gray-500 text-sm">Age</span><p className="text-gray-900 dark:text-gray-100">{patient.age}</p></div>
            <div><span className="text-gray-500 text-sm">Phone</span><p className="text-gray-900 dark:text-gray-100">{patient.phone}</p></div>
            <div><span className="text-gray-500 text-sm">Blood group</span><p className="text-gray-900 dark:text-gray-100">{patient.bloodGroup}</p></div>
            <div className="col-span-2"><span className="text-gray-500 text-sm">Address</span><p className="text-gray-900 dark:text-gray-100">{patient.address}</p></div>
            <div><span className="text-gray-500 text-sm">Status</span><div className="mt-1"><StatusBadge status={patient.status} /></div></div>
          </div>
        </Card>
      )}

      {patient && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Medical history</h2>
          <HealthTimeline appointments={appointments} />
        </div>
      )}
    </Layout>
  );
}