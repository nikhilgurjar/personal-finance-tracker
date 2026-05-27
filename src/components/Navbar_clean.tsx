'use client';

import Link from 'next/link';
import { useAuthContext } from './AuthProvider';
import { logout } from '@/lib/auth';
import { useState } from 'react';
import { NavigationDrawer } from './NavigationDrawer';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Settings, Plus, MoreHorizontal } from 'lucide-react';
import {
  Home, Wallet, History, TrendingDown, DollarSign, Handshake,
  Users, PieChart, Target, Calendar, BarChart3, Sparkles, TrendingUp, User
} from 'lucide-react';

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

export function Navbar() {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setMenuOpen(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) {
    return null;
  }

  // Mobile view
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button onClick={() => setDrawerOpen(!drawerOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Finance Tracker
          </h1>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            <User className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Navigation Drawer */}
        <NavigationDrawer 
          open={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
        />

        {/* Quick Add Modal */}
        {quickAddOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-xs w-full p-6">
              <h2 className="text-lg font-bold mb-4 text-center">Quick Add</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/expenses" onClick={() => setQuickAddOpen(false)} className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-sm font-medium">Expense</span>
                </Link>
                <Link href="/incomes" onClick={() => setQuickAddOpen(false)} className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Income</span>
                </Link>
                <Link href="/loans" onClick={() => setQuickAddOpen(false)} className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition">
                  <Handshake className="w-5 h-5" />
                  <span className="text-sm font-medium">Loan/Due</span>
                </Link>
                <Link href="/savings" onClick={() => setQuickAddOpen(false)} className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm font-medium">Savings</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
          <div className="flex items-center justify-around h-16">
            <Link href="/dashboard" className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 ${pathname === '/dashboard' ? 'text-blue-500' : 'text-gray-600'}`}>
              <Home className="w-6 h-6" />
              <span className="text-xs font-medium">Dashboard</span>
            </Link>
            <button onClick={() => setQuickAddOpen(true)} className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-blue-500">
              <Plus className="w-7 h-7" />
              <span className="text-xs font-medium">Add</span>
            </button>
            <Link href="/expenses" className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 ${pathname === '/expenses' ? 'text-blue-500' : 'text-gray-600'}`}>
              <TrendingDown className="w-6 h-6" />
              <span className="text-xs font-medium">Expenses</span>
            </Link>
            <Link href="/incomes" className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 ${pathname === '/incomes' ? 'text-blue-500' : 'text-gray-600'}`}>
              <DollarSign className="w-6 h-6" />
              <span className="text-xs font-medium">Incomes</span>
            </Link>
            <button onClick={() => setDrawerOpen(true)} className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 text-gray-600`}>
              <MoreHorizontal className="w-6 h-6" />
              <span className="text-xs font-medium">More</span>
            </button>
          </div>
        </div>

        {/* User Menu */}
        {menuOpen && (
          <div className="fixed top-16 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200">
            <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm font-medium">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </>
    );
  }

  // Desktop view
  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          Finance Tracker
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.subheader} className="mb-4">
            <h3 className="px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
              {group.subheader}
            </h3>
            <nav className="space-y-1 px-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
