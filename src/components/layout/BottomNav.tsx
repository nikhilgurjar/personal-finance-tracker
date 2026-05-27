'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  History,
  Wallet,
  Target,
  Menu,
  X,
  Users,
  PieChart,
  Handshake,
  Calendar,
  Bot,
  Settings,
  LogOut,
} from 'lucide-react';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainItems = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'TX', path: '/transactions', icon: History },
    { label: 'Accounts', path: '/accounts', icon: Wallet },
    { label: 'Goals', path: '/goals', icon: Target },
  ];

  const overflowItems = [
    { label: 'Investments', path: '/investments', icon: Wallet }, // We will use trending up icon inside the loop
    { label: 'People Ledger', path: '/people', icon: Users },
    { label: 'Budgets', path: '/budgets', icon: PieChart },
    { label: 'Loans & Dues', path: '/loans', icon: Handshake },
    { label: 'Schedules', path: '/schedules', icon: Calendar },
    { label: 'AI Assistant', path: '/ai', icon: Bot, prefetch: false },
    { label: 'Settings', path: '/settings', icon: Settings, prefetch: false },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (err) {
      console.error('Error signing out', err);
    }
  };

  return (
    <div className="md:hidden">
      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around z-40 px-2 pb-safe">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 w-12 h-12 transition-colors ${
                isActive ? 'text-cyan' : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center justify-center gap-1 w-12 h-12 transition-colors ${
            isMoreOpen ? 'text-cyan' : 'text-text-muted'
          }`}
        >
          {isMoreOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-[10px] font-medium tracking-tight">More</span>
        </button>
      </div>

      {/* Overflow slide-up sheet */}
      {isMoreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-16 left-0 right-0 max-h-[70vh] overflow-y-auto bg-card border-t border-border z-30 rounded-t-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-5 border-b border-border pb-3">
              <h3 className="font-syne text-md font-bold text-text">More Features</h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    prefetch={item.prefetch ?? true}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'border-cyan bg-cyan/5 text-cyan'
                        : 'border-border bg-white/[0.01] text-text hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[13px] font-medium leading-none">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => {
                setIsMoreOpen(false);
                handleSignOut();
              }}
              className="flex items-center justify-center gap-2 p-3 w-full border border-red/20 bg-red/5 hover:bg-red/10 text-red font-medium rounded-lg text-[13px] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
