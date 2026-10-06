/**
 * App Component — Root Provider & Router
 * The Bharmals Kitchen — Restaurant Management System
 */

import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../hooks/useAuth';
import { router } from './router';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(20, 20, 50, 0.95)',
            color: '#f0ece4',
            border: '1px solid rgba(200, 169, 126, 0.2)',
            borderRadius: '10px',
            fontSize: '14px',
            backdropFilter: 'blur(16px)',
          },
          success: {
            iconTheme: { primary: '#4ecb71', secondary: '#0a0a1a' },
          },
          error: {
            iconTheme: { primary: '#e74c6f', secondary: '#0a0a1a' },
          },
        }}
      />
    </AuthProvider>
  );
}
