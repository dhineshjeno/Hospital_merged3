import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHospitals } from '../../services/hospitalService';
import type { Hospital } from '../../types/auth';
import Card from '../../components/Card';
import Alert from '../../components/Alert';

export default function HospitalSelect() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getHospitals().then(setHospitals).catch(() => setError('Could not load hospital list'));
  }, []);

  function handleSelect(hospital: Hospital) {
    localStorage.setItem('selectedHospitalId', String(hospital.id));
    localStorage.setItem('selectedHospitalName', hospital.name);
    navigate('/login');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card>
        <h1 className="text-2xl font-bold mb-1 text-center">Select your hospital</h1>
        <p className="text-gray-500 text-center mb-6">Choose where you're logging in from</p>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="space-y-2 min-w-[280px]">
          {hospitals.map((h) => (
            <button
              key={h.id}
              onClick={() => handleSelect(h)}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition"
            >
              {h.name}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}