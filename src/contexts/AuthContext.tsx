import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_URL } from '../apiConfig';
import { User } from '../types';

interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

interface SettingsPayload {
  defaultRtmpUrl?: string;
  autoLoop?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  updateUserSettings: (settings: SettingsPayload) => Promise<void>;
  changePassword: (payload: PasswordChangePayload) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('streamcraft_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const updateUserSettings = async (settings: SettingsPayload) => {
    if (!user) throw new Error("User not authenticated");
    try {
      const response = await axios.put<ApiResponse<User>>(`${API_URL}/api/auth/settings/${user.id}`, { settings });
      if (response.data.success) {
        setUser(response.data.data); // Update user state with the latest data from server
      } else {
        throw new Error(response.data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const changePassword = async (payload: PasswordChangePayload): Promise<boolean> => {
    if (!user) throw new Error("User not authenticated");
    try {
      const response = await axios.put<ApiResponse<{}>>(`${API_URL}/api/auth/change-password/${user.id}`, payload);
      if (response.data.success) {
        return true;
      }
      // If backend returns success: false, throw its message
      throw new Error(response.data.message || 'An unknown error occurred');
    } catch (error: any) {
      console.error('Error changing password:', error.response?.data?.message || error.message);
      // Re-throw the specific error message from backend if available
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post<ApiResponse<User>>(`${API_URL}/api/auth/login`, { username, password });
      
      if (response.data && response.data.success) {
        const loggedInUser = response.data.data;
        if (loggedInUser) {
          localStorage.setItem('streamcraft_user', JSON.stringify(loggedInUser));
          setUser(loggedInUser);
          return true;
        }
      }
      
      console.error('Login failed: Invalid response from server');
      return false;
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Login failed:', error.response.data?.message || 'Invalid credentials');
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Login failed: No response from server');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Login failed:', error.message);
      }
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post<ApiResponse<{}>>(`${API_URL}/api/auth/register`, { username, email, password });
      if (response.data.success) {
        // Automatically log in the user after successful registration
        return await login(username, password);
      }
      return false;
    } catch (error: any) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('streamcraft_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, updateUserSettings, changePassword, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};