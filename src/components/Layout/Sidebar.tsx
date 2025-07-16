import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Film, 
  History, 
  Settings, 
  LogOut 
} from 'lucide-react';
import logo from '../../assets/streamhub.ico';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/streams' },
    { name: 'Videos', icon: Film, path: '/videos' },
    { name: 'History', icon: History, path: '/history' },
  ];

  const NavItem: React.FC<{item: typeof menuItems[0]}> = ({ item }) => (
    <NavLink
      to={item.path}
      onClick={() => setIsMobileMenuOpen(false)}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ` +
        (isActive 
          ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white')
      }
    >
      <item.icon className="w-5 h-5 mr-3" />
      <span>{item.name}</span>
    </NavLink>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out z-40 w-64 
                   ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                   md:relative md:translate-x-0 md:h-screen md:w-64`}
      >
        {/* Header */}
        <div className="flex items-center justify-center h-20 border-b border-gray-800 px-4">
          <img src={logo} alt="New Streambro Logo" className="h-8" />
          <h1 className="text-xl font-bold ml-2 text-white">Streambro</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map(item => <NavItem key={item.name} item={item} />)}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="mb-4">
            <NavItem item={{ name: 'Settings', icon: Settings, path: '/settings' }} />
          </div>
          <div className="flex items-center p-3 rounded-lg bg-gray-800/50">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-white">{user?.username}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
            <button onClick={handleLogout} className="ml-auto p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};