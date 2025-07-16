import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EditUserModal from './EditUserModal';
import AddUserModal from './AddUserModal';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  createdAt: string;
  [key: string]: any; // Untuk menangani properti tambahan
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/auth/users');
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        setError('Gagal memuat data pengguna');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Terjadi kesalahan saat memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const response = await axios.put(
        `http://localhost:3001/api/auth/users/${updatedUser.id}`,
        updatedUser
      );
      
      if (response.data.success) {
        setUsers(users.map(user => 
          user.id === updatedUser.id ? { ...user, ...updatedUser } : user
        ));
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await axios.delete(`http://localhost:3001/api/auth/users/${userId}`);
      
      if (response.data.success) {
        setUsers(users.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const toggleShowPassword = (userId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const maskPassword = () => {
    return '•'.repeat(8); // Menampilkan 8 titik sebagai mask
  };

  if (loading) return <div className="p-6 text-gray-300">Memuat daftar pengguna...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const handleAddUser = async (userData: { username: string; email: string; password: string }): Promise<void> => {
    try {
      const response = await axios.post('http://localhost:3001/api/auth/register', {
        username: userData.username,
        email: userData.email,
        password: userData.password
      });
      
      if (response.data && response.data.success) {
        // Refresh daftar pengguna setelah berhasil menambahkan
        fetchUsers();
      } else {
        throw new Error('Gagal menambahkan pengguna');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Daftar Pengguna</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tambah Pengguna
        </button>
      </div>
      
      <div className="overflow-x-auto rounded-lg shadow-lg mb-6">
        <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
          <thead className="bg-gray-700">
            <tr>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">No</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Username</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Password</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tanggal Daftar</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user, index) => (
              <tr key={user.id} className="hover:bg-gray-700 transition-colors duration-200">
                <td className="py-4 px-6 text-sm font-medium text-gray-300 text-center">{index + 1}</td>
                <td className="py-4 px-6 text-sm font-medium text-white">{user.username}</td>
                <td className="py-4 px-6 text-sm text-gray-300">{user.email}</td>
                <td className="py-4 px-6 text-sm text-gray-300">
                  <div className="flex items-center">
                    <div className="relative group">
                      <span className="font-mono max-w-[150px] truncate inline-block">
                        {showPassword[user.id] ? 
                          (user.password_hash || '••••••••').substring(0, 20) + (user.password_hash && user.password_hash.length > 20 ? '...' : '') : 
                          maskPassword()}
                      </span>
                      {showPassword[user.id] && user.password_hash && user.password_hash.length > 20 && (
                        <div className="absolute z-10 hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap">
                          {user.password_hash}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(user.id)}
                      className="ml-2 text-gray-400 hover:text-white"
                      title={showPassword[user.id] ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showPassword[user.id] ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-300">
                  {new Date(user.createdAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="py-4 px-6 text-sm text-gray-300">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Edit"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onSave={handleUpdateUser}
          onDelete={handleDeleteUser}
        />
      )}

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddUser}
      />
    </div>
  );
};

export default UserList;
