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

  const columns: ColumnsType<User> = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Display Name', dataIndex: 'display_name', key: 'display_name' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colorMap: Record<string, string> = { super_admin: 'red', dept_admin: 'blue', user: 'green' };
        return <Tag color={colorMap[role] || 'default'}>{role}</Tag>;
      },
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {currentUser?.role === UserRole.SUPER_ADMIN && (
            <>
              <Button size="small" onClick={() => {
                setEditingUser(record);
                setModalOpen(true);
              }}>Edit</Button>
              <Popconfirm
                title={`Confirm ${record.status === 'active' ? 'disable' : 'enable'} user?`}
                onConfirm={() => {
                  const newStatus = record.status === 'active' ? UserStatus.DISABLED : UserStatus.ACTIVE;
                  toggleStatus.mutate({ id: record.id, status: newStatus }, {
                    onSuccess: () => message.success('Status updated'),
                  });
                }}
              >
                <Button size="small" danger={record.status === 'active'}>
                  {record.status === 'active' ? 'Disable' : 'Enable'}
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Confirm delete user?"
                onConfirm={() => {
                  deleteUser.mutate(record.id, {
                    onSuccess: () => message.success('User deleted'),
                  });
                }}
              >
                <Button size="small" danger>Delete</Button>
              </Popconfirm>
            </>
          )}
          {currentUser?.role === UserRole.DEPT_ADMIN && record.department_id === currentUser.department_id && (
            <Button size="small" onClick={() => {
              setEditingUser(record);
              setModalOpen(true);
            }}>Edit</Button>
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
            placeholder="Search users..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 250 }}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(undefined); setModalOpen(true); }}>
          New User
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
