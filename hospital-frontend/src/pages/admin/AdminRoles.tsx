import { useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { getCustomRoles, createCustomRole } from '../../services/adminService';
import type { CustomRole } from '../../types/admin';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';

const FIXED_ROLES = [
  { name: 'Admin', access: 'Full access — dashboard, all modules, admin panel' },
  { name: 'Doctor', access: 'Dashboard, own patients/appointments, lab, pharmacy, billing' },
  { name: 'Receptionist', access: 'Dashboard, queue, patients, doctors, appointments, billing' },
  { name: 'Patient', access: 'My appointments, prescriptions, lab results, visits, invoices, profile' },
];

const PERMISSION_OPTIONS = ['View patients', 'Edit patients', 'View billing', 'Manage staff'];

export default function AdminRoles() {
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    getCustomRoles().then(setCustomRoles).catch(() => setError('Could not load custom roles')).finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function togglePermission(p: string) {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await createCustomRole({ name, description, permissions });
      setIsModalOpen(false);
      setName(''); setDescription(''); setPermissions([]);
      load();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Roles</h1>
        <Button onClick={() => setIsModalOpen(true)}><span className="flex items-center gap-1.5"><Plus size={16} />Create role</span></Button>
      </div>

      <div className="mb-4"><Alert variant="warning">Custom roles created here are saved, but won't yet restrict real pages — enforcing them needs the backend permissions engine (Person 2's RBAC work). This is the real management UI, with enforcement to follow once that exists.</Alert></div>

      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Built-in roles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {FIXED_ROLES.map((r) => (
          <Card key={r.name}>
            <div className="flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-primary" /><p className="font-medium">{r.name}</p></div>
            <p className="text-sm text-gray-500">{r.access}</p>
          </Card>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom roles</h2>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {!isLoading && customRoles.length === 0 && <p className="text-gray-500 text-sm">No custom roles created yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customRoles.map((r) => (
          <Card key={r.id}>
            <p className="font-medium mb-1">{r.name}</p>
            <p className="text-sm text-gray-500 mb-2">{r.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {r.permissions.map((p) => <span key={p} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">{p}</span>)}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create custom role">
        <Input label="Role name" value={name} onChange={setName} />
        <Input label="Description" value={description} onChange={setDescription} />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</p>
        <div className="space-y-2 mb-4">
          {PERMISSION_OPTIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={permissions.includes(p)} onChange={() => togglePermission(p)} />
              {p}
            </label>
          ))}
        </div>
        <Button onClick={handleSave} disabled={isSaving} fullWidth>{isSaving ? 'Creating...' : 'Create role'}</Button>
      </Modal>
    </Layout>
  );
}