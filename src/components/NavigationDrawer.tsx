'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import {
  Home, Wallet, History, TrendingDown, DollarSign, Handshake,
  Users, PieChart, Target, Calendar, BarChart3, Sparkles, TrendingUp, Settings
} from 'lucide-react';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

const navigationGroups = [
  {
    subheader: 'Core',
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: Home },
      { title: 'Accounts', path: '/accounts', icon: Wallet },
      { title: 'History', path: '/history', icon: History },
    ]
  },
  {
    subheader: 'Money In/Out',
    items: [
      { title: 'Expenses', path: '/expenses', icon: TrendingDown },
      { title: 'Incomes', path: '/incomes', icon: DollarSign },
      { title: 'Loans', path: '/loans', icon: Handshake },
      { title: 'People Ledger', path: '/people', icon: Users },
    ]
  },
  {
    subheader: 'Planning',
    items: [
      { title: 'Budgets', path: '/budgets', icon: PieChart },
      { title: 'Savings', path: '/savings', icon: Wallet },
      { title: 'Goals', path: '/goals', icon: Target },
      { title: 'Schedules', path: '/schedules', icon: Calendar },
    ]
  },
  {
    subheader: 'Tracking & Insights',
    items: [
      { title: 'Analytics', path: '/analytics', icon: BarChart3 },
      { title: 'AI Insights', path: '/ai', icon: Sparkles },
      { title: 'Forecast', path: '/forecast', icon: TrendingUp },
    ]
  },
  {
    subheader: 'Settings',
    items: [
      { title: 'Settings', path: '/settings', icon: Settings },
    ]
  }
];

export function NavigationDrawer({ open, onClose }: NavigationDrawerProps) {
  const pathname = usePathname();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const drawerContent = (
    <div className="w-80 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-gray-200">
        <h2 className="font-bold text-lg text-blue-600">Finance Tracker</h2>
        {isMobile && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.subheader} className="mb-3">
            <p className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
              {group.subheader}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg mx-1 mb-1 py-2 px-3 transition ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200"></div>

      {/* Footer */}
      <div className="p-6">
        <p className="text-xs text-gray-600">© 2024 Finance Tracker</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={onClose}></div>
      )}
      
      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:relative md:translate-x-0 md:z-auto`}
      >
        {drawerContent}
      </div>
    </>
  );
}
