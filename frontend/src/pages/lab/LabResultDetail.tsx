import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FlaskConical } from 'lucide-react';
import { getLabResultById } from '../../services/labService';
import type { LabResult } from '../../types/lab';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LabResultDetail() {
  const { id } = useParams();
  const [result, setResult] = useState<LabResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getLabResultById(id).then(setResult).catch(() => setError('Could not load lab result'));
  }, [id]);

  function handleDownload() {
    if (!result) return;
    downloadFile(`lab-result-${result.id}.txt`, [
      'LAB RESULT', '==========',
      `Patient: ${result.patientName}`, `Test: ${result.testName}`,
      `Date: ${result.date}`, `Ordered by: ${result.doctorName}`,
      `Status: ${result.status}`,
      result.status === 'completed' ? `Value: ${result.value} ${result.unit}` : '',
      result.referenceRange ? `Reference range: ${result.referenceRange}` : '',
      result.isAbnormal ? 'Flag: ABNORMAL' : '',
    ].filter(Boolean).join('\n'), 'text/plain');
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Lab result</h1>
        {result && (
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <span className="flex items-center gap-1.5"><Download size={14} />Download</span>
          </Button>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {result && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={18} className="text-primary" />
            <p className="font-medium">{result.testName}</p>
            {result.isAbnormal && <StatusBadge status="abnormal" />}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><span className="text-gray-500 text-sm">Patient</span><p>{result.patientName}</p></div>
            <div><span className="text-gray-500 text-sm">Ordered by</span><p>{result.doctorName}</p></div>
            <div><span className="text-gray-500 text-sm">Date</span><p>{result.date}</p></div>
            <div><span className="text-gray-500 text-sm">Status</span><div className="mt-1"><StatusBadge status={result.status} /></div></div>
          </div>
          {result.status === 'completed' ? (
            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg py-3">
                  <p className="text-xs text-gray-400">Value</p>
                  <p className={`text-lg font-mono mt-0.5 ${result.isAbnormal ? 'text-danger' : 'text-gray-900'}`}>{result.value} {result.unit}</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-3 col-span-2">
                  <p className="text-xs text-gray-400">Reference range</p>
                  <p className="text-lg font-mono mt-0.5">{result.referenceRange}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">Result pending — check back once the test is processed.</p>
          )}
        </Card>
      )}
    </Layout>
  );
}