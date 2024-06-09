import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          id: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
          role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
        });        
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Token decoding failed", error);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (values) => {
    try {
      const response = await axios.post("api/UserAuth/login", values, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { token } = response.data;
      localStorage.setItem("token", token);
      setIsAuthenticated(true);
      const decoded = jwtDecode(token);
      setUser({
        id: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
        role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
      });       
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.response?.data || error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
    setLoading(false);
  };

  const value = { user, isAuthenticated, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
