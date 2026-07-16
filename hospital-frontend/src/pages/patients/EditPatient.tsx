import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPatientById, updatePatient } from '../../services/patientService';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'admitted', label: 'Admitted' },
  { value: 'discharged', label: 'Discharged' },
  { value: 'outpatient', label: 'Outpatient' },
];

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPatientById(id)
      .then((patient) => {
        setName(patient.name);
        setAge(String(patient.age));
        setGender(patient.gender);
        setPhone(patient.phone);
        setBloodGroup(patient.bloodGroup);
        setAddress(patient.address);
        setStatus(patient.status);
      })
      .catch(() => setError('Could not load patient'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError('');
    setIsSubmitting(true);
    try {
      await updatePatient(id, {
        name, age: Number(age),
        gender: gender as 'male' | 'female' | 'other',
        phone, bloodGroup, address,
        status: status as 'admitted' | 'discharged' | 'outpatient',
      });
      navigate(`/patients/${id}`);
    } catch {
      setError('Could not save changes');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Layout><p className="text-gray-500">Loading...</p></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Edit patient</h1>
      <Card>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Input label="Name" value={name} onChange={setName} />
          <Input label="Age" type="number" value={age} onChange={setAge} />
          <Select label="Gender" value={gender} onChange={setGender} options={GENDERS} />
          <Input label="Phone" value={phone} onChange={setPhone} />
          <Input label="Blood group" value={bloodGroup} onChange={setBloodGroup} />
          <Input label="Address" value={address} onChange={setAddress} />
          <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save changes'}</Button>
        </form>
      </Card>
    </Layout>
  );
}