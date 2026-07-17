type KnownStatus =
  | 'admitted' | 'discharged' | 'outpatient' | 'inactive'
  | 'available' | 'on-leave' | 'in-surgery'
  | 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  | 'waiting' | 'called' | 'emergency'
  | 'pending' | 'paid'
  | 'in-stock' | 'low-stock' | 'out-of-stock'
  | 'abnormal'
  | 'active' | 'transferred'
  | 'maintenance' | 'reserved';

const STATUS_STYLES: Record<KnownStatus, string> = {
  admitted:      'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  outpatient:    'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  discharged:    'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600',
  inactive:      'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600',
  available:     'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  'in-surgery':  'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  'on-leave':    'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600',
  scheduled:     'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  completed:     'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  cancelled:     'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600',
  'no-show':     'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  waiting:       'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600',
  called:        'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  emergency:     'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  pending:       'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  paid:          'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  'in-stock':    'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  'low-stock':   'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'out-of-stock':'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  abnormal:      'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  active:        'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  transferred:   'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  maintenance:   'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  reserved:      'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as KnownStatus]
    ?? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {status}
    </span>
  );
}