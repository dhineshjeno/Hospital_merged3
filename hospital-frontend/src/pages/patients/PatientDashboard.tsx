import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome, {user?.name}
        </h1>

        <p className="text-gray-500 mt-2">
          Manage your health records and appointments.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-2">
            My Profile
          </h2>

          <button
            onClick={() => navigate('/my-profile')}
            className="text-blue-600"
          >
            View Profile →
          </button>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-2">
            My Appointments
          </h2>

          <button
            onClick={() => navigate('/my-appointments')}
            className="text-blue-600"
          >
            View Appointments →
          </button>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-2">
            Book Appointment
          </h2>

          <button
            onClick={() => navigate('/book-appointment')}
            className="text-blue-600"
          >
            Book Now →
          </button>
        </Card>
      </div>
    </Layout>
  );
}