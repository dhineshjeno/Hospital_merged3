import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { getDoctors } from '../../services/doctorService';
import { getPatients } from '../../services/patientService';
import { getAppointments, createAppointment } from '../../services/appointmentService';
import type { Doctor } from '../../types/doctor';
import type { Patient } from '../../types/patient';
import type { Appointment } from '../../types/appointment';
import { useAuth } from '../../store/AuthContext';
import { todayString } from '../../utils/date';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import { getAvailableSlots } from '../../services/appointmentService';

function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h < 17; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

function buildIcsFile(doctorName: string, date: string, time: string, reason: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const start = new Date(year, month - 1, day, hour, minute);
  const end = new Date(start.getTime() + 30 * 60000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, `SUMMARY:Appointment with ${doctorName}`, `DESCRIPTION:${reason || 'Hospital appointment'}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BookAppointment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role !== 'patient';
  const STEPS = isStaff
    ? ['patient', 'doctor', 'date', 'time', 'reason', 'review']
    : ['doctor', 'date', 'time', 'reason', 'review'];

  const [stepIndex, setStepIndex] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  const [patientId, setPatientId] = useState(isStaff ? '' : String(user?.patientId ?? ''));
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
const [slotsLoading, setSlotsLoading] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    Promise.all([getDoctors(), getAppointments(), isStaff ? getPatients() : Promise.resolve([])])
      .then(([d, a, p]) => { setDoctors(d); setAppointments(a); setPatients(p); })
      .catch(() => setError('Could not load booking data'))
      .finally(() => setIsLoading(false));
  }, [isStaff]);
  useEffect(() => {
  if (!doctorId || !date) { setAvailableSlots([]); return; }
  setSlotsLoading(true);
  getAvailableSlots(doctorId, date)
    .then((slots) => setAvailableSlots(slots.map((s) => s.start_time)))
    .catch(() => setAvailableSlots([]))
    .finally(() => setSlotsLoading(false));
}, [doctorId, date]);

  const selectedDoctor = doctors.find((d) => String(d.id) === doctorId);
  const selectedPatient = patients.find((p) => String(p.id) === patientId);

  const bookedTimes = useMemo(() => {
    return new Set(
      appointments
        .filter((a) => String(a.doctorId) === doctorId && a.date === date && a.status !== 'cancelled')
        .map((a) => a.time)
    );
  }, [appointments, doctorId, date]);

  const currentStep = STEPS[stepIndex];

  function canGoNext(): boolean {
    if (currentStep === 'patient') return !!patientId;
    if (currentStep === 'doctor') return !!doctorId;
    if (currentStep === 'date') return !!date;
  {currentStep === 'time' && (
  <div>
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select time</h2>
    {slotsLoading && <p className="text-gray-500 text-sm">Loading available slots...</p>}
    {!slotsLoading && availableSlots.length === 0 && (
      <Alert variant="warning">No available slots for this doctor on this date. Try a different date.</Alert>
    )}
    {!slotsLoading && availableSlots.length > 0 && (
      <div className="grid grid-cols-4 gap-2">
        {availableSlots.map((slot) => (
          <button key={slot} onClick={() => setTime(slot)}
            className={`py-2 rounded-lg text-sm border transition ${
              time === slot
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:text-gray-200'
            }`}>
            {slot}
          </button>
        ))}
      </div>
    )}
  </div>
)}
    return true;
  }

  function handleNext() {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  }

  function handleBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

 async function handleConfirm() {
  setError('');
  setIsSubmitting(true);
  try {
    const entry = await createAppointment({
      patientId: patientId,
      doctorId: doctorId,
      date,
      time,
      reason,
      appointmentType: 'Consultation',
      status: 'scheduled',
    });
    setConfirmed(entry);
  } catch {
    setError('Could not book the appointment — please try again');
  } finally {
    setIsSubmitting(false);
  }
}

  if (isLoading) return <Layout><p className="text-gray-500">Loading...</p></Layout>;

  if (confirmed) {
    const confirmationNumber = `APT-${String(confirmed.id).padStart(5, '0')}`;
    return (
      <Layout>
        <div className="max-w-lg mx-auto">
          <Card>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center mx-auto mb-3">
                <Check size={24} />
              </div>
              <h1 className="text-xl font-bold">Appointment confirmed</h1>
              <p className="text-gray-500 text-sm mt-1">Confirmation number: <span className="font-mono">{confirmationNumber}</span></p>
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm mb-6">
              <div className="flex justify-between"><span className="text-gray-500">Patient</span><span>{confirmed.patientName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span>{confirmed.doctorName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{confirmed.date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span>{confirmed.time}</span></div>
              {confirmed.reason && <div className="flex justify-between"><span className="text-gray-500">Reason</span><span>{confirmed.reason}</span></div>}
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={() => downloadFile(`${confirmationNumber}.ics`, buildIcsFile(confirmed.doctorName, confirmed.date, confirmed.time, confirmed.reason), 'text/calendar')}>
                Add to calendar
              </Button>
              <Button variant="secondary" onClick={() => downloadFile(`${confirmationNumber}.txt`, [
                'APPOINTMENT CONFIRMATION', '========================',
                `Confirmation #: ${confirmationNumber}`, `Patient: ${confirmed.patientName}`,
                `Doctor: ${confirmed.doctorName}`, `Date: ${confirmed.date}`, `Time: ${confirmed.time}`,
                `Reason: ${confirmed.reason || '-'}`,
              ].join('\n'), 'text/plain')}>
                Download confirmation
              </Button>
              <Button onClick={() => navigate(isStaff ? '/appointments' : '/my/appointments')}>Done</Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-1">Book appointment</h1>
        <p className="text-gray-500 text-sm mb-6">Step {stepIndex + 1} of {STEPS.length}</p>

        <div className="flex gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        <Card>
          {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

          {currentStep === 'patient' && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Select patient</h2>
              <div className="space-y-2">
                {patients.map((p) => (
                  <button key={p.id} onClick={() => setPatientId(String(p.id))}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${patientId === String(p.id) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.phone}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'doctor' && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Select doctor</h2>
              <div className="space-y-2">
                {doctors.map((d) => (
                  <button key={d.id} onClick={() => setDoctorId(String(d.id))}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${doctorId === String(d.id) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.specialty}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'date' && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Select date</h2>
              <Input label="Appointment date" type="date" value={date} onChange={setDate} min={todayString()} />
            </div>
          )}

          {currentStep === 'time' && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Select time</h2>
              <div className="grid grid-cols-4 gap-2">
                {generateSlots().map((slot) => {
                  const isBooked = bookedTimes.has(slot);
                  return (
                    <button key={slot} disabled={isBooked} onClick={() => setTime(slot)}
                      className={`py-2 rounded-lg text-sm border transition ${
                        isBooked ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : time === slot ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 'reason' && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Reason for visit</h2>
              <Input label="Reason (optional)" value={reason} onChange={setReason} placeholder="Briefly describe the reason" />
            </div>
          )}

          {currentStep === 'review' && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Review &amp; confirm</h2>
              <div className="space-y-2 text-sm">
                {isStaff && <div className="flex justify-between"><span className="text-gray-500">Patient</span><span>{selectedPatient?.name}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span>{selectedDoctor?.name} ({selectedDoctor?.specialty})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{date}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Time</span><span>{time}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Reason</span><span>{reason || '-'}</span></div>
              </div>
            </div>
          )}

          </Card>
      </div>

      <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 -mx-4 md:-mx-8 px-4 md:px-8 py-4">
        <div className="max-w-lg mx-auto flex justify-between">
          <Button key={`back-${currentStep}`} variant="secondary" onClick={handleBack} disabled={stepIndex === 0}>Back</Button>
          {currentStep === 'review' ? (
            <Button key="confirm" onClick={handleConfirm} disabled={isSubmitting}>{isSubmitting ? 'Booking...' : 'Confirm booking'}</Button>
          ) : (
            <Button key={`next-${currentStep}`} onClick={handleNext} disabled={!canGoNext()}>Next</Button>
          )}
        </div>
      </div>
    </Layout>
  );
}