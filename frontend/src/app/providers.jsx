import React from 'react';
import { AuthProvider } from '../features/auth/auth.context';

export const Providers = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

export default Providers;
