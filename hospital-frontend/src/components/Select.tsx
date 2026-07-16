interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
}

export default function Select({ label, value, onChange, options, error }: SelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition ${
          error ? 'border-danger focus:ring-danger/30' : 'border-gray-300 dark:border-slate-600 focus:ring-primary/30 focus:border-primary'
        }`}
      >
        <option value="">Select...</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {error && <p className="text-danger text-sm mt-1">{error}</p>}
    </div>
  );
}