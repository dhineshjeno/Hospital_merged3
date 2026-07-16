import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyOtp } from '../../services/authService';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

export default function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await verifyOtp({ email, otp });
      navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`);
    } catch {
      setError('Incorrect code — check and try again');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card>
        <h1 className="text-2xl font-bold mb-1 text-center">Enter code</h1>
        <p className="text-gray-500 text-center mb-6">Sent to {email} (mock code: 123456)</p>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Input label="6-digit code" value={otp} onChange={setOtp} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Verifying...' : 'Verify'}</Button>
        </form>
      </Card>
    </div>
  );
}