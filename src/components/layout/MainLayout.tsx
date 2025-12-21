import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} onCollapsedChange={setIsCollapsed} />
      <main
        className={
          isCollapsed
            ? 'ml-16 transition-[margin] duration-300'
            : 'ml-64 transition-[margin] duration-300'
        }
      >
        {children}
      </main>
    </div>
  );
}
