import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { getHospitals } from '../../services/hospitalService';
import { updateHospital } from '../../services/adminService';
import type { Hospital } from '../../types/auth';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';

export default function AdminHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [name, setName] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getHospitals().then(setHospitals).catch(() => setError('Could not load hospitals')).finally(() => setIsLoading(false));
  }, []);

  function openEdit(h: Hospital) {
    setEditing(h);
    setName(h.name);
    setOpeningTime(h.openingTime ?? '');
    setClosingTime(h.closingTime ?? '');
  }

  async function handleSave() {
    if (!editing) return;
    setIsSaving(true);
    try {
      const updated = await updateHospital(editing.id, { name, openingTime, closingTime });
      setHospitals((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setEditing(null);
    } catch {
      setError('Could not save hospital settings');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-2">Hospitals</h1>
      <p className="text-gray-500 text-sm mb-6">Manage hospital branding and timings.</p>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="mb-4"><Alert variant="info">Subscription status is managed by the backend billing system once built — shown here read-only.</Alert></div>
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hospitals.map((h) => (
            <Card key={h.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-primary" />
                  <p className="font-medium">{h.name}</p>
                </div>
                {h.subscriptionStatus && <StatusBadge status={h.subscriptionStatus === 'active' ? 'available' : h.subscriptionStatus === 'trial' ? 'pending' : 'cancelled'} />}
              </div>
              <p className="text-sm text-gray-500 mb-4">{h.openingTime ?? '-'} – {h.closingTime ?? '-'}</p>
              <Button variant="secondary" size="sm" onClick={() => openEdit(h)}>Edit settings</Button>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Hospital settings">
        <Input label="Hospital name" value={name} onChange={setName} />
        <Input label="Opening time" type="time" value={openingTime} onChange={setOpeningTime} />
        <Input label="Closing time" type="time" value={closingTime} onChange={setClosingTime} />
        <Button onClick={handleSave} disabled={isSaving} fullWidth>{isSaving ? 'Saving...' : 'Save settings'}</Button>
      </Modal>
    </Layout>
  );
}