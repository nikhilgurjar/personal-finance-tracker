'use client';

import { useAuthContext } from '@/components/AuthProvider';
import { logout } from '@/lib/auth';
import { LogOut, UserCircle2, Bell, Moon, Languages } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <h1 className="mb-6 text-3xl font-extrabold text-blue-600">Settings</h1>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-3xl font-semibold text-white">
            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{user.displayName || user.email?.split('@')[0] || 'User'}</p>
            <p className="text-slate-500">{user.email}</p>
          </div>
        </div>
        <div className="my-3 h-px bg-slate-200" />
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {[{
          icon: <UserCircle2 size={18} className="text-slate-500" />,
          title: 'Profile Information',
          subtitle: 'Update your name and email',
          action: <button className="text-sm font-medium text-blue-600">Edit</button>,
        },{
          icon: <Moon size={18} className="text-slate-500" />,
          title: 'Dark Mode',
          subtitle: 'Toggle dark theme (Coming soon)',
          action: <input type="checkbox" disabled className="h-4 w-4" />,
        },{
          icon: <Languages size={18} className="text-slate-500" />,
          title: 'Currency',
          subtitle: 'Base currency for tracking (INR)',
          action: <button className="text-sm font-medium text-blue-600">Change</button>,
        },{
          icon: <Bell size={18} className="text-slate-500" />,
          title: 'Notifications',
          subtitle: 'Manage email alerts',
          action: <input type="checkbox" defaultChecked className="h-4 w-4" />,
        }].map((item, idx) => (
          <div key={item.title} className={`flex items-center justify-between px-4 py-4 ${idx !== 3 ? 'border-b border-slate-200' : ''}`}>
            <div className="flex items-center gap-2">
              {item.icon}
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">{item.subtitle}</p>
              </div>
            </div>
            {item.action}
          </div>
        ))}
      </div>
    </div>
  );
}
