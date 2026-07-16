import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, Users, Stethoscope, Calendar, History, User as UserIcon, Plus, FlaskConical, PackageSearch, Receipt, Pill, Building2, UserCog, ShieldCheck, ScrollText, BarChart3, FileSpreadsheet, Sun, Moon, BedDouble, Home } from 'lucide-react'; 
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import Button from './Button';

const STAFF_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/queue', label: 'Queue', icon: ListOrdered },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/lab-results', label: 'Lab results', icon: FlaskConical },
  { to: '/pharmacy', label: 'Pharmacy', icon: PackageSearch },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/wards', label: 'Wards', icon: BedDouble },
  { to: '/rooms', label: 'Rooms', icon: Home },
];

const ADMIN_NAV_ITEMS = [
  { to: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
  { to: '/admin/users', label: 'Staff', icon: UserCog },
  { to: '/admin/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
];

const PATIENT_NAV_ITEMS = [
  { to: '/my/book', label: 'Book appointment', icon: Plus },
  { to: '/my/appointments', label: 'My appointments', icon: Calendar },
  { to: '/my/prescriptions', label: 'My prescriptions', icon: Pill },
  { to: '/my/lab-results', label: 'My lab results', icon: FlaskConical },
  { to: '/my/visits', label: 'Visit history', icon: History },
  { to: '/my/invoices', label: 'My invoices', icon: Receipt },
  { to: '/my/profile', label: 'My profile', icon: UserIcon },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const ADMIN_ROLES = ['admin'];
const CLINICAL_ROLES = ['doctor', 'nurse'];
const SUPPORT_ROLES = ['pharmacist', 'accountant', 'lab_technician', 'staff'];

const navItems = user?.role === 'patient'
  ? PATIENT_NAV_ITEMS
  : ADMIN_ROLES.includes(user?.role ?? '')
  ? [...STAFF_NAV_ITEMS, ...ADMIN_NAV_ITEMS]
  : STAFF_NAV_ITEMS;

  const currentLabel = navItems.find((item) => location.pathname.startsWith(item.to))?.label ?? '';

  return (
    <div className="min-h-screen flex bg-surface">
      {isMenuOpen && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setIsMenuOpen(false)} />}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-60 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col shrink-0 transition-transform duration-200 overflow-y-auto ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <span className="font-semibold text-primary">Hospital MS</span>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium border-l-4 transition ${active ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100'}`}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 dark:border-slate-700 p-4 shrink-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize mb-3">{user?.role}</p>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl py-1.5 mb-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <Button variant="secondary" size="sm" fullWidth onClick={handleLogout}>Logout</Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center px-4 md:px-8 gap-3 shrink-0">
          <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-400" aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{currentLabel}</h2>
        </header>
        <main key={location.pathname} className="flex-1 p-4 md:p-8 page-fade-in">{children}</main>
      </div>
    </div>
  );
}