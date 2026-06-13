import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Auth } from '../components/Auth';
import { Dashboard } from '../components/Dashboard';
import { ImmediateUse } from '../components/ImmediateUse';
import { ScheduleBooking } from '../components/ScheduleBooking';
import { AdminPanel } from '../components/AdminPanel';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="badge-primary animate-fade-in" style={{ padding: '16px 24px', fontSize: '18px' }}>
          Loading CarsManager...
        </div>
      </div>
    );
  }

  // If not logged in, show Auth component
  if (!user) {
    return <Auth />;
  }

  // If logged in, show authenticated routes
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/use-now" element={<ImmediateUse />} />
      <Route path="/schedule" element={<ScheduleBooking />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
