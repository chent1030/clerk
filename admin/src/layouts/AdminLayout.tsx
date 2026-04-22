import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ApartmentOutlined,
  RobotOutlined,
  AuditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../stores/auth';
import { UserRole } from '../types';

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const menuItems: MenuProps['items'] = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
  ];

  if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.DEPT_ADMIN) {
    menuItems!.push({
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
    });
  }

  if (user?.role === UserRole.SUPER_ADMIN) {
    menuItems!.push({
      key: '/admin/departments',
      icon: <ApartmentOutlined />,
      label: '部门管理',
    });
  }

  menuItems!.push({
    key: '/admin/skills',
    icon: <RobotOutlined />,
    label: 'Skill 管理',
  });

  if (user?.role === UserRole.SUPER_ADMIN) {
    menuItems!.push({
      key: '/admin/skills/review',
      icon: <AuditOutlined />,
      label: 'Skill 审核',
    });
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const selectedKey = location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, color: 'white', fontSize: collapsed ? 14 : 18, fontWeight: 'bold', textAlign: 'center' }}>
          {collapsed ? 'DF' : 'DeerFlow 管理端'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.display_name || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
