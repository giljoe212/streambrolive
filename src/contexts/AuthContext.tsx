import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../apiConfig';
import { User } from '../types';

// Tipe untuk error response dari API
interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

// Type guard untuk mengecek apakah error adalah AxiosError
const isAxiosError = (error: unknown): error is { 
  isAxiosError: boolean; 
  response?: { 
    status: number; 
    data?: ApiErrorResponse;
    statusText?: string;
  }; 
  message?: string;
} => {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
};

// Fungsi helper untuk menangani error
export const handleApiError = (error: unknown): string => {
  // Cek jika error adalah error dari axios
  if (isAxiosError(error)) {
    const response = error.response?.data;
    return response?.message || response?.error || error.message || 'Terjadi kesalahan pada server';
  }
  
  // Cek jika error adalah instance dari Error
  if (error instanceof Error) {
    return error.message || 'Terjadi kesalahan';
  }
  
  // Default error message
  return 'Terjadi kesalahan yang tidak diketahui';
};

interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

interface SettingsPayload {
  defaultRtmpUrl?: string;
  autoLoop?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  statusCode?: number;
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

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('Mencoba login ke:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`);
      const response = await axios.post<ApiResponse<{ user: User; token: string }>>(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`,
        { username, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      if (response.data.success && response.data.data?.token) {
        const { user, token } = response.data.data;
        // Simpan token di localStorage
        localStorage.setItem('token', token);
        // Simpan juga data user
        localStorage.setItem('streamcraft_user', JSON.stringify(user));
        // Update state
        setUser(user);
        return true;
      }
      
      throw new Error('Respon tidak valid dari server');
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Gagal login:', errorMessage);
      throw new Error(errorMessage);
    }
  }, [API_BASE_URL, API_ENDPOINTS.AUTH.LOGIN]);
  
  const register = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('Mencoba mendaftar ke:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`);
      const response = await axios.post<ApiResponse<{ user: User; token: string }>>(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, 
        { username, email, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      
      if (response.data.success && response.data.data?.token) {
        const { user, token } = response.data.data;
        // Simpan token di localStorage
        localStorage.setItem('token', token);
        // Simpan juga data user
        localStorage.setItem('streamcraft_user', JSON.stringify(user));
        // Update state
        setUser(user);
        return true;
      }
      
      throw new Error('Pendaftaran gagal: Respon tidak valid dari server');
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Gagal mendaftar:', errorMessage);
      throw new Error(errorMessage);
    }
  }, [API_BASE_URL, API_ENDPOINTS.AUTH.REGISTER]);
  
  const logout = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    // Hapus token dan data user dari localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('streamcraft_user');
    
    // Reset state user
    setUser(null);
    
    // Panggil API logout jika ada token
    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, 
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          }
        );
      } catch (error) {
        console.warn('Gagal memanggil API logout, melanjutkan dengan logout lokal', error);
      }
    }
  }, [API_BASE_URL, API_ENDPOINTS.AUTH.LOGOUT]);

  // Fungsi untuk memuat data user
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('streamcraft_user');
    
    if (!token || !userData) {
      // Tidak ada token atau data user, pastikan state bersih
      await logout();
      setIsLoading(false);
      return;
    }
    
    try {
      // Verifikasi token dengan backend
      const response = await axios.get<ApiResponse<User>>(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      
      if (response.data.success && response.data.data) {
        // Update user data from server
        setUser(response.data.data);
        localStorage.setItem('streamcraft_user', JSON.stringify(response.data.data));
      } else {
        // Token tidak valid, lakukan logout
        throw new Error('Sesi tidak valid');
      }
    } catch (error) {
      console.error('Gagal memverifikasi sesi pengguna:', error);
      // Jika ada error (misalnya token expired), lakukan logout
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, API_ENDPOINTS.AUTH.ME, logout]);

  // Gunakan useEffect untuk memuat data user saat komponen mount
  useEffect(() => {
    let isMounted = true;
    
    const loadUserData = async () => {
      try {
        await loadUser();
      } catch (error) {
        console.error('Error in loadUser:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadUserData();
    
    return () => {
      isMounted = false;
    };
  }, [loadUser]);

  const updateUserSettings = useCallback(async (settings: SettingsPayload) => {
    if (!user) throw new Error("Pengguna belum terautentikasi");
    
    const token = localStorage.getItem('token');
    if (!token) {
      await logout();
      throw new Error('Sesi telah berakhir, silakan login kembali');
    }
    
    try {
      const response = await axios.put<ApiResponse<User>>(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}/settings`,
        { settings },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      
      if (response.data.success && response.data.data) {
        // Update user state with the latest data from server
        setUser(response.data.data);
        // Update juga di localStorage
        localStorage.setItem('streamcraft_user', JSON.stringify(response.data.data));
      } else {
        throw new Error(response.data.message || 'Gagal memperbarui pengaturan');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Gagal memperbarui pengaturan:', errorMessage);
      
      if (isAxiosError(error) && error.response?.status === 401) {
        // Token mungkin expired, lakukan logout
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  }, [user, logout, API_BASE_URL, API_ENDPOINTS.AUTH.ME]);

  const changePassword = useCallback(async (payload: PasswordChangePayload): Promise<boolean> => {
    if (!user) throw new Error("Pengguna belum terautentikasi");
    
    const token = localStorage.getItem('token');
    if (!token) {
      await logout();
      throw new Error('Sesi telah berakhir, silakan login kembali');
    }
    
    try {
      const response = await axios.put<ApiResponse<{}>>(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}/change-password`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      
      if (response.data.success) {
        return true;
      }
      
      // Jika backend mengembalikan success: false, lempar pesan errornya
      throw new Error(response.data.message || 'Gagal mengubah kata sandi');
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Gagal mengubah kata sandi:', errorMessage);
      
      if (isAxiosError(error) && error.response?.status === 401) {
        // Token mungkin expired, lakukan logout
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  }, [user, logout, API_BASE_URL, API_ENDPOINTS.AUTH.ME]);

  // Gunakan useMemo untuk mencegah render ulang yang tidak perlu
  const contextValue = useMemo(() => ({
    user,
    updateUserSettings,
    changePassword,
    login,
    register,
    logout,
    isLoading,
  }), [
    user, 
    updateUserSettings, 
    changePassword, 
    login, 
    register, 
    logout, 
    isLoading
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};