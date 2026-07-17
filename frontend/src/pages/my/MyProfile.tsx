import { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { getPatientById, updatePatient } from '../../services/patientService';
import type { Patient } from '../../types/patient';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Input from '../../components/Input';
import StatusBadge from '../../components/StatusBadge';

export default function MyProfile() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    if (!user?.patientId) return;
    getPatientById(String(user.patientId)).then(setPatient).catch(() => setError('Could not load your profile'));
  }

  useEffect(load, [user?.patientId]);

  function startEdit() {
    if (!patient) return;
    setPhone(patient.phone);
    setAddress(patient.address);
    setIsEditing(true);
  }

  async function handleSave() {
    if (!patient || !user?.patientId) return;
    setIsSaving(true);
    try {
      await updatePatient(String(user.patientId), {
        name: patient.name, age: patient.age, gender: patient.gender,
        phone, address, bloodGroup: patient.bloodGroup, status: patient.status,
      });
      setIsEditing(false);
      load();
    } catch {
      setError('Could not save changes');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My profile</h1>
        {patient && !isEditing && <Button variant="secondary" size="sm" onClick={startEdit}>Edit</Button>}
      </div>
      {error && <Alert variant="error">{error}</Alert>}

      {patient && !isEditing && (
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500 text-sm">Name</span><p className="text-gray-900 dark:text-gray-100">{patient.name}</p></div>
            <div><span className="text-gray-500 text-sm">Age</span><p className="text-gray-900 dark:text-gray-100">{patient.age}</p></div>
            <div><span className="text-gray-500 text-sm">Phone</span><p className="text-gray-900 dark:text-gray-100">{patient.phone}</p></div>
            <div><span className="text-gray-500 text-sm">Blood group</span><p className="text-gray-900 dark:text-gray-100">{patient.bloodGroup}</p></div>
            <div className="col-span-2"><span className="text-gray-500 text-sm">Address</span><p className="text-gray-900 dark:text-gray-100">{patient.address}</p></div>
            <div><span className="text-gray-500 text-sm">Status</span><div className="mt-1"><StatusBadge status={patient.status} /></div></div>
          </div>
        </Card>
      )}

      {patient && isEditing && (
        <Card>
          <p className="text-xs text-gray-400 mb-4">Name, age, gender and blood group are managed by hospital staff. You can update your contact details below.</p>
          <Input label="Phone" value={phone} onChange={setPhone} />
          <Input label="Address" value={address} onChange={setAddress} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</Button>
          </div>
        </Card>
      )}
    </Layout>
  );
}