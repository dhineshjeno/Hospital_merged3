import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, CalendarDays } from 'lucide-react';
import { getAppointments } from '../../services/appointmentService';
import { getDoctors } from '../../services/doctorService';
import type { Appointment } from '../../types/appointment';
import type { Doctor } from '../../types/doctor';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Select from '../../components/Select';
import StatusBadge from '../../components/StatusBadge';
import CalendarView from '../../components/CalendarView';

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  function load() {
    setIsLoading(true);
    Promise.all([getAppointments(), getDoctors()])
      .then(([a, d]) => { setAppointments(a); setDoctors(d); })
      .catch(() => setError('Could not load appointments'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (doctorFilter && String(a.doctorId) !== doctorFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }, [appointments, doctorFilter, statusFilter]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 p-1">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${view === 'list' ? 'bg-primary text-white' : 'text-gray-600'}`}>
              <List size={15} />List
            </button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${view === 'calendar' ? 'bg-primary text-white' : 'text-gray-600'}`}>
              <CalendarDays size={15} />Calendar
            </button>
          </div>
          <Button onClick={() => navigate('/appointments/book')}>+ Book appointment</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 max-w-xl">
        <div className="w-48">
          <Select label="Doctor" value={doctorFilter} onChange={setDoctorFilter}
            options={doctors.map((d) => ({ value: String(d.id), label: d.name }))} />
        </div>
        <div className="w-48">
          <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading appointments...</p>}

      {!isLoading && !error && view === 'list' && (
        <Card>
          {filtered.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">No appointments match your filters.</p>}
          {filtered.length > 0 && (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Patient</th><th className="py-2">Doctor</th>
                  <th className="py-2">Date</th><th className="py-2">Time</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/appointments/${a.id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-2">{a.patientName}</td>
                    <td className="py-2">{a.doctorName}</td>
                    <td className="py-2">{a.date}</td>
                    <td className="py-2">{a.time}</td>
                    <td className="py-2"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {!isLoading && !error && view === 'calendar' && (
        <Card>
          <CalendarView appointments={filtered} onChanged={load} />
        </Card>
      )}
    </Layout>
  );
}