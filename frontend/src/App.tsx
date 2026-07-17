import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyOtp from './pages/auth/VerifyOtp';
import ResetPassword from './pages/auth/ResetPassword';
import HospitalSelect from './pages/auth/HospitalSelect';
import ProtectedRoute from './routes/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Queue from './pages/Queue';
import PatientsList from './pages/patients/PatientsList';
import PatientDetail from './pages/patients/PatientDetail';
import AddPatient from './pages/patients/AddPatient';
import EditPatient from './pages/patients/EditPatient';
import DoctorsList from './pages/doctors/DoctorsList';
import DoctorDetail from './pages/doctors/DoctorDetail';
import AddDoctor from './pages/doctors/AddDoctor';
import EditDoctor from './pages/doctors/EditDoctor';
import AppointmentsList from './pages/appointments/AppointmentsList';
import AppointmentDetail from './pages/appointments/AppointmentDetail';
import AddAppointment from './pages/appointments/AddAppointment';
import BookAppointment from './pages/appointments/BookAppointment';
import EditAppointment from './pages/appointments/EditAppointment';
import MyAppointments from './pages/my/MyAppointments';
import MyVisits from './pages/my/MyVisits';
import MyProfile from './pages/my/MyProfile';
import MyLabResults from './pages/my/MyLabResults';
import MyPrescriptions from './pages/my/MyPrescriptions';
import MyInvoices from './pages/my/MyInvoices';
import LabResultsList from './pages/lab/LabResultsList';
import LabResultDetail from './pages/lab/LabResultDetail';
import PharmacyStock from './pages/pharmacy/PharmacyStock';
import InvoicesList from './pages/billing/InvoicesList';
import InvoiceDetail from './pages/billing/InvoiceDetail';
import PatientDashboard from './pages/patients/PatientDashboard';
import AdminHospitals from './pages/admin/AdminHospitals';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRoles from './pages/admin/AdminRoles';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminReports from './pages/admin/AdminReports';
import WardsList from './pages/ward/WardsList';
import WardDetail from './pages/ward/WardDetail';
import AdmissionsList from './pages/ward/AdmissionsList';
import NewAdmission from './pages/ward/NewAdmission';
import RoomsOverview from './pages/rooms/RoomsOverview';


const STAFF = ['admin', 'doctor', 'nurse', 'pharmacist', 'accountant', 'lab_technician', 'staff'];export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/select-hospital" element={<HospitalSelect />} />

        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={STAFF}><Dashboard /></ProtectedRoute>} />
        <Route path="/queue" element={<ProtectedRoute allowedRoles={STAFF}><Queue /></ProtectedRoute>} />

        <Route path="/patients" element={<ProtectedRoute allowedRoles={STAFF}><PatientsList /></ProtectedRoute>} />
        <Route path="/patients/new" element={<ProtectedRoute allowedRoles={STAFF}><AddPatient /></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute allowedRoles={STAFF}><PatientDetail /></ProtectedRoute>} />
        <Route path="/patients/:id/edit" element={<ProtectedRoute allowedRoles={STAFF}><EditPatient /></ProtectedRoute>} />

        <Route path="/doctors" element={<ProtectedRoute allowedRoles={STAFF}><DoctorsList /></ProtectedRoute>} />
        <Route path="/doctors/new" element={<ProtectedRoute allowedRoles={STAFF}><AddDoctor /></ProtectedRoute>} />
        <Route path="/doctors/:id" element={<ProtectedRoute allowedRoles={STAFF}><DoctorDetail /></ProtectedRoute>} />
        <Route path="/doctors/:id/edit" element={<ProtectedRoute allowedRoles={STAFF}><EditDoctor /></ProtectedRoute>} />

        <Route path="/appointments" element={<ProtectedRoute allowedRoles={STAFF}><AppointmentsList /></ProtectedRoute>} />
<Route path="/appointments/new" element={<ProtectedRoute allowedRoles={STAFF}><AddAppointment /></ProtectedRoute>} />
        <Route path="/appointments/book" element={<ProtectedRoute allowedRoles={STAFF}><BookAppointment /></ProtectedRoute>} />        <Route path="/appointments/:id" element={<ProtectedRoute allowedRoles={STAFF}><AppointmentDetail /></ProtectedRoute>} />
        <Route path="/appointments/:id/edit" element={<ProtectedRoute allowedRoles={STAFF}><EditAppointment /></ProtectedRoute>} />

<Route path="/my/book" element={<ProtectedRoute allowedRoles={['patient']}><BookAppointment /></ProtectedRoute>} />
        <Route path="/my/appointments" element={<ProtectedRoute allowedRoles={['patient']}><MyAppointments /></ProtectedRoute>} />        <Route path="/my/visits" element={<ProtectedRoute allowedRoles={['patient']}><MyVisits /></ProtectedRoute>} />
<Route path="/my/profile" element={<ProtectedRoute allowedRoles={['patient']}><MyProfile /></ProtectedRoute>} />

        <Route path="/lab-results" element={<ProtectedRoute allowedRoles={STAFF}><LabResultsList /></ProtectedRoute>} />
        <Route path="/lab-results/:id" element={<ProtectedRoute allowedRoles={STAFF}><LabResultDetail /></ProtectedRoute>} />
        <Route path="/pharmacy" element={<ProtectedRoute allowedRoles={STAFF}><PharmacyStock /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute allowedRoles={STAFF}><InvoicesList /></ProtectedRoute>} />
        <Route path="/billing/:id" element={<ProtectedRoute allowedRoles={STAFF}><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/wards" element={<ProtectedRoute allowedRoles={STAFF}><WardsList /></ProtectedRoute>} />
        <Route path="/wards/:id" element={<ProtectedRoute allowedRoles={STAFF}><WardDetail /></ProtectedRoute>} />
        <Route path="/admissions" element={<ProtectedRoute allowedRoles={STAFF}><AdmissionsList /></ProtectedRoute>} />
        <Route path="/admissions/new" element={<ProtectedRoute allowedRoles={STAFF}><NewAdmission /></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute allowedRoles={STAFF}><RoomsOverview /></ProtectedRoute>} />

        <Route path="/my/lab-results" element={<ProtectedRoute allowedRoles={['patient']}><MyLabResults /></ProtectedRoute>} />
        <Route path="/my/lab-results/:id" element={<ProtectedRoute allowedRoles={['patient']}><LabResultDetail /></ProtectedRoute>} />
        <Route path="/my/prescriptions" element={<ProtectedRoute allowedRoles={['patient']}><MyPrescriptions /></ProtectedRoute>} />
        <Route path="/my/invoices" element={<ProtectedRoute allowedRoles={['patient']}><MyInvoices /></ProtectedRoute>} />
        <Route path="/my/invoices/:id" element={<ProtectedRoute allowedRoles={['patient']}><InvoiceDetail /></ProtectedRoute>} />        <Route
  path="/patient-dashboard"
  element={
    <ProtectedRoute>
      <PatientDashboard />
    </ProtectedRoute>
  }
/>

        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/admin/hospitals" element={<ProtectedRoute allowedRoles={['admin']}><AdminHospitals /></ProtectedRoute>} />
<Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
<Route path="/admin/roles" element={<ProtectedRoute allowedRoles={['admin']}><AdminRoles /></ProtectedRoute>} />
<Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />
<Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
<Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}