import { useState } from 'react';
import { Printer, Pill, Activity } from 'lucide-react';
import type { Appointment } from '../types/appointment';
import Card from './Card';
import Input from './Input';
import Button from './Button';

interface HealthTimelineProps {
  appointments: Appointment[];
}

export default function HealthTimeline({ appointments }: HealthTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const visits = appointments
    .filter((a) => a.status === 'completed' && (a.diagnosis || a.chiefComplaint))
    .filter((a) => !fromDate || a.date >= fromDate)
    .filter((a) => !toDate || a.date <= toDate)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
        <div className="w-40"><Input label="From" type="date" value={fromDate} onChange={setFromDate} /></div>
        <div className="w-40"><Input label="To" type="date" value={toDate} onChange={setToDate} /></div>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <span className="flex items-center gap-1.5"><Printer size={14} />Print</span>
        </Button>
      </div>

      {visits.length === 0 && <p className="text-gray-500 text-sm">No recorded visits in this range.</p>}

      <div className="relative pl-6 space-y-4">
        {visits.length > 0 && <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />}
        {visits.map((v) => {
          const isExpanded = expandedId === v.id;
          return (
            <div key={v.id} className="relative">
              <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white" />
              <Card>
                <button onClick={() => setExpandedId(isExpanded ? null : v.id)} className="w-full text-left">
                  <p className="text-xs text-gray-400 mb-1">{v.date}</p>
                  <p className="font-medium">{v.doctorName}</p>
                  <p className="text-sm text-gray-500 mt-1">{v.diagnosis || v.chiefComplaint}</p>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {v.chiefComplaint && (
                      <div><p className="text-xs text-gray-500 mb-0.5">Chief complaint</p><p className="text-sm">{v.chiefComplaint}</p></div>
                    )}
                    {v.diagnosis && (
                      <div><p className="text-xs text-gray-500 mb-0.5">Diagnosis</p><p className="text-sm">{v.diagnosis}</p></div>
                    )}
                    {v.vitals && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Activity size={12} />Vitals</p>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">BP</p><p className="text-sm font-mono">{v.vitals.bp || '-'}</p></div>
                          <div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">Temp</p><p className="text-sm font-mono">{v.vitals.temperature || '-'}</p></div>
                          <div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">Weight</p><p className="text-sm font-mono">{v.vitals.weight || '-'}</p></div>
                          <div className="bg-gray-50 rounded-lg py-2"><p className="text-xs text-gray-400">SpO2</p><p className="text-sm font-mono">{v.vitals.oxygen || '-'}</p></div>
                        </div>
                      </div>
                    )}
                    {v.prescriptions && v.prescriptions.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Pill size={12} />Prescriptions</p>
                        <div className="space-y-1.5">
                          {v.prescriptions.map((p, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                              <span className="font-medium">{p.medicine}</span>
                              <span className="text-gray-500 text-xs">{p.dosage} · {p.frequency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}