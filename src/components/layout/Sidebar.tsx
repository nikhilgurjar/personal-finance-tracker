'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  History,
  Wallet,
  TrendingUp,
  Users,
  PieChart,
  Target,
  Handshake,
  Calendar,
  Bot,
  Settings,
  LogOut,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', path: '/transactions', icon: History },
  { label: 'Accounts', path: '/accounts', icon: Wallet },
  { label: 'Investments', path: '/investments', icon: TrendingUp },
  { label: 'People Ledger', path: '/people', icon: Users },
  { label: 'Budgets', path: '/budgets', icon: PieChart },
  { label: 'Goals', path: '/goals', icon: Target },
  { label: 'Loans & Dues', path: '/loans', icon: Handshake },
  { label: 'Schedules', path: '/schedules', icon: Calendar },
  { label: 'AI Assistant', path: '/ai', icon: Bot, prefetch: false },
  { label: 'Settings', path: '/settings', icon: Settings, prefetch: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (err) {
      console.error('Error signing out', err);
    }
  };

  return (
    <aside className="w-56 h-screen sticky top-0 bg-surface border-r border-border flex flex-col justify-between shrink-0 hidden md:flex">
      <div>
        <div className="p-5 border-b border-border">
          <h1 className="font-syne text-lg font-bold text-text tracking-tight flex items-center gap-2">
            <span>💰</span> FinanceAI
          </h1>
          <span className="text-xs text-text-muted mt-0.5 block">Implementation Plan</span>
          <div className="mt-2 inline-block bg-cyan/10 text-cyan border border-cyan/20 rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider">
            v2 · Optimized
          </div>
        </div>

        <nav className="py-4 flex flex-col gap-0.5" aria-label="Sidebar navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={item.prefetch ?? true}
                className={`flex items-center gap-3 px-5 py-2.5 text-[13px] transition-colors border-l-2 ${
                  isActive
                    ? 'text-text bg-cyan/5 border-cyan font-medium'
                    : 'text-text-muted border-transparent hover:text-text hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan' : 'text-text-muted'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2 w-full text-left text-text-muted hover:text-red hover:bg-red/5 rounded transition-colors text-[13px]"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
