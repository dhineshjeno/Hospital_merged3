import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  sublabel?: string;
  icon?: ReactNode;
}

export default function StatCard({ label, value, sublabel, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-500 text-sm font-medium">{label}</p>
        {icon && <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>}
      </div>
      <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 font-mono tabular-nums">{value}</p>
      {sublabel && <p className="text-gray-400 text-xs mt-1">{sublabel}</p>}
    </div>
  );
}