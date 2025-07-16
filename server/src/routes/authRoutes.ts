import { Router } from 'express';
import { register, login, getUsers, updateUser, deleteUser, updateUserSettings, changePassword } from '../controllers/authController';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Route to update user-specific settings
router.put('/settings/:id', updateUserSettings);

// Route to change a user's password
router.put('/change-password/:id', changePassword);

export default router;
