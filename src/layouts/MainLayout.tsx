import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

export function MainLayout() {
  return (
    <div className="h-screen flex overflow-hidden bg-[#050810]">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <Toaster />
      <Sonner />
    </div>
  );
}
