import { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { getAppointments } from '../../services/appointmentService';
import type { Appointment } from '../../types/appointment';
import Layout from '../../components/Layout';
import Alert from '../../components/Alert';
import HealthTimeline from '../../components/HealthTimeline';

export default function MyVisits() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAppointments()
      .then((all) => setAppointments(all.filter((a) => a.patientId === user?.patientId)))
      .catch(() => setError('Could not load visit history'))
      .finally(() => setIsLoading(false));
  }, [user?.patientId]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Visit history</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {!isLoading && !error && <HealthTimeline appointments={appointments} />}
    </Layout>
  );
}