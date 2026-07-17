interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  min?: string;
}

export default function Input({ label, value, onChange, type = 'text', placeholder, error, min }: InputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition ${
          error ? 'border-danger focus:ring-danger/30' : 'border-gray-300 dark:border-slate-600 focus:ring-primary/30 focus:border-primary'
        }`}
      />
      {error && <p className="text-danger text-sm mt-1">{error}</p>}
    </div>
  );
}