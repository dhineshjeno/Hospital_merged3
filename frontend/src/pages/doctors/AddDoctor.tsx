import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDoctor } from '../../services/doctorService';
import toast from 'react-hot-toast';
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

export default function AddDoctor() {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [experience, setExperience] = useState('');
  const [status, setStatus] = useState('available');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await createDoctor({
        name, specialty, phone, email,
        experience: Number(experience),
        status: status as 'available' | 'on-leave' | 'in-surgery',
      });
      toast.success('Doctor added successfully');
navigate('/Doctor');
    } catch {
      toast.error('Failed to save Doctor');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Add doctor</h1>
      <Card>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Input label="Name" value={name} onChange={setName} />
          <Select label="Specialty" value={specialty} onChange={setSpecialty} options={SPECIALTIES} />
          <Input label="Phone" value={phone} onChange={setPhone} />
          <Input label="Email" type="email" value={email} onChange={setEmail} />
          <Input label="Experience (years)" type="number" value={experience} onChange={setExperience} />
          <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save doctor'}</Button>
        </form>
      </Card>
    </Layout>
  );
}