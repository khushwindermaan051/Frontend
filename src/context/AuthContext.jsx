import { createContext, useContext, useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('loginTime');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginTime = localStorage.getItem('loginTime');

    if (!token) {
      setLoading(false);
      return;
    }

    // Expire session after 24 hours
    if (!loginTime || Date.now() - Number(loginTime) > SESSION_DURATION) {
      clearSession();
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok)
        return {
          data: null,
          error: { message: data.detail || 'Registration failed' },
        };
      localStorage.setItem('token', data.token);
      localStorage.setItem('loginTime', String(Date.now()));
      setUser(data.user);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  };

  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok)
        return {
          data: null,
          error: { message: data.detail || 'Login failed' },
        };
      localStorage.setItem('token', data.token);
      localStorage.setItem('loginTime', String(Date.now()));
      setUser(data.user);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  };

  const signOut = async () => {
    clearSession();
    setUser(null);
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
