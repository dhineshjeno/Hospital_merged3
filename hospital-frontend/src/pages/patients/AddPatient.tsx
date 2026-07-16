import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createPatient } from '../../services/patientService';
import Layout from '../../components/Layout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Select from '../../components/Select';

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

export default function AddPatient() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('other');
  const [status, setStatus] = useState('outpatient');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await createPatient({
        name,
        age: Number(age),
        gender: gender as 'male' | 'female' | 'other',
        phone,
        bloodGroup,
        address,
        status: status as 'admitted' | 'discharged' | 'outpatient',
      });

      toast.success('Patient added successfully');
navigate('/patients');
    } catch {
      toast.error('Failed to save patient');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">
        Add Patient
      </h1>

      <Card>
        {error && (
          <div className="mb-4">
            <Alert variant="error">
              {error}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Name"
            value={name}
            onChange={setName}
          />

          <Input
            label="Age"
            type="number"
            value={age}
            onChange={setAge}
          />

          <Select
            label="Gender"
            value={gender}
            onChange={setGender}
            options={GENDERS}
          />

          <Input
            label="Phone"
            value={phone}
            onChange={setPhone}
          />

          <Input
            label="Blood Group"
            value={bloodGroup}
            onChange={setBloodGroup}
          />

          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={STATUSES}
          />

          <Input
            label="Address"
            value={address}
            onChange={setAddress}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Patient'}
          </Button>
        </form>
      </Card>
    </Layout>
  );
}