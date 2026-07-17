import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAppointment } from '../../services/appointmentService';
import { getPatients } from '../../services/patientService';
import { getDoctors } from '../../services/doctorService';
import toast from 'react-hot-toast';
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

export default function AddAppointment() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getPatients().then(setPatients).catch(() => setError('Could not load patients'));
    getDoctors().then(setDoctors).catch(() => setError('Could not load doctors'));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await createAppointment({
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        date, time, reason,
        status: status as 'scheduled' | 'completed' | 'cancelled',
      });
      toast.success('Appointment added successfully');
navigate('/Appointments');
    } catch {
      toast.error('Failed to save Appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Add appointment</h1>
      <Card>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Select
            label="Patient"
            value={patientId}
            onChange={setPatientId}
            options={patients.map((p) => ({ value: String(p.id), label: p.name }))}
          />
          <Select
            label="Doctor"
            value={doctorId}
            onChange={setDoctorId}
            options={doctors.map((d) => ({ value: String(d.id), label: `${d.name} (${d.specialty})` }))}
          />
          <Input label="Date" type="date" value={date} onChange={setDate} />
          <Input label="Time" type="time" value={time} onChange={setTime} />
          <Input label="Reason" value={reason} onChange={setReason} />
          <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save appointment'}</Button>
        </form>
      </Card>
    </Layout>
  );
}