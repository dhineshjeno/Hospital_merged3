export default function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-slate-700">{children}</div>;
}