
// services/authService.ts
import { User } from '../types';

export interface SignUpCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  notARobot: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Simple email regex for client-side validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// NEW: Internal interface for users stored with password hash
interface StoredUser extends User {
  passwordHash: string;
}

// Mock database (using localStorage for persistence)
const getUsers = (): StoredUser[] => { // Use StoredUser[] for internal storage
  const usersJson = localStorage.getItem('users');
  return usersJson ? JSON.parse(usersJson) : [];
};

const saveUsers = (users: StoredUser[]) => { // Use StoredUser[] for internal storage
  localStorage.setItem('users', JSON.stringify(users));
};

const setCurrentUser = (user: User | null) => { // CurrentUser in local storage should NOT have password hash
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

export const authService = {
  async register(credentials: SignUpCredentials): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay

    const { fullName, email, password, confirmPassword, notARobot } = credentials;

    if (!fullName || !email || !password || !confirmPassword) {
      throw new Error('All fields are required.');
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (!notARobot) {
        throw new Error('Please confirm you are not a robot.');
    }

    const users = getUsers(); // Retrieves StoredUser[]
    if (users.some(user => user.email === email)) {
      throw new Error('An account with this email already exists.');
    }

    // Simulate password hashing
    const hashedPassword = btoa(password); // Simple base64 encoding for simulation

    // NEW: Create a StoredUser object for internal storage
    const newStoredUser: StoredUser = {
      id: `user-${Date.now()}`,
      fullName,
      email,
      passwordHash: hashedPassword, // Store the hashed password
    };

    users.push(newStoredUser);
    saveUsers(users); // Save the StoredUser[] to localStorage

    // Return a User object (without passwordHash)
    const newUser: User = {
      id: newStoredUser.id,
      fullName: newStoredUser.fullName,
      email: newStoredUser.email,
    };
    return newUser;
  },

  async login(credentials: LoginCredentials): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay

    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const users = getUsers(); // Retrieves StoredUser[]
    const storedUser = users.find(u => u.email === email); // Find StoredUser

    if (!storedUser) {
      throw new Error('Invalid email or password.');
    }

    // Simulate password verification
    const hashedPassword = btoa(password);
    if (storedUser.passwordHash !== hashedPassword) { // Compare against passwordHash
      throw new Error('Invalid email or password.');
    }

    // Create a User object without passwordHash to set as current user and return
    const loggedInUser: User = {
      id: storedUser.id,
      fullName: storedUser.fullName,
      email: storedUser.email,
    };

    setCurrentUser(loggedInUser); // Set current user without passwordHash
    return loggedInUser;
  },

  logout(): void {
    setCurrentUser(null);
  },

  getLoggedInUser(): User | null {
    const currentUserJson = localStorage.getItem('currentUser');
    return currentUserJson ? JSON.parse(currentUserJson) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getLoggedInUser();
  },

  // NEW: Admin specific login for simulation
  async adminLogin(email: string, password: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call delay
    const ADMIN_EMAIL = 'blockitv649@gmail.com';
    const ADMIN_PASSWORD = '@Malda123'; 

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('isAdmin', 'true');
      return true;
    }
    throw new Error('Invalid admin credentials.');
  },

  isAdmin(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  },

  adminLogout(): void {
    localStorage.removeItem('isAdmin');
  }
};
