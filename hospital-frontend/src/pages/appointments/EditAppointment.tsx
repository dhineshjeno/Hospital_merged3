import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAppointmentById, updateAppointment } from '../../services/appointmentService';
import { getPatients } from '../../services/patientService';
import { getDoctors } from '../../services/doctorService';
import type { Patient } from '../../types/patient';
import type { Doctor } from '../../types/doctor';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function EditAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPatients(), getDoctors(), getAppointmentById(id)])
      .then(([p, d, appointment]) => {
        setPatients(p);
        setDoctors(d);
        setPatientId(String(appointment.patientId));
        setDoctorId(String(appointment.doctorId));
        setDate(appointment.date);
        setTime(appointment.time);
        setReason(appointment.reason);
        setStatus(appointment.status);
      })
      .catch(() => setError('Could not load appointment'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError('');
    setIsSubmitting(true);
    try {
      await updateAppointment(id, {
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        date, time, reason,
        status: status as 'scheduled' | 'completed' | 'cancelled',
      });
      navigate(`/appointments/${id}`);
    } catch {
      setError('Could not save changes');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Layout><p className="text-gray-500">Loading...</p></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Edit appointment</h1>
      <Card>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Select label="Patient" value={patientId} onChange={setPatientId}
            options={patients.map((p) => ({ value: String(p.id), label: p.name }))} />
          <Select label="Doctor" value={doctorId} onChange={setDoctorId}
            options={doctors.map((d) => ({ value: String(d.id), label: `${d.name} (${d.specialty})` }))} />
          <Input label="Date" type="date" value={date} onChange={setDate} />
          <Input label="Time" type="time" value={time} onChange={setTime} />
          <Input label="Reason" value={reason} onChange={setReason} />
          <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save changes'}</Button>
        </form>
      </Card>
    </Layout>
  );
}