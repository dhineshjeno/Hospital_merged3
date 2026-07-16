import { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { getAppointments } from '../../services/appointmentService';
import type { Appointment } from '../../types/appointment';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';

export default function MyAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAppointments()
      .then((all) => setAppointments(all.filter((a) => a.patientId === user?.patientId)))
      .catch(() => setError('Could not load your appointments'))
      .finally(() => setIsLoading(false));
  }, [user?.patientId]);

  const upcoming = appointments
    .filter((a) => a.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const past = appointments
    .filter((a) => a.status !== 'scheduled')
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">My appointments</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {!isLoading && !error && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Upcoming</h2>
            {upcoming.length === 0 && <p className="text-gray-500 text-sm">No upcoming appointments.</p>}
            <div className="space-y-3">
              {upcoming.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.doctorName}</p>
                      <p className="text-sm text-gray-500">{a.date} at {a.time} — {a.reason}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Past</h2>
            {past.length === 0 && <p className="text-gray-500 text-sm">No past appointments yet.</p>}
            <div className="space-y-3">
              {past.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.doctorName}</p>
                      <p className="text-sm text-gray-500">{a.date} at {a.time} — {a.reason}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}