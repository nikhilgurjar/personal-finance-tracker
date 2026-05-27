'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import { fetcher } from '@/lib/swr';
import { formatCurrency } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import {
  Plus,
  TrendingUp,
  Percent,
  Calendar,
  Lock,
  Landmark,
  Layers,
  Coins,
  ChevronRight,
  X,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

const INSTRUMENT_TYPES = [
  { value: 'fd', label: 'Fixed Deposit (FD)', class: 'fixed_return' },
  { value: 'rd', label: 'Recurring Deposit (RD)', class: 'fixed_return' },
  { value: 'bond', label: 'Bond / Debenture', class: 'fixed_return' },
  { value: 'mf', label: 'Mutual Fund', class: 'market_linked' },
  { value: 'stock', label: 'Direct Stock / Equity', class: 'market_linked' },
  { value: 'etf', label: 'ETF', class: 'market_linked' },
  { value: 'ppf', label: 'Public Provident Fund (PPF)', class: 'govt_scheme' },
  { value: 'nps', label: 'National Pension System (NPS)', class: 'govt_scheme' },
  { value: 'epf', label: 'Employees\' Provident Fund (EPF)', class: 'govt_scheme' },
];

export default function InvestmentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('mf');
  const [principal, setPrincipal] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().split('T')[0]);
  const [ownerName, setOwnerName] = useState('Myself');
  const [providerId, setProviderId] = useState('');
  const [platformId, setPlatformId] = useState('');
  
  // Details states
  const [interestRate, setInterestRate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [units, setUnits] = useState('');
  const [avgCostBasis, setAvgCostBasis] = useState('');
  const [currentNAV, setCurrentNAV] = useState('');
  const [folioNumber, setFolioNumber] = useState('');

  // Fetch data
  const { data: instruments = [], mutate: mutateInstruments } = useSWR('/api/instruments', fetcher);
  const { data: providers = [] } = useSWR('/api/providers', fetcher);
  const { data: platforms = [] } = useSWR('/api/platforms', fetcher);

  const selectedTypeObj = useMemo(() => {
    return INSTRUMENT_TYPES.find((t) => t.value === type);
  }, [type]);

  const filteredInstruments = useMemo(() => {
    return instruments.filter((inst: any) => {
      if (selectedClassFilter && inst.instrumentClass !== selectedClassFilter) return false;
      return true;
    });
  }, [instruments, selectedClassFilter]);

  const summary = useMemo(() => {
    let totalPrincipal = 0;
    let totalValue = 0;
    let totalGains = 0;

    instruments.forEach((inst: any) => {
      totalPrincipal += inst.principalAmount || 0;
      totalValue += inst.currentValue || 0;
      totalGains += inst.unrealizedGain || 0;
    });

    return { totalPrincipal, totalValue, totalGains };
  }, [instruments]);

  const handleOpenCreate = () => {
    setName('');
    setType('mf');
    setPrincipal('');
    setCurrentValue('');
    setOpenedAt(new Date().toISOString().split('T')[0]);
    setOwnerName('Myself');
    setProviderId('');
    setPlatformId('');
    setInterestRate('');
    setMaturityDate('');
    setUnits('');
    setAvgCostBasis('');
    setCurrentNAV('');
    setFolioNumber('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Name is required');

    setLoadingAction(true);
    try {
      const resolvedClass = selectedTypeObj?.class || 'fixed_return';
      
      const payload: any = {
        name: name.trim(),
        type,
        instrumentClass: resolvedClass,
        principalAmount: Number(principal || 0),
        openedAt: new Date(openedAt).getTime(),
        ownerName,
        providerId: providerId || undefined,
        platformId: platformId || undefined,
        status: 'active',
        details: {},
      };

      if (resolvedClass === 'market_linked') {
        const u = Number(units || 0);
        const c = Number(currentNAV || avgCostBasis || 0);
        payload.currentValue = u * c;
        payload.details = {
          units: u,
          avgCostBasis: Number(avgCostBasis || 0),
          currentNAV: c,
          folioNumber: folioNumber.trim() || undefined,
          navUpdatedAt: Date.now(),
        };
      } else {
        payload.currentValue = Number(currentValue || principal || 0);
        payload.details = {
          interestRate: Number(interestRate || 0),
          maturityDate: maturityDate ? new Date(maturityDate).getTime() : undefined,
        };
        payload.interestRate = Number(interestRate || 0);
        if (maturityDate) payload.maturityDate = new Date(maturityDate).getTime();
      }

      // Optimistic Update
      const optimisticInst = {
        ...payload,
        id: crypto.randomUUID(),
        unrealizedGain: resolvedClass === 'market_linked' ? (payload.currentValue - (payload.details.units * payload.details.avgCostBasis)) : 0,
      };

      await mutateInstruments((current: any) => [optimisticInst, ...(current || [])], { revalidate: false });

      const res = await fetch('/api/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create savings instrument');

      mutateInstruments();
      setFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving instrument');
      mutateInstruments();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCloseInstrument = async (id: string) => {
    if (!confirm('Are you sure you want to close this instrument?')) return;
    try {
      // In a real application, you would call PUT to /api/instruments/[id] with status: 'closed'
      alert('Instrument closing flow would trigger here. Update status to closed.');
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader title="Investments & Assets" />
        <button
          onClick={handleOpenCreate}
          className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] text-sm shrink-0"
        >
          <Plus className="w-4.5 h-4.5" /> Add Investment
        </button>
      </div>

      {/* Portfolio overview stats card */}
      <div className="bg-gradient-to-br from-card to-[#151c2d] border border-border rounded-xl p-6 mb-6">
        <h3 className="text-text-dim text-xs font-bold uppercase tracking-wider mb-4">Investment Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs text-text-muted">Invested Amount</span>
            <div className="font-syne text-2xl font-bold text-white mt-1">
              {formatCurrency(summary.totalPrincipal)}
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Current Value</span>
            <div className="font-syne text-2xl font-bold text-cyan mt-1">
              {formatCurrency(summary.totalValue)}
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Unrealized Gains</span>
            <div className={`font-syne text-2xl font-bold mt-1 ${
              summary.totalGains >= 0 ? 'text-green' : 'text-red'
            }`}>
              {summary.totalGains >= 0 ? '+' : ''}{formatCurrency(summary.totalGains)}
              <span className="text-xs font-medium ml-1">
                ({summary.totalPrincipal > 0 ? Math.round((summary.totalGains / summary.totalPrincipal) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Add form */}
      {formOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setFormOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border z-50 p-6 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-syne text-md font-bold text-white">Add Investment Instrument</h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Asset / Scheme Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="e.g. Parag Parikh Flexi Cap Fund"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Investment Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan capitalize"
                    >
                      {INSTRUMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Owner Name</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      placeholder="Myself"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Platform / Broker</label>
                    <select
                      value={platformId}
                      onChange={(e) => setPlatformId(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    >
                      <option value="">Select Platform</option>
                      {platforms.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Asset Provider / AMC</label>
                    <select
                      value={providerId}
                      onChange={(e) => setProviderId(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    >
                      <option value="">Select Provider</option>
                      {providers.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Invested Principal</label>
                    <input
                      type="number"
                      required
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Opening Date</label>
                    <input
                      type="date"
                      value={openedAt}
                      onChange={(e) => setOpenedAt(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    />
                  </div>
                </div>

                {/* Subtype details step */}
                {selectedTypeObj?.class === 'market_linked' ? (
                  <div className="border-t border-border pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-cyan uppercase tracking-wider">Market Linked Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Units Owned</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={units}
                          onChange={(e) => setUnits(e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                          placeholder="e.g. 10.456"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Average Cost Basis</label>
                        <input
                          type="number"
                          step="0.01"
                          value={avgCostBasis}
                          onChange={(e) => setAvgCostBasis(e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                          placeholder="Cost per unit"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Current NAV / Unit</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={currentNAV}
                          onChange={(e) => setCurrentNAV(e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                          placeholder="Current NAV"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Folio Number</label>
                        <input
                          type="text"
                          value={folioNumber}
                          onChange={(e) => setFolioNumber(e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                          placeholder="Folio No."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-cyan uppercase tracking-wider">Fixed Return Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Interest Rate (% p.a.)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={interestRate}
                          onChange={(e) => setInterestRate(e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                          placeholder="e.g. 7.1"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Maturity Date</label>
                        <input
                          type="date"
                          value={maturityDate}
                          onChange={(e) => setMaturityDate(e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Current Value (Optional)</label>
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                        placeholder="Default is principal"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex gap-2 pt-6 border-t border-border mt-6">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 border border-border hover:bg-white/5 text-text font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loadingAction}
                className="flex-1 bg-cyan hover:bg-cyan/95 text-bg font-bold py-2 px-5 rounded-lg text-sm transition-all"
              >
                {loadingAction ? 'Adding...' : 'Save Asset'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Class filter buttons */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setSelectedClassFilter('')}
          className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            !selectedClassFilter ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          All Assets
        </button>
        <button
          onClick={() => setSelectedClassFilter('market_linked')}
          className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            selectedClassFilter === 'market_linked' ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          📈 Market Linked
        </button>
        <button
          onClick={() => setSelectedClassFilter('fixed_return')}
          className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            selectedClassFilter === 'fixed_return' ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          🏦 Fixed Return
        </button>
        <button
          onClick={() => setSelectedClassFilter('govt_scheme')}
          className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            selectedClassFilter === 'govt_scheme' ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          🛡️ Govt Schemes
        </button>
      </div>

      {/* Instruments Deck */}
      {filteredInstruments.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm border border-dashed border-border rounded-xl bg-card">
          No investment instruments found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Investment portfolio deck">
          {filteredInstruments.map((inst: any) => {
            const isMarket = inst.instrumentClass === 'market_linked';
            const gains = inst.unrealizedGain || 0;
            const percentage = inst.principalAmount > 0 ? Math.round((gains / inst.principalAmount) * 100) : 0;

            return (
              <div
                key={inst.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-cyan/35 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-white text-sm truncate max-w-[200px]" title={inst.name}>
                        {inst.name}
                      </h4>
                      <span className="text-[10px] text-text-dim leading-none font-mono uppercase">
                        {inst.type} • {inst.ownerName || 'Myself'}
                      </span>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      inst.instrumentClass === 'fixed_return'
                        ? 'bg-cyan/15 text-cyan'
                        : inst.instrumentClass === 'market_linked'
                        ? 'bg-purple/15 text-purple'
                        : 'bg-green/15 text-green'
                    }`}>
                      {inst.instrumentClass.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                    <div className="p-2.5 bg-[#0a0f1c] border border-border/80 rounded-lg">
                      <span className="text-[9px] text-text-dim uppercase tracking-wider block">Principal</span>
                      <span className="text-xs font-bold text-text-muted font-mono">{formatCurrency(inst.principalAmount || 0)}</span>
                    </div>
                    <div className="p-2.5 bg-[#0a0f1c] border border-border/80 rounded-lg">
                      <span className="text-[9px] text-text-dim uppercase tracking-wider block">Current Value</span>
                      <span className="text-xs font-bold text-cyan font-mono">{formatCurrency(inst.currentValue || 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isMarket ? (
                    <div className="flex items-center justify-between text-xs border-t border-border/60 pt-3">
                      <span className="text-text-muted">Unrealized Gain</span>
                      <span className={`font-bold font-mono ${gains >= 0 ? 'text-green' : 'text-red'}`}>
                        {gains >= 0 ? '+' : ''}{formatCurrency(gains)} ({percentage}%)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs border-t border-border/60 pt-3">
                      <span className="text-text-muted">Maturity Details</span>
                      <div className="flex flex-col items-end">
                        {inst.interestRate && (
                          <span className="font-semibold text-text text-[11px] font-mono">
                            {inst.interestRate}% Interest
                          </span>
                        )}
                        {inst.maturityDate && (
                          <span className="text-[10px] text-text-muted font-mono mt-0.5">
                            Due: {formatIndianDate(inst.maturityDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
