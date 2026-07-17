import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { getAppointments } from '../../services/appointmentService';
import type { Appointment } from '../../types/appointment';
import { todayString } from '../../utils/date';
import { useAuth } from '../../store/AuthContext';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAppointments()
      .then((all) => setAppointments(all.filter((a) => a.doctorId === user?.doctorId)))
      .catch(() => setError('Could not load your schedule'))
      .finally(() => setIsLoading(false));
  }, [user?.doctorId]);

  const today = todayString();
  const todaysSchedule = appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const pending = todaysSchedule.filter((a) => a.status === 'scheduled');
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  if (isLoading) return <p className="text-gray-500">Loading your schedule...</p>;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Good day, {user?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Here's your schedule for today.</p>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {!error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Today's appointments" value={todaysSchedule.length} icon={<Calendar size={18} />} />
            <StatCard label="Pending today" value={pending.length} icon={<Clock size={18} />} />
            <StatCard label="Total completed" value={completedCount} icon={<CheckCircle2 size={18} />} />
          </div>
          <Card>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Today's schedule</h2>
            {todaysSchedule.length === 0 && <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>}
            <div className="space-y-1">
              {todaysSchedule.map((a) => (
                <div key={a.id} onClick={() => navigate(`/appointments/${a.id}`)} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{a.patientName}</p>
                    <p className="text-xs text-gray-500">{a.time} — {a.reason}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}