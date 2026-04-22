import { useState } from 'react';
import { Table, Button, Input, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUsers, useToggleUserStatus, useDeleteUser } from '../../hooks/useUsers';
import { useAuthStore } from '../../stores/auth';
import { UserRole, UserStatus } from '../../types';
import type { User } from '../../types';
import UserFormModal from './UserFormModal';

export default function UserListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [deptId] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();

  const { user: currentUser } = useAuthStore();
  const { data, isLoading } = useUsers(page, pageSize, search || undefined, deptId);
  const toggleStatus = useToggleUserStatus();
  const deleteUser = useDeleteUser();

  const roleLabels: Record<string, string> = { super_admin: '超级管理员', dept_admin: '部门管理员', user: '普通用户' };
  const statusLabels: Record<string, string> = { active: '启用', disabled: '禁用' };

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colorMap: Record<string, string> = { super_admin: 'red', dept_admin: 'blue', user: 'green' };
        return <Tag color={colorMap[role] || 'default'}>{roleLabels[role] || role}</Tag>;
      },
    },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{statusLabels[status] || status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {currentUser?.role === UserRole.SUPER_ADMIN && (
            <>
              <Button size="small" onClick={() => {
                setEditingUser(record);
                setModalOpen(true);
              }}>编辑</Button>
              <Popconfirm
                title={`确认${record.status === 'active' ? '禁用' : '启用'}用户？`}
                onConfirm={() => {
                  const newStatus = record.status === 'active' ? UserStatus.DISABLED : UserStatus.ACTIVE;
                  toggleStatus.mutate({ id: record.id, status: newStatus }, {
                    onSuccess: () => message.success('状态已更新'),
                  });
                }}
              >
                <Button size="small" danger={record.status === 'active'}>
                  {record.status === 'active' ? '禁用' : '启用'}
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确认删除用户？"
                onConfirm={() => {
                  deleteUser.mutate(record.id, {
                    onSuccess: () => message.success('用户已删除'),
                  });
                }}
              >
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </>
          )}
          {currentUser?.role === UserRole.DEPT_ADMIN && record.department_id === currentUser.department_id && (
            <Button size="small" onClick={() => {
              setEditingUser(record);
              setModalOpen(true);
            }}>编辑</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="搜索用户..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 250 }}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(undefined); setModalOpen(true); }}>
          新建用户
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data?.users || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showSizeChanger: true,
        }}
      />
      <UserFormModal
        open={modalOpen}
        user={editingUser}
        onClose={() => { setModalOpen(false); setEditingUser(undefined); }}
      />
    </div>
  );
}
