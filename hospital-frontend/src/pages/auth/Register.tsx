import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../services/authService';
import { useAuth } from '../../store/AuthContext';
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

export default function Register() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !phone) {
      setError('Please fill in every field before continuing');
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const data = await register({
        name, email, password, phone,
        age: Number(age),
        gender: gender as 'male' | 'female' | 'other',
        bloodGroup, address,
      });
      login(data.token, data.user);
      navigate('/my/appointments');
    } catch {
      setError('Could not create account — that email may already be registered');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card>
        <h1 className="text-2xl font-bold mb-1 text-center">Create account</h1>
        <p className="text-gray-500 text-center mb-6">Step {step} of 2</p>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

        {step === 1 && (
          <form onSubmit={handleNext}>
            <Input label="Full name" value={name} onChange={setName} />
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Password" type="password" value={password} onChange={setPassword} />
            <Input label="Phone" value={phone} onChange={setPhone} />
            <Button type="submit">Continue</Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <Input label="Age" type="number" value={age} onChange={setAge} />
            <Select label="Gender" value={gender} onChange={setGender} options={GENDERS} />
            <Input label="Blood group" value={bloodGroup} onChange={setBloodGroup} />
            <Input label="Address" value={address} onChange={setAddress} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create account'}</Button>
            </div>
          </form>
        )}

        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account? <Link to="/login" className="text-primary font-medium">Log in</Link>
        </p>
      </Card>
    </div>
  );
}