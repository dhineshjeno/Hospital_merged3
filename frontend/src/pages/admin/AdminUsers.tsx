import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser } from '../../services/adminService';
import type { StaffUser } from '../../types/admin';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    setIsLoading(true);
    getStaffUsers().then(setUsers).catch(() => setError('Could not load staff')).finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function openAdd() {
    setEditingId(null);
    setName(''); setEmail(''); setPassword(''); setRole('doctor');
    setIsModalOpen(true);
  }

  function openEdit(u: StaffUser) {
    setEditingId(u.id);
    setName(u.name); setEmail(u.email); setPassword(''); setRole(u.role);
    setIsModalOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (editingId) {
        await updateStaffUser(editingId, { name, email, role });
      } else {
        await createStaffUser({ name, email, password, role });
      }
      setIsModalOpen(false);
      load();
    } catch {
      setError('Could not save staff member — email may already be in use');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Remove this staff member? They will lose access immediately.')) return;
    await deleteStaffUser(id);
    load();
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Button onClick={openAdd}><span className="flex items-center gap-1.5"><Plus size={16} />Add staff</span></Button>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading staff...</p>}
      {!isLoading && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Name</th><th className="py-2">Email</th><th className="py-2">Role</th><th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-slate-700">
                    <td className="py-2.5">{u.name}</td>
                    <td className="py-2.5 text-gray-500">{u.email}</td>
                    <td className="py-2.5 capitalize">{u.role}</td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => openEdit(u)} className="text-primary text-sm font-medium mr-3">Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="text-danger text-sm font-medium">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit staff member' : 'Add staff member'}>
        <Input label="Name" value={name} onChange={setName} />
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        {!editingId && <Input label="Temporary password" type="password" value={password} onChange={setPassword} />}
        <Select label="Role" value={role} onChange={setRole} options={ROLE_OPTIONS} />
        <Button onClick={handleSave} disabled={isSaving} fullWidth>{isSaving ? 'Saving...' : 'Save'}</Button>
      </Modal>
    </Layout>
  );
}