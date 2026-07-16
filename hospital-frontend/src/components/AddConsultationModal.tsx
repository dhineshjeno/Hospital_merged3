import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createConsultation, recordVitals } from '../services/ehrService';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import Alert from './Alert';

interface AddConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  onSaved: () => void;
}

interface MedItem {
  medicine: string;
  dosage: string;
  frequency: string;
}

export default function AddConsultationModal({
  isOpen, onClose, appointmentId, patientId, doctorId, onSaved,
}: AddConsultationModalProps) {
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [notes, setNotes] = useState('');

  // Vitals
  const [temperature, setTemperature] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const [medicines, setMedicines] = useState<MedItem[]>([{ medicine: '', dosage: '', frequency: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  function updateMedicine(index: number, field: keyof MedItem, value: string) {
    setMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function addMedicine() {
    setMedicines((prev) => [...prev, { medicine: '', dosage: '', frequency: '' }]);
  }

  function removeMedicine(index: number) {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!chiefComplaint.trim()) {
      setError('Chief complaint is required');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      // Step 1: Create consultation record
      const consultation = await createConsultation({
        patientId,
        doctorId,
        appointmentId,
        chiefComplaint: chiefComplaint.trim(),
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Step 2: Record vitals if any were entered
      const hasVitals = temperature || bpSystolic || heartRate || oxygen || weight;
      if (hasVitals) {
        await recordVitals({
          patientId,
          consultationId: consultation.id,
          temperatureCelsius: temperature ? Number(temperature) : undefined,
          bloodPressureSystolic: bpSystolic ? Number(bpSystolic) : undefined,
          bloodPressureDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
          heartRateBpm: heartRate ? Number(heartRate) : undefined,
          oxygenSaturationPercent: oxygen ? Number(oxygen) : undefined,
          weightKg: weight ? Number(weight) : undefined,
          heightCm: height ? Number(height) : undefined,
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      setError('Could not save consultation — please try again');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add consultation notes">
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <Input
        label="Chief complaint *"
        value={chiefComplaint}
        onChange={setChiefComplaint}
        placeholder="What brought the patient in"
      />
      <Input label="Assessment / Diagnosis" value={assessment} onChange={setAssessment} />
      <Input label="Plan / Treatment" value={plan} onChange={setPlan} />
      <Input label="Notes" value={notes} onChange={setNotes} placeholder="Any additional notes" />

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3 mb-2">Vitals (optional)</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Input label="Temperature (°C)" value={temperature} onChange={setTemperature} type="number" placeholder="37.0" />
        <Input label="BP Systolic (mmHg)" value={bpSystolic} onChange={setBpSystolic} type="number" placeholder="120" />
        <Input label="BP Diastolic (mmHg)" value={bpDiastolic} onChange={setBpDiastolic} type="number" placeholder="80" />
        <Input label="Heart rate (bpm)" value={heartRate} onChange={setHeartRate} type="number" placeholder="72" />
        <Input label="SpO2 (%)" value={oxygen} onChange={setOxygen} type="number" placeholder="98" />
        <Input label="Weight (kg)" value={weight} onChange={setWeight} type="number" placeholder="70" />
        <Input label="Height (cm)" value={height} onChange={setHeight} type="number" placeholder="175" />
      </div>

      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Note:</strong> To add prescriptions, open the consultation record after saving and add them from there. Prescriptions require the consultation ID from this saved record.
        </p>
      </div>

      <Button onClick={handleSave} disabled={isSaving} fullWidth>
        {isSaving ? 'Saving consultation...' : 'Save & mark completed'}
      </Button>
    </Modal>
  );
}