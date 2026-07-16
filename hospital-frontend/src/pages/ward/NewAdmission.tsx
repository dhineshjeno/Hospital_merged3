import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getWards, getRoomsForWard, getBedsForWard, createAdmission,
} from '../../services/wardService';
import { getDoctors } from '../../services/doctorService';
import { getPatients } from '../../services/patientService';
import type { Ward, Bed } from '../../types/ward';
import type { Doctor } from '../../types/doctor';
import type { Patient } from '../../types/patient';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Select from '../../components/Select';
import Input from '../../components/Input';
import { todayString } from '../../utils/date';

interface Room {
  room_id: string;
  room_number: string;
  room_type: string;
  available_beds: number;
  total_beds: number;
}

export default function NewAdmission() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledBedId = searchParams.get('bedId') ?? '';
  const prefilledWardId = searchParams.get('wardId') ?? '';

  const [wards, setWards] = useState<Ward[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingBeds, setIsLoadingBeds] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [wardId, setWardId] = useState(prefilledWardId);
  const [roomId, setRoomId] = useState('');
  const [bedId, setBedId] = useState(prefilledBedId);
  const [doctorId, setDoctorId] = useState('');
  const [admissionDate, setAdmissionDate] = useState(todayString());
  const [expectedDischargeDate, setExpectedDischargeDate] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  useEffect(() => {
    Promise.all([getWards(), getPatients(), getDoctors()])
      .then(([w, p, d]) => { setWards(w); setPatients(p); setDoctors(d); })
      .catch(() => setError('Could not load data'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!wardId) { setRooms([]); setRoomId(''); setBeds([]); setBedId(''); return; }
    setIsLoadingRooms(true);
    getRoomsForWard(wardId)
      .then(setRooms)
      .catch(() => setError('Could not load rooms for this ward'))
      .finally(() => setIsLoadingRooms(false));
  }, [wardId]);

  useEffect(() => {
    if (!wardId || !roomId) { setBeds([]); setBedId(''); return; }
    setIsLoadingBeds(true);
    getBedsForWard(wardId, 'Available')
      .then((allBeds) => setBeds(allBeds.filter((b) => b.status === 'Available' || b.status === 'available')))
      .catch(() => setError('Could not load beds for this room'))
      .finally(() => setIsLoadingBeds(false));
  }, [wardId, roomId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!patientId || !wardId || !roomId || !bedId || !doctorId) {
      setError('Please fill in all required fields including ward, room and bed');
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdmission({
        patientId,
        wardId,
        bedId,
        admittingDoctorId: doctorId,
        admissionDate,
        expectedDischargeDate: expectedDischargeDate || undefined,
        diagnosis: diagnosis || undefined,
      });
      navigate('/admissions');
    } catch {
      setError('Could not create admission — the bed may already be occupied');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Layout><p className="text-gray-500">Loading...</p></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Admit patient</h1>
      <Card>
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
        <form onSubmit={handleSubmit}>
          <Select
            label="Patient *"
            value={patientId}
            onChange={setPatientId}
            options={patients
              .filter((p) => p.isActive !== false)
              .map((p) => ({ value: p.id, label: `${p.name} · ${p.phone}` }))}
          />

          <Select
            label="Ward *"
            value={wardId}
            onChange={(v) => { setWardId(v); setRoomId(''); setBedId(''); }}
            options={wards
              .filter((w) => w.isActive && w.availableBeds > 0)
              .map((w) => ({ value: w.id, label: `${w.wardName} (${w.availableBeds} beds available)` }))}
          />

          {wardId && (
            <>
              {isLoadingRooms && <p className="text-sm text-gray-500 mb-4">Loading rooms...</p>}
              {!isLoadingRooms && rooms.length === 0 && (
                <div className="mb-4"><Alert variant="warning">No rooms in this ward yet.</Alert></div>
              )}
              {!isLoadingRooms && rooms.length > 0 && (
                <Select
                  label="Room *"
                  value={roomId}
                  onChange={(v) => { setRoomId(v); setBedId(''); }}
                  options={rooms
                    .filter((r) => r.available_beds > 0)
                    .map((r) => ({
                      value: r.room_id,
                      label: `Room ${r.room_number} — ${r.room_type} (${r.available_beds}/${r.total_beds} available)`,
                    }))}
                />
              )}
            </>
          )}

          {roomId && (
            <>
              {isLoadingBeds && <p className="text-sm text-gray-500 mb-4">Loading beds...</p>}
              {!isLoadingBeds && beds.length === 0 && (
                <div className="mb-4"><Alert variant="warning">No available beds in this room.</Alert></div>
              )}
              {!isLoadingBeds && beds.length > 0 && (
                <Select
                  label="Bed *"
                  value={bedId}
                  onChange={setBedId}
                  options={beds.map((b) => ({ value: b.id, label: `Bed ${b.bedNumber}` }))}
                />
              )}
            </>
          )}

          <Select
            label="Admitting doctor *"
            value={doctorId}
            onChange={setDoctorId}
            options={doctors.map((d) => ({ value: d.id, label: `${d.name} (${d.specialty})` }))}
          />

          <Input label="Admission date" type="date" value={admissionDate} onChange={setAdmissionDate} min={todayString()} />
          <Input label="Expected discharge date" type="date" value={expectedDischargeDate} onChange={setExpectedDischargeDate} min={admissionDate} />
          <Input label="Primary diagnosis / admission reason" value={diagnosis} onChange={setDiagnosis} placeholder="Brief description of condition" />

          <div className="flex gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/admissions')}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting || !patientId || !wardId || !roomId || !bedId || !doctorId}
            >
              {isSubmitting ? 'Admitting...' : 'Admit patient'}
            </Button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}