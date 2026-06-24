import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthChange, registerUser, loginUser, logoutUser, seedDemoAccounts } from '../services/firebase';
import { createUser, getUser, getUserByUsername, updateUser, deleteUser as deleteUserFromDb, initDatabase, seedDemoUsers, updateUserLastActive, syncServerTime } from '../services/data';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubAuth;
    const init = async () => {
      try {
        seedDemoAccounts();
        await initDatabase();
        await seedDemoUsers();
        await syncServerTime();
      } catch (e) {
        console.warn('Database init failed:', e);
      }
      unsubAuth = onAuthChange(async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const dbUser = await getUser(firebaseUser.uid);
            if (dbUser) {
              setUser(dbUser);
            } else {
              const basicUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                username: firebaseUser.email.split('@')[0].replace(/[^a-z0-9.]/g, ''),
                email: firebaseUser.email,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || firebaseUser.email)}&background=334155&color=fff&size=150`,
              };
              setUser(basicUser);
            }
          } catch (e) {
            console.warn('Failed to load user from DB:', e);
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              username: firebaseUser.email.split('@')[0].replace(/[^a-z0-9.]/g, ''),
              email: firebaseUser.email,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || firebaseUser.email)}&background=334155&color=fff&size=150`,
            });
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });
    };
    init();
    return () => { if (unsubAuth) unsubAuth(); };
  }, []);

  // Global active status tracking (marks user online/offline instantly on app open, exit, page minimize)
  useEffect(() => {
    if (!user?.id) return;

    // Immediately mark online
    updateUserLastActive(user.id).catch(console.warn);

    // Keep online status active with a 4-second heartbeat
    const interval = setInterval(() => {
      updateUserLastActive(user.id).catch(console.warn);
    }, 4000);

    const setOffline = () => {
      updateUserLastActive(user.id, null).catch(console.warn);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setOffline();
      } else {
        updateUserLastActive(user.id).catch(console.warn);
      }
    };

    window.addEventListener('beforeunload', setOffline);
    window.addEventListener('unload', setOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', setOffline);
      window.removeEventListener('unload', setOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setOffline();
    };
  }, [user?.id]);

  const login = useCallback(async (email, password) => {
    try {
      await loginUser(email, password);
      return { success: true };
    } catch (e) {
      const msg = e.code === 'auth/invalid-credential' ? 'Invalid email or password'
        : e.code === 'auth/user-not-found' ? 'No account found with this email'
        : e.code === 'auth/wrong-password' ? 'Incorrect password'
        : e.message || 'Login failed';
      return { success: false, error: msg };
    }
  }, []);

  const signup = useCallback(async (userData) => {
    try {
      try {
        const existingUsername = await getUserByUsername(userData.username);
        if (existingUsername) {
          return { success: false, error: 'Username already exists' };
        }
      } catch (e) {
        console.warn('Could not check username:', e);
      }
      const firebaseUser = await registerUser(userData.email, userData.password, userData.name);
      const newUser = {
        id: firebaseUser.uid,
        name: userData.name,
        username: userData.username,
        email: firebaseUser.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=334155&color=fff&size=150`,
        bio: userData.bio || '',
        college: userData.college || '',
        branch: userData.branch || '',
        year: userData.year || '',
        badges: ['New Member'],
        joinedDate: new Date().getFullYear().toString(),
      };
      try {
        await createUser(newUser);
      } catch (e) {
        console.warn('Could not create user in DB:', e);
      }
      return { success: true };
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use' ? 'Email already in use'
        : e.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : e.message || 'Signup failed';
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    if (user?.id) {
      try {
        await updateUserLastActive(user.id, null);
      } catch (e) {
        console.warn('Failed to clear active status on logout:', e);
      }
    }
    await logoutUser();
    setUser(null);
  }, [user?.id]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return;
    try {
      await updateUser(user.id, updates);
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  }, [user]);

  const deleteUserHandler = useCallback(async (userId) => {
    try {
      await deleteUserFromDb(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      console.error('Failed to delete user:', e);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const { getAllUsers } = await import('../services/data');
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (e) {
      console.warn('Failed to refresh users:', e);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, users, isLoading, login, signup, logout, updateProfile, deleteUser: deleteUserHandler, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);