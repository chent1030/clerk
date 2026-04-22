import { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useCreateUser, useUpdateUser } from '../../hooks/useUsers';
import { useAuthStore } from '../../stores/auth';
import { UserRole } from '../../types';
import type { User } from '../../types';

interface UserFormModalProps {
  open: boolean;
  user?: User;
  onClose: () => void;
}

export default function UserFormModal({ open, user, onClose }: UserFormModalProps) {
  const [form] = Form.useForm();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { user: currentUser } = useAuthStore();
  const isEdit = !!user;
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          role: user.role,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, user, form]);

  const onFinish = async (values: Record<string, string>) => {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          id: user!.id,
          data: {
            display_name: values.display_name,
            email: values.email,
            role: values.role,
          },
        });
        message.success('User updated');
      } else {
        await createUser.mutateAsync({
          username: values.username,
          password: values.password,
          display_name: values.display_name,
          email: values.email,
          role: values.role,
        });
        message.success('User created');
      }
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || 'Operation failed');
    }
  };

  const roleOptions = isSuperAdmin
    ? [
        { value: UserRole.USER, label: 'User' },
        { value: UserRole.DEPT_ADMIN, label: 'Department Admin' },
        { value: UserRole.SUPER_ADMIN, label: 'Super Admin' },
      ]
    : [{ value: UserRole.USER, label: 'User' }];

  return (
    <Modal
      title={isEdit ? 'Edit User' : 'New User'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={createUser.isPending || updateUser.isPending}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="username" label="Username" rules={isEdit ? [] : [{ required: true, min: 2, max: 50 }]}>
          <Input disabled={isEdit} />
        </Form.Item>
        {!isEdit && (
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
        )}
        <Form.Item name="display_name" label="Display Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select options={roleOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
