import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { getPatients } from '../../services/patientService';
import { getAppointments } from '../../services/appointmentService';
import { getInvoices } from '../../services/billingService';
import { exportToCsv } from '../../utils/csv';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Alert from '../../components/Alert';

export default function AdminReports() {
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  async function exportPatients() {
    setDownloading('patients');
    try {
      const patients = await getPatients();
      exportToCsv('patients-report.csv', ['ID', 'Name', 'Age', 'Phone', 'Status', 'Registered'],
        patients.map((p) => [p.id, p.name, p.age, p.phone, p.status, p.registeredAt ?? '-']));
    } catch {
      setError('Could not generate patients report');
    } finally {
      setDownloading('');
    }
  }

  async function exportAppointments() {
    setDownloading('appointments');
    try {
      const appointments = await getAppointments();
      exportToCsv('appointments-report.csv', ['ID', 'Patient', 'Doctor', 'Date', 'Time', 'Status'],
        appointments.map((a) => [a.id, a.patientName, a.doctorName, a.date, a.time, a.status]));
    } catch {
      setError('Could not generate appointments report');
    } finally {
      setDownloading('');
    }
  }

  async function exportRevenue() {
    setDownloading('revenue');
    try {
      const invoices = await getInvoices();
      exportToCsv('revenue-report.csv', ['Invoice', 'Patient', 'Date', 'Amount', 'Status'],
        invoices.map((i) => [`INV-${String(i.id).padStart(5, '0')}`, i.patientName, i.date, i.totalAmount, i.status]));
    } catch {
      setError('Could not generate revenue report');
    } finally {
      setDownloading('');
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <FileSpreadsheet size={20} className="text-primary mb-2" />
          <p className="font-medium mb-1">Patients report</p>
          <p className="text-sm text-gray-500 mb-4">Full patient list with status and registration date.</p>
          <Button variant="secondary" size="sm" onClick={exportPatients} disabled={downloading === 'patients'}>
            {downloading === 'patients' ? 'Preparing...' : 'Download CSV'}
          </Button>
        </Card>
        <Card>
          <FileSpreadsheet size={20} className="text-primary mb-2" />
          <p className="font-medium mb-1">Appointments report</p>
          <p className="text-sm text-gray-500 mb-4">All appointments with patient, doctor and status.</p>
          <Button variant="secondary" size="sm" onClick={exportAppointments} disabled={downloading === 'appointments'}>
            {downloading === 'appointments' ? 'Preparing...' : 'Download CSV'}
          </Button>
        </Card>
        <Card>
          <FileSpreadsheet size={20} className="text-primary mb-2" />
          <p className="font-medium mb-1">Revenue report</p>
          <p className="text-sm text-gray-500 mb-4">All invoices with amount and payment status.</p>
          <Button variant="secondary" size="sm" onClick={exportRevenue} disabled={downloading === 'revenue'}>
            {downloading === 'revenue' ? 'Preparing...' : 'Download CSV'}
          </Button>
        </Card>
      </div>
    </Layout>
  );
}