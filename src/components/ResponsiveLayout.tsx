'use client';

import { Navbar } from './Navbar';
import { useEffect, useState } from 'react';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main
        className={`flex-1 flex flex-col min-h-screen bg-gray-50 ${
          isMobile ? 'pt-16 pb-20' : 'md:ml-80'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
