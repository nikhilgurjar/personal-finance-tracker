'use client';

export function SimpleTabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (next: string) => void;
  tabs: { label: string; value: string }[];
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            value === tab.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

