interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
}

const variantStyles = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  children, variant = 'primary', size = 'md', disabled = false, onClick, type = 'button', fullWidth = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition`}
    >
      {children}
    </button>
  );
}