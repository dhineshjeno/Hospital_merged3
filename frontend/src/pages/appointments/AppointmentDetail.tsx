import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { getAppointmentById, deleteAppointment, updateAppointment } from '../../services/appointmentService';
import type { Appointment } from '../../types/appointment';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import AddConsultationModal from '../../components/AddConsultationModal';
import { useAuth } from '../../store/AuthContext';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  function load() {
    if (!id) return;
    getAppointmentById(id)
      .then(setAppointment)
      .catch(() => setError('Could not load appointment'));
  }

  useEffect(load, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm('Cancel and remove this appointment? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await deleteAppointment(id);
      navigate('/appointments');
    } catch {
      setError('Could not delete appointment');
      setIsDeleting(false);
    }
  }

  async function handleMarkNoShow() {
    if (!id || !appointment) return;
    try {
      await updateAppointment(id, {
        ...appointment,
        status: 'no-show',
        appointmentType: appointment.appointmentType as 'Consultation' | 'Follow-up' | 'Emergency',
      });
      load();
    } catch {
      setError('Could not update appointment');
    }
  }

  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointment details</h1>
        {appointment && (
          <div className="flex gap-2 flex-wrap">
            {isDoctor && appointment.status === 'scheduled' && (
              <Button variant="secondary" size="sm" onClick={() => setIsNotesOpen(true)}>
                <span className="flex items-center gap-1.5"><Stethoscope size={14} />Add consultation notes</span>
              </Button>
            )}
            {appointment.status === 'scheduled' && (
              <Button variant="secondary" size="sm" onClick={handleMarkNoShow}>Mark no-show</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate(`/appointments/${id}/edit`)}>Edit</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Cancelling...' : 'Cancel appointment'}
            </Button>
          </div>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {appointment && (
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-gray-500 text-sm">Patient</span><p className="text-gray-900 dark:text-gray-100">{appointment.patientName}</p></div>
              <div><span className="text-gray-500 text-sm">Doctor</span><p className="text-gray-900 dark:text-gray-100">{appointment.doctorName}</p></div>
              <div><span className="text-gray-500 text-sm">Date</span><p className="text-gray-900 dark:text-gray-100">{appointment.date}</p></div>
              <div><span className="text-gray-500 text-sm">Time</span><p className="text-gray-900 dark:text-gray-100">{appointment.time}</p></div>
              <div><span className="text-gray-500 text-sm">Type</span><p className="text-gray-900 dark:text-gray-100">{appointment.appointmentType}</p></div>
              <div><span className="text-gray-500 text-sm">Status</span><div className="mt-1"><StatusBadge status={appointment.status} /></div></div>
              {appointment.reason && (
                <div className="col-span-2">
                  <span className="text-gray-500 text-sm">Reason</span>
                  <p className="text-gray-900 dark:text-gray-100">{appointment.reason}</p>
                </div>
              )}
            </div>
          </Card>

          {appointment.consultationId && (
            <Card>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consultation recorded</p>
              <p className="text-xs text-gray-500">Consultation ID: {appointment.consultationId}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/patients/${appointment.patientId}`)}
              >
                View full medical history →
              </Button>
            </Card>
          )}
        </div>
      )}

      {appointment && isDoctor && (
        <AddConsultationModal
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
          appointmentId={appointment.id}
          patientId={appointment.patientId}
          doctorId={appointment.doctorId}
          onSaved={load}
        />
      )}
    </Layout>
  );
}