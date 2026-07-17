import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Users, ChevronRight } from 'lucide-react';
import { getWards, getOccupancyReport } from '../../services/wardService';
import type { Ward, OccupancyReport } from '../../types/ward';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import StatCard from '../../components/StatCard';
import { TableSkeleton } from '../../components/Skeleton';

const WARD_TYPE_COLORS: Record<string, string> = {
  general: 'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300',
  icu: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300',
  emergency: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
  maternity: 'bg-pink-50 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300',
  pediatric: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
  surgical: 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300',
  psychiatric: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300',
};

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function WardsList() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [report, setReport] = useState<OccupancyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getWards(), getOccupancyReport()])
      .then(([w, r]) => { setWards(w); setReport(r); })
      .catch(() => setError('Could not load ward data'))
      .finally(() => setIsLoading(false));
  }, []);

  const pct = report?.summary.overall_occupancy_pct ?? 0;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Wards</h1>
        <button onClick={() => navigate('/admissions')}
          className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
          View all admissions <ChevronRight size={16} />
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {isLoading && <TableSkeleton />}

      {!isLoading && !error && report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total wards" value={report.summary.total_wards} icon={<BedDouble size={18} />} />
            <StatCard label="Total beds" value={report.summary.total_beds} icon={<BedDouble size={18} />} />
            <StatCard label="Available beds" value={report.summary.available_beds} icon={<BedDouble size={18} />} />
            <StatCard label="Occupied beds" value={report.summary.occupied_beds} icon={<Users size={18} />} />
          </div>

          {pct >= 90 && (
            <div className="mb-6">
              <Alert variant="warning">Hospital occupancy is at {pct}% — critically high. Consider patient transfers or discharge planning.</Alert>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {wards.map((ward) => {
              const wardPct = ward.totalBeds > 0 ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0;
              return (
                <Card key={ward.id}>
                  <button onClick={() => navigate(`/wards/${ward.id}`)} className="w-full text-left">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{ward.wardName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Floor {ward.floor ?? '—'} · {ward.wardCode}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${WARD_TYPE_COLORS[ward.wardType] ?? WARD_TYPE_COLORS.general}`}>
                        {ward.wardType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-gray-500">{ward.occupiedBeds}/{ward.totalBeds} beds</span>
                      <span className={`font-mono font-semibold ${wardPct >= 90 ? 'text-danger' : wardPct >= 70 ? 'text-amber-500' : 'text-primary'}`}>
                        {wardPct}%
                      </span>
                    </div>
                    <OccupancyBar pct={wardPct} />
                    <p className="text-xs text-primary mt-2 font-medium">{ward.availableBeds} beds available</p>
                  </button>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </Layout>
  );
}