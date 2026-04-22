import { useEffect } from 'react';
import { Modal, Form, Input, TreeSelect, message } from 'antd';
import { useCreateDepartment, useUpdateDepartment, useDepartmentTree } from '../../hooks/useDepartments';
import type { Department } from '../../types';

interface DepartmentFormProps {
  open: boolean;
  department?: Department;
  parentId?: string;
  onClose: () => void;
}

export default function DepartmentForm({ open, department, parentId, onClose }: DepartmentFormProps) {
  const [form] = Form.useForm();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const { data } = useDepartmentTree();
  const isEdit = !!department;

  const buildTreeSelectData = (depts: Department[]): any[] =>
    depts.map((dept) => ({
      value: dept.id,
      title: dept.name,
      children: dept.children ? buildTreeSelectData(dept.children) : [],
    }));

  useEffect(() => {
    if (open) {
      if (department) {
        form.setFieldsValue({
          name: department.name,
          parent_id: department.parent_id,
        });
      } else {
        form.resetFields();
        if (parentId) {
          form.setFieldsValue({ parent_id: parentId });
        }
      }
    }
  }, [open, department, parentId, form]);

  const onFinish = async (values: any) => {
    try {
      if (isEdit) {
        await updateDept.mutateAsync({
          id: department!.id,
          data: { name: values.name, parent_id: values.parent_id },
        });
        message.success('Department updated');
      } else {
        await createDept.mutateAsync({
          name: values.name,
          parent_id: values.parent_id,
        });
        message.success('Department created');
      }
      onClose();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Operation failed');
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Department' : 'New Department'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={createDept.isPending || updateDept.isPending}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter department name' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="parent_id" label="Parent Department">
          <TreeSelect
            treeData={buildTreeSelectData(data?.departments || [])}
            placeholder="None (top level)"
            allowClear
            treeDefaultExpandAll
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
