import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { StorageRepo } from '../lib/storage';
import { UserRole, DEFAULT_TAB_BY_ROLE } from '../types/domain';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const user = StorageRepo.getCurrentUser();

  // If not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // If user role is not allowed, redirect to their default dashboard
  if (!allowedRoles.includes(user.role)) {
    const defaultTab = DEFAULT_TAB_BY_ROLE[user.role] || 'customer-stores';
    // Map default tabs to actual routes
    const roleRouteMap: Record<string, string> = {
      'customer-stores': '/stores',
      'store-dashboard': '/store/dashboard',
      'delivery-dashboard': '/delivery/dashboard',
      'admin-dashboard': '/admin',
      'delivery-supervisor-dashboard': '/supervisor/dashboard',
      'finance-admin-dashboard': '/finance/dashboard',
      'orders-manager-dashboard': '/orders-manager/dashboard',
    };
    const redirectPath = roleRouteMap[defaultTab] || '/';
    return <Navigate to={redirectPath} replace />;
  }

  // Allow access
  return <>{children}</>;
};

export default ProtectedRoute;