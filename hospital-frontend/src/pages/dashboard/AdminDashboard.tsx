import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Stethoscope, Calendar, Clock, Plus, ListOrdered, PackageSearch, FlaskConical, BedDouble } from 'lucide-react';
import { getPatients } from '../../services/patientService';
import { getDoctors } from '../../services/doctorService';
import { getAppointments } from '../../services/appointmentService';
import { getPharmacyStock } from '../../services/pharmacyService';
import { getLabResults } from '../../services/labService';
import { getOccupancyReport } from '../../services/wardService';
import type { Patient } from '../../types/patient';
import type { Doctor } from '../../types/doctor';
import type { Appointment } from '../../types/appointment';
import type { OccupancyReport } from '../../types/ward';
import { todayString } from '../../utils/date';
import { useAuth } from '../../store/AuthContext';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingLabCount, setPendingLabCount] = useState(0);
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getPatients(),
      getDoctors(),
      getAppointments(),
      getPharmacyStock(),
      getLabResults(),
      getOccupancyReport(),
    ])
      .then(([p, d, a, stock, labs, occ]) => {
        setPatients(p);
        setDoctors(d);
        setAppointments(a);
        setLowStockCount(stock.filter((s) => s.status === 'low-stock' || s.status === 'out-of-stock').length);
        setPendingLabCount(labs.filter((l) => l.status === 'pending').length);
        setOccupancy(occ);
      })
      .catch(() => setError('Could not load dashboard data'))
      .finally(() => setIsLoading(false));
  }, []);

  const todaysAppointments = appointments.filter((a) => a.date === todayString());
  const recentPatients = [...patients].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

  if (isLoading) return <p className="text-gray-500">Loading dashboard...</p>;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's what's happening across the hospital today.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total patients" value={patients.length} icon={<Users size={18} />} />
            <StatCard label="Total doctors" value={doctors.length} icon={<Stethoscope size={18} />} />
            <StatCard label="Total appointments" value={appointments.length} icon={<Calendar size={18} />} />
            <StatCard label="Today's appointments" value={todaysAppointments.length} icon={<Clock size={18} />} />
            <StatCard label="Pharmacy needs attention" value={lowStockCount} icon={<PackageSearch size={18} />} />
            <StatCard label="Pending lab results" value={pendingLabCount} icon={<FlaskConical size={18} />} />
            {occupancy && (
              <StatCard
                label="Beds available"
                value={occupancy.summary.available_beds}
                sublabel={`of ${occupancy.summary.total_beds} total`}
                icon={<BedDouble size={18} />}
              />
            )}
          </div>

          {(lowStockCount > 0 || pendingLabCount > 0) && (
            <div className="mb-6">
              <Alert variant="warning">
                {lowStockCount > 0 && `${lowStockCount} medicine(s) low or out of stock. `}
                {pendingLabCount > 0 && `${pendingLabCount} lab result(s) awaiting completion.`}
              </Alert>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={() => navigate('/patients/new')}>
              <span className="flex items-center gap-1.5"><Plus size={16} />Add patient</span>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/doctors/new')}>
              <span className="flex items-center gap-1.5"><Plus size={16} />Add doctor</span>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/queue')}>
              <span className="flex items-center gap-1.5"><ListOrdered size={16} />View queue</span>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/wards')}>
              <span className="flex items-center gap-1.5"><BedDouble size={16} />Ward status</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Today's appointments
              </h2>
              {todaysAppointments.length === 0 && (
                <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>
              )}
              <div className="space-y-1">
                {todaysAppointments.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/appointments/${a.id}`)}
                    className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 -mx-2 px-2 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.patientName}</p>
                      <p className="text-xs text-gray-500">with {a.doctorName} at {a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Recently added patients
              </h2>
              {recentPatients.length === 0 && (
                <p className="text-gray-500 text-sm">No patients yet.</p>
              )}
              <div className="space-y-1">
                {recentPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 -mx-2 px-2 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.phone}</p>
                  </div>
                ))}
              </div>
            </Card>

            {occupancy && occupancy.wards.length > 0 && (
              <Card>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Ward occupancy
                </h2>
                <div className="space-y-3">
                  {occupancy.wards.map((w) => (
                    <div key={w.ward_id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{w.ward_name}</p>
                        <p className={`text-sm font-mono font-semibold ${w.occupancy_pct >= 90 ? 'text-danger' : w.occupancy_pct >= 70 ? 'text-amber-500' : 'text-primary'}`}>
                          {w.occupancy_pct}%
                        </p>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${w.occupancy_pct >= 90 ? 'bg-danger' : w.occupancy_pct >= 70 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${w.occupancy_pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{w.available_beds} of {w.total_beds} beds available</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}