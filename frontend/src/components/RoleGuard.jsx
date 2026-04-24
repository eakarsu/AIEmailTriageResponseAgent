import React from 'react';
import { useAuth } from '../context/AuthContext';

const RoleGuard = ({ roles = [], children, fallback = null }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return fallback;
  }
  return children;
};

export default RoleGuard;
