import { useAuth } from '../store/AuthContext';
import Layout from '../components/Layout';
import AdminDashboard from './dashboard/AdminDashboard';
import DoctorDashboard from './dashboard/DoctorDashboard';
import ReceptionistDashboard from './dashboard/ReceptionistDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Layout>
      {user?.role === 'doctor' && <DoctorDashboard />}
      {user?.role === 'receptionist' && <ReceptionistDashboard />}
      {(user?.role === 'admin' || !user?.role) && <AdminDashboard />}
    </Layout>
  );
}