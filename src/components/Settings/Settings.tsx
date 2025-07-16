import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Zap, KeyRound, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '../Layout/PageHeader';
import { toast } from 'react-hot-toast';

// Simplified settings state
interface SettingsState {
  defaultRtmpUrl: string;
  autoLoop: boolean;
}

interface PasswordState {
  currentPassword: '';
  newPassword: '';
  confirmPassword: '';
}

export const Settings: React.FC = () => {
  const { user, updateUserSettings, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  const [password, setPassword] = useState<PasswordState>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    defaultRtmpUrl: '',
    autoLoop: true,
  });

  // Load user's existing settings when component mounts
  useEffect(() => {
    if (user?.settings) {
      setSettings({
        defaultRtmpUrl: user.settings.defaultRtmpUrl || '',
        autoLoop: user.settings.autoLoop !== false, // Default to true if not set
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const toastId = toast.loading('Saving settings...');
    try {
      await updateUserSettings(settings);
      toast.success('Settings saved successfully!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.', { id: toastId });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPassword(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSave = async () => {
    if (password.newPassword !== password.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (!password.currentPassword || !password.newPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (!user) return;

    const toastId = toast.loading('Updating password...');
    try {
      await changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast.success('Password updated successfully!', { id: toastId });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    if (type === 'checkbox') {
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const TabButton: React.FC<{tabName: string; label: string}> = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${
        activeTab === tabName
          ? 'bg-gray-800/50 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Settings"
        description="Configure global defaults and manage your account security."
      />

      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-2">
          <TabButton tabName="general" label="General" />
          <TabButton tabName="security" label="Security" />
        </nav>
      </div>

      <div className="pt-4">
        {activeTab === 'general' && (
          <div className="bg-gray-800/50 p-6 rounded-lg shadow-inner flex flex-col max-w-2xl">
            <h3 className="text-lg font-semibold text-white flex items-center mb-4">
              <Zap className="w-5 h-5 mr-3 text-purple-400" />
              Global Defaults
            </h3>
            <div className="space-y-4 flex-grow">
              <div>
                <label htmlFor='defaultRtmpUrl' className="block text-sm font-medium text-gray-300 mb-1">Default RTMP URL</label>
                <input
                  type="text"
                  id='defaultRtmpUrl'
                  name='defaultRtmpUrl'
                  value={settings.defaultRtmpUrl}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="rtmp://a.rtmp.youtube.com/live2"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <label htmlFor='autoLoop' className="text-sm font-medium text-gray-300 cursor-pointer">Auto-loop videos by default</label>
                  <p className="text-xs text-gray-500">New streams will have the 'loop' option enabled automatically.</p>
                </div>
                <input
                  type="checkbox"
                  id='autoLoop'
                  name='autoLoop'
                  checked={settings.autoLoop}
                  onChange={handleChange}
                  className="h-6 w-6 bg-gray-700 border-gray-600 rounded text-purple-500 focus:ring-purple-500 cursor-pointer"
                />
              </div>
            </div>
            <div className="mt-6 text-right">
              <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center transition-colors duration-200">
                <Save className="w-4 h-4 mr-2" />
                Save Defaults
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-gray-800/50 p-6 rounded-lg shadow-inner flex flex-col max-w-2xl">
            <h3 className="text-lg font-semibold text-white flex items-center mb-4">
              <KeyRound className="w-5 h-5 mr-3 text-blue-400" />
              Change Password
            </h3>
            <div className="space-y-4 flex-grow">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
                <div className="relative">
                  <input type={showCurrentPassword ? 'text' : 'password'} name="currentPassword" autoComplete="current-password" value={password.currentPassword} onChange={handlePasswordChange} className="w-full bg-gray-900 border border-gray-700 rounded-md pl-3 pr-10 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white">
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} name="newPassword" autoComplete="new-password" value={password.newPassword} onChange={handlePasswordChange} className="w-full bg-gray-900 border border-gray-700 rounded-md pl-3 pr-10 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white">
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" autoComplete="new-password" value={password.confirmPassword} onChange={handlePasswordChange} className="w-full bg-gray-900 border border-gray-700 rounded-md pl-3 pr-10 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 text-right">
              <button onClick={handlePasswordSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center transition-colors duration-200">
                <Save className="w-4 h-4 mr-2" />
                Update Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};