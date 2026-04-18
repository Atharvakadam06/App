const USERS_KEY = 'stugrow-auth-users';
const SESSION_KEY = 'stugrow-session';

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function setSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

let authListeners = [];
let currentUser = getSession();

function notifyListeners(user) {
  currentUser = user;
  authListeners.forEach(cb => cb(user));
}

export async function registerUser(email, password, displayName) {
  const users = loadUsers();
  if (users[email]) {
    const err = new Error('Email already in use');
    err.code = 'auth/email-already-in-use';
    throw err;
  }
  const uid = 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  users[email] = { uid, email, password, displayName };
  saveUsers(users);
  const user = { uid, email, displayName };
  setSession(user);
  notifyListeners(user);
  return user;
}

export async function loginUser(email, password) {
  const users = loadUsers();
  const entry = users[email];
  if (!entry || entry.password !== password) {
    const err = new Error('Invalid email or password');
    err.code = 'auth/invalid-credential';
    throw err;
  }
  const user = { uid: entry.uid, email: entry.email, displayName: entry.displayName };
  setSession(user);
  notifyListeners(user);
  return user;
}

export async function logoutUser() {
  setSession(null);
  notifyListeners(null);
}

export function onAuthChange(callback) {
  authListeners.push(callback);
  setTimeout(() => callback(currentUser), 0);
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

export function getCurrentUser() {
  return currentUser;
}

export const DEMO_ACCOUNTS = [
  { email: 'alice@college.ac.in', password: 'demo1234', displayName: 'Alice Sharma' },
  { email: 'bob@college.ac.in', password: 'demo1234', displayName: 'Bob Patel' },
];

export function seedDemoAccounts() {
  const users = loadUsers();
  let changed = false;
  for (const demo of DEMO_ACCOUNTS) {
    if (!users[demo.email]) {
      const uid = 'demo_' + demo.email.split('@')[0];
      users[demo.email] = { uid, email: demo.email, password: demo.password, displayName: demo.displayName };
      changed = true;
    }
  }
  if (changed) saveUsers(users);
}

export const auth = { currentUser };
