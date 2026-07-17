import { useEffect, useState } from 'react';
import { getAuditLogs } from '../../services/adminService';
import type { AuditLogEntry } from '../../types/admin';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAuditLogs().then(setLogs).catch(() => setError('Could not load audit logs')).finally(() => setIsLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Audit logs</h1>
      <div className="mb-4"><Alert variant="info">Only login events are logged live right now. Full action coverage needs Person 2's audit middleware (P2-09) — this page is the real, working viewer for whatever it logs.</Alert></div>
      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <p className="text-gray-500">Loading logs...</p>}
      {!isLoading && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2">Time</th><th className="py-2">User</th><th className="py-2">Action</th><th className="py-2">Resource</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-slate-700">
                    <td className="py-2.5 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-2.5">{log.user}</td>
                    <td className="py-2.5 capitalize">{log.action}</td>
                    <td className="py-2.5 text-gray-500">{log.resource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Layout>
  );
}