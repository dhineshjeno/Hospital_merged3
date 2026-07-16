import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDoctorById, updateDoctor } from '../../services/doctorService';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

const SPECIALTIES = [
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Orthopedics', label: 'Orthopedics' },
  { value: 'Pediatrics', label: 'Pediatrics' },
  { value: 'General Medicine', label: 'General medicine' },
  { value: 'Neurology', label: 'Neurology' },
];

const STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'on-leave', label: 'On leave' },
  { value: 'in-surgery', label: 'In surgery' },
];

export default function EditDoctor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [experience, setExperience] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoctorById(id)
      .then((doctor) => {
        setName(doctor.name);
        setSpecialty(doctor.specialty);
        setPhone(doctor.phone);
        setEmail(doctor.email);
        setExperience(String(doctor.experience));
        setStatus(doctor.status);
      })
      .catch(() => setError('Could not load doctor'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError('');
    setIsSubmitting(true);
    try {
      await updateDoctor(id, {
        name, specialty, phone, email,
        experience: Number(experience),
        status: status as 'available' | 'on-leave' | 'in-surgery',
      });
      navigate(`/doctors/${id}`);
    } catch {
      setError('Could not save changes');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Layout><p className="text-gray-500">Loading...</p></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Edit doctor</h1>
      <Card>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Input label="Name" value={name} onChange={setName} />
          <Select label="Specialty" value={specialty} onChange={setSpecialty} options={SPECIALTIES} />
          <Input label="Phone" value={phone} onChange={setPhone} />
          <Input label="Email" type="email" value={email} onChange={setEmail} />
          <Input label="Experience (years)" type="number" value={experience} onChange={setExperience} />
          <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save changes'}</Button>
        </form>
      </Card>
    </Layout>
  );
}