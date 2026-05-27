import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <main className="flex-grow p-4 md:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
