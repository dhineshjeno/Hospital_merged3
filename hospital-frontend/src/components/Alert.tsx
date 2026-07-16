interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

const styles = {
  success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-500',
  error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-500',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-500',
  info: 'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 border-teal-500',
};

export default function Alert({ variant, children }: AlertProps) {
  return <div className={`${styles[variant]} border-l-4 rounded-r-lg px-4 py-3 text-sm`}>{children}</div>;
}