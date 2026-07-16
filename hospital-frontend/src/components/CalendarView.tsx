import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../types/appointment';
import { updateAppointment } from '../services/appointmentService';
import Modal from './Modal';
import Button from './Button';
import StatusBadge from './StatusBadge';
import Input from './Input';

interface CalendarViewProps {
  appointments: Appointment[];
  onChanged: () => void;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarView({ appointments, onChanged }: CalendarViewProps) {
  const navigate = useNavigate();
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    });
    return map;
  }, [appointments]);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDayWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDayWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function changeMonth(delta: number) {
    setMonthCursor(new Date(year, month + delta, 1));
  }

  function openDay(day: number) {
    setSelectedDate(toDateKey(new Date(year, month, day)));
  }

  function openDetail(a: Appointment) {
    setSelected(a);
    setRescheduleDate(a.date);
    setRescheduleTime(a.time);
  }

  async function handleReschedule() {
    if (!selected) return;
    setIsSaving(true);
    try {
      await updateAppointment(String(selected.id), {
        patientId: selected.patientId, doctorId: selected.doctorId,
        date: rescheduleDate, time: rescheduleTime, reason: selected.reason, status: selected.status,
      });
      setSelected(null);
      setSelectedDate(null);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel() {
    if (!selected) return;
    if (!window.confirm('Cancel this appointment?')) return;
    setIsSaving(true);
    try {
      await updateAppointment(String(selected.id), {
        patientId: selected.patientId, doctorId: selected.doctorId,
        date: selected.date, time: selected.time, reason: selected.reason, status: 'cancelled',
      });
      setSelected(null);
      setSelectedDate(null);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  const dayAppointments = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Previous month"><ChevronLeft size={18} /></button>
        <p className="text-sm font-semibold">{monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Next month"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = toDateKey(new Date(year, month, day));
          const dayItems = byDate.get(key) ?? [];
          const isToday = key === toDateKey(new Date());
          return (
            <button key={i} onClick={() => openDay(day)}
              className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center gap-0.5 transition hover:bg-gray-50 ${isToday ? 'border-primary' : 'border-gray-100'}`}>
              <span className={isToday ? 'text-primary font-semibold' : ''}>{day}</span>
              {dayItems.length > 0 && <span className="text-[10px] font-mono text-gray-400">{dayItems.length}</span>}
            </button>
          );
        })}
      </div>

      <Modal isOpen={!!selectedDate} onClose={() => setSelectedDate(null)} title={selectedDate ?? ''}>
        {dayAppointments.length === 0 && <p className="text-sm text-gray-500">No appointments on this day.</p>}
        <div className="space-y-2">
          {dayAppointments.map((a) => (
            <button key={a.id} onClick={() => openDetail(a)} className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-300 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{a.time} — {a.patientName}</p>
                <p className="text-xs text-gray-500">{a.doctorName}</p>
              </div>
              <StatusBadge status={a.status} />
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Appointment details">
        {selected && (
          <div>
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-500">Patient</span><span>{selected.patientName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span>{selected.doctorName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reason</span><span>{selected.reason || '-'}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><StatusBadge status={selected.status} /></div>
            </div>
            {selected.status === 'scheduled' && (
              <>
                <div className="border-t border-gray-100 pt-4 mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Reschedule</p>
                  <Input label="Date" type="date" value={rescheduleDate} onChange={setRescheduleDate} />
                  <Input label="Time" type="time" value={rescheduleTime} onChange={setRescheduleTime} />
                  <Button size="sm" onClick={handleReschedule} disabled={isSaving} fullWidth>
                    {isSaving ? 'Saving...' : 'Save new date/time'}
                  </Button>
                </div>
                <Button size="sm" variant="danger" onClick={handleCancel} disabled={isSaving} fullWidth>Cancel appointment</Button>
              </>
            )}
            <div className="mt-3">
              <Button size="sm" variant="secondary" fullWidth onClick={() => navigate(`/appointments/${selected.id}`)}>View full details</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}