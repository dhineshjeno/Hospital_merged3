import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../../services/authService';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await forgotPassword({ email });
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch {
      setError('No account found with that email');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card>
        <h1 className="text-2xl font-bold mb-1 text-center">Forgot password</h1>
        <p className="text-gray-500 text-center mb-6">We'll send a code to verify it's you</p>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={email} onChange={setEmail} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send code'}</Button>
        </form>
      </Card>
    </div>
  );
}