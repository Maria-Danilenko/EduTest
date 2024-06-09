import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";

function AuthRedirect({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {   
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const profilePath = `/${user.role}-profile/${user.id}`;
  return <Navigate to={profilePath} replace />;
}

export default AuthRedirect;