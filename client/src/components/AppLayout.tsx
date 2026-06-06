import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

const { Header, Content } = Layout;

const NAV_ITEMS = [{ key: '/employees', label: 'Employees' }];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          height: 56,
          lineHeight: '56px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, color: '#222', marginRight: 40 }}>
          ACME Salary Management
        </span>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', flex: 1 }}
        />
      </Header>
      <Content style={{ background: '#f5f5f5', padding: 24 }}>
        {children}
      </Content>
    </Layout>
  );
}
