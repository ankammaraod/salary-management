import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppLayout from './components/AppLayout';
import EmployeesPage from './pages/EmployeesPage';
import InsightsPage from './pages/InsightsPage';

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="*" element={<Navigate to="/employees" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ConfigProvider>
  );
}
