import { createContext, useContext, useEffect, useState } from "react";

// 👇 IMPORTANT: fallback localhost hata ditta
const API_BASE = import.meta.env.VITE_API_URL;

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔍 Check token on load
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // 🆕 SIGN UP
  const signUp = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          data: null,
          error: { message: data.detail || "Registration failed" },
        };
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);

      return { data, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  };

  // 🔐 SIGN IN
  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          data: null,
          error: { message: data.detail || "Login failed" },
        };
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);

      return { data, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  };

  // 🚪 SIGN OUT
  const signOut = async () => {
    localStorage.removeItem("token");
    setUser(null);
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}