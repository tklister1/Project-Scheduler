import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, FolderKanban, Settings, LogOut, Building2 } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
  ];
  if (user?.is_global_admin) navItems.push({ to: '/admin', icon: Settings, label: 'Admin' });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-900 flex flex-col shrink-0">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-brand-700">
          <Building2 size={22} className="text-brand-100" />
          <span className="text-white font-semibold text-base leading-tight">ProjeX</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-700 text-white'
                    : 'text-brand-100 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-brand-700">
          <div className="px-3 py-2 text-brand-200 text-xs">
            <div className="font-medium text-white truncate">{user?.name}</div>
            <div className="truncate">{user?.email}</div>
            {user?.is_global_admin ? <span className="text-brand-300">Global Admin</span> : null}
          </div>
          <button onClick={handleLogout} className="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-brand-100 hover:bg-brand-800 hover:text-white transition-colors">
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
