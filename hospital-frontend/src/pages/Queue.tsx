import { useEffect, useMemo, useState } from 'react';
import { getQueue, checkIn, updateQueueStatus } from '../services/queueService';
import type { QueueEntry } from '../types/queue';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'emergency', label: 'Emergency' },
];

function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
}

export default function Queue() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    getQueue()
      .then(setQueue)
      .catch(() => setError('Could not load queue'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleCheckIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const entry = await checkIn({ patientName: name.trim(), priority: priority as 'normal' | 'emergency' });
      setQueue((prev) => [...prev, entry]);
      setName('');
      setPriority('normal');
    } catch {
      setError('Could not check in patient');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, status: 'called' | 'completed') {
    try {
      const updated = await updateQueueStatus(id, { status });
      setQueue((prev) => prev.map((q) => (q.id === id ? updated : q)));
    } catch {
      setError('Could not update queue entry');
    }
  }

  const active = useMemo(() => {
    const waiting = [...queue]
      .filter((q) => q.status === 'waiting')
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'emergency' ? -1 : 1;
        return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
      });
    const called = queue.filter((q) => q.status === 'called');
    return [...called, ...waiting];
  }, [queue]);

  const waitingEntries = queue.filter((q) => q.status === 'waiting');
  const calledCount = queue.filter((q) => q.status === 'called').length;
  const completedToday = queue.filter((q) => q.status === 'completed').length;
  const avgWait = waitingEntries.length
    ? Math.round(waitingEntries.reduce((sum, q) => sum + minutesSince(q.checkedInAt, now), 0) / waitingEntries.length)
    : 0;
  const firstWaitingId = active.find((q) => q.status === 'waiting')?.id;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Reception queue</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Waiting" value={waitingEntries.length} />
        <StatCard label="Being seen" value={calledCount} />
        <StatCard label="Avg wait" value={`${avgWait}m`} />
        <StatCard label="Completed today" value={completedToday} />
      </div>

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Check in a patient</h2>
        <form onSubmit={handleCheckIn} className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1"><Input label="Patient name" value={name} onChange={setName} placeholder="Walk-in name" /></div>
          <div className="w-full md:w-48"><Select label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} /></div>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Checking in...' : 'Check in'}</Button>
        </form>
      </Card>

      <div className="mt-6">
        {isLoading && <p className="text-gray-500">Loading queue...</p>}
        {!isLoading && active.length === 0 && <p className="text-gray-500 text-sm">No one in the queue right now.</p>}
        {!isLoading && active.length > 0 && (
          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Token</th><th className="py-2">Patient</th>
                  <th className="py-2">Waiting</th><th className="py-2">Status</th><th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {active.map((entry) => (
                  <tr key={entry.id} className={`border-b border-gray-100 ${entry.id === firstWaitingId ? 'bg-primary/5' : ''}`}>
                    <td className="py-3 font-mono">#{entry.tokenNumber}</td>
                    <td className="py-3">
                      {entry.patientName}
                      {entry.priority === 'emergency' && <span className="ml-2"><StatusBadge status="emergency" /></span>}
                      {entry.id === firstWaitingId && <span className="ml-2 text-xs text-primary font-medium">Next</span>}
                    </td>
                    <td className="py-3 font-mono">{minutesSince(entry.checkedInAt, now)}m</td>
                    <td className="py-3"><StatusBadge status={entry.status} /></td>
                    <td className="py-3">
                      {entry.status === 'waiting' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(entry.id, 'called')}>Call</Button>}
                      {entry.status === 'called' && <Button size="sm" onClick={() => handleStatusChange(entry.id, 'completed')}>Complete</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </Layout>
  );
}