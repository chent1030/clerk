import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { useAuthStore } from './stores/auth';
import { UserRole } from './types';
import AuthGuard from './components/AuthGuard';
import RoleGuard from './components/RoleGuard';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UserListPage from './pages/users/UserListPage';
import DepartmentPage from './pages/departments/DepartmentPage';

const queryClient = new QueryClient();

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ConfigProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
              <Route index element={<Navigate to="dashboard" />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<RoleGuard roles={[UserRole.SUPER_ADMIN, UserRole.DEPT_ADMIN]}><UserListPage /></RoleGuard>} />
              <Route path="departments" element={<RoleGuard roles={[UserRole.SUPER_ADMIN]}><DepartmentPage /></RoleGuard>} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
