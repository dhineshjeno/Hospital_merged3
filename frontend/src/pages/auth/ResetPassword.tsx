import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/authService';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const otp = searchParams.get('otp') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword({ email, otp, newPassword });
      navigate('/login');
    } catch {
      setError('Could not reset password — the code may have expired');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card>
        <h1 className="text-2xl font-bold mb-1 text-center">Set new password</h1>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Input label="New password" type="password" value={newPassword} onChange={setNewPassword} />
          <Input label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Reset password'}</Button>
        </form>
      </Card>
    </div>
  );
}