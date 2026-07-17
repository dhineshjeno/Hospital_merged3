import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginRequest } from '../../services/authService';
import { useAuth } from '../../store/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import Card from '../../components/Card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const data = await loginRequest(email, password);

      login(data.token, data.user);

      if (data.user.role === 'patient') {
        navigate('/patient-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 items-center">

        {/* Left Side */}
        <div className="hidden md:block">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">
            Hospital Management System
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            Manage patients, doctors and appointments from one professional dashboard.
          </p>

          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              ✓ Patient Records Management
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
              ✓ Doctor Scheduling
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
              ✓ Appointment Tracking
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
              ✓ Real-Time Dashboard
            </div>
          </div>
        </div>

        {/* Right Side Login */}
        <Card>
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
              🏥
            </div>

            <h2 className="text-3xl font-bold text-gray-800">
              Welcome Back
            </h2>

            <p className="text-gray-500 mt-2">
              Sign in to continue
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="doctor@hospital.com"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            <div className="mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            <Link
              to="/forgot-password"
              className="text-blue-600 font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </p>

          <p className="text-sm text-gray-500 text-center mt-2">
            New patient?{' '}
            <Link
              to="/register"
              className="text-blue-600 font-medium hover:underline"
            >
              Create an account
            </Link>
          </p>

          <p className="text-xs text-gray-400 text-center mt-4">
            <Link
              to="/select-hospital"
              className="hover:text-gray-600"
            >
              Multiple hospital locations?
            </Link>
          </p>

          <div className="mt-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border">
            <strong>Demo Accounts</strong>
            <br />
            doctor@hospital.com
            <br />
            admin@hospital.com
            <br />
            patient@hospital.com
            <br />
            Password: test123
          </div>

          <div className="mt-6 pt-4 border-t text-center text-xs text-gray-400">
            Hospital Management System v1.0
          </div>
        </Card>

      </div>
    </div>
  );
}