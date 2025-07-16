import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-white p-2 rounded-md hover:bg-gray-800"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold">StreamCraft</h1>
          <div className="w-8"></div> {/* Spacer */}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
