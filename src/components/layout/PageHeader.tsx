import { User, Bell } from 'lucide-react';

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between py-5 border-b border-border mb-6">
      <div>
        <h2 className="font-syne text-xl md:text-2xl font-bold text-white tracking-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="p-2 text-text-muted hover:text-text bg-card hover:bg-card-hover border border-border rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 bg-card border border-border px-3 py-1.5 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-cyan/10 text-cyan flex items-center justify-center text-xs font-semibold font-mono">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-[12px] font-medium text-text hidden sm:inline-block max-w-[120px] truncate">
            Workspace User
          </span>
        </div>
      </div>
    </header>
  );
}
