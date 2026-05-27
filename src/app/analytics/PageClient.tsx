'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BarChart3, TrendingDown } from 'lucide-react';

export default function AnalyticsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [tab, setTab] = useState<'monthly' | 'category'>('monthly');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data, isLoading } = useAuthedQuery(user, ['analytics', user?.uid], '/api/analytics');

  if (!user) return null;

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <ResponsiveLayout>
      <div className="p-4 md:p-8 min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <div className="p-3 bg-blue-500 text-white rounded-lg flex items-center justify-center">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 text-sm md:text-base">Deep dive into your financial trends</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setTab('monthly')}
                className={`pb-3 px-1 font-medium transition ${
                  tab === 'monthly'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Monthly View
                </div>
              </button>
              <button
                onClick={() => setTab('category')}
                className={`pb-3 px-1 font-medium transition ${
                  tab === 'category'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Category Trends
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="bg-white rounded-lg p-8 animate-pulse">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          ) : !data ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Failed to load analytics</p>
            </div>
          ) : tab === 'monthly' ? (
            // Monthly Table
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Month</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-green-600">Income</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-red-600">Expenses</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-blue-600">Net Saved</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">Invested</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-orange-600">Lent</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-red-600">Borrowed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                          No monthly data available
                        </td>
                      </tr>
                    ) : (
                      data.monthly.map((row: any) => {
                        const monthLabel = new Date(row.month + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
                        const netSaved = row.income - row.expenses;
                        return (
                          <tr key={row.month} className="border-b border-gray-200 hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{monthLabel}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(row.income)}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(row.expenses)}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                netSaved >= 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {formatCurrency(netSaved)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(row.invested)}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(row.lent)}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(row.borrowed)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Category Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.categories.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg p-8 text-center">
                  <p className="text-gray-600">No category data available</p>
                </div>
              ) : (
                data.categories.map((cat: any) => {
                  const fixedPct = cat.total > 0 ? (cat.fixed / cat.total) * 100 : 0;
                  const dynPct = cat.total > 0 ? (cat.dynamic / cat.total) * 100 : 0;

                  return (
                    <div key={cat.category} className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{cat.category}</h3>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(cat.total)}</p>
                      </div>

                      {cat.total > 0 && (
                        <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-gray-200">
                          <div className="bg-purple-500" style={{ width: `${fixedPct}%` }}></div>
                          <div className="bg-amber-500" style={{ width: `${dynPct}%` }}></div>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fixed (📌)</p>
                          <p className="text-sm font-semibold text-purple-600">{formatCurrency(cat.fixed)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600 mb-1">Dynamic (🔄)</p>
                          <p className="text-sm font-semibold text-amber-600">{formatCurrency(cat.dynamic)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}
