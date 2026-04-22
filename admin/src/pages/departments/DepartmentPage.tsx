import { useState } from 'react';
import { Tree, Button, Space, Popconfirm, message, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TreeProps } from 'antd';
import { useDepartmentTree, useDeleteDepartment } from '../../hooks/useDepartments';
import type { Department } from '../../types';
import DepartmentForm from './DepartmentForm';

export default function DepartmentPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | undefined>();
  const [parentId, setParentId] = useState<string | undefined>();
  const { data, isLoading } = useDepartmentTree();
  const deleteDept = useDeleteDepartment();

  const buildTreeData = (depts: Department[]): TreeProps['treeData'] =>
    depts.map((dept) => ({
      key: dept.id,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {dept.name}
          <span style={{ color: '#999', fontSize: 12 }}>({dept.member_count} 人)</span>
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingDept(undefined);
                setParentId(dept.id);
                setFormOpen(true);
              }}
            />
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingDept(dept);
                setParentId(undefined);
                setFormOpen(true);
              }}
            />
            <Popconfirm
              title="确认删除该部门？"
              description="请先转移该部门下的用户。"
              onConfirm={() => {
                deleteDept.mutate(dept.id, {
                  onSuccess: () => message.success('部门已删除'),
                  onError: (e: any) => message.error(e.response?.data?.detail || '删除失败'),
                });
              }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        </span>
      ),
      children: dept.children ? buildTreeData(dept.children) : [],
    }));

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDept(undefined); setParentId(undefined); setFormOpen(true); }}>
          新建部门
        </Button>
      </div>
      <Card loading={isLoading}>
        {data?.departments && data.departments.length > 0 ? (
          <Tree
            treeData={buildTreeData(data.departments)}
            defaultExpandAll
            showLine
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无部门</div>
        )}
      </Card>
      <DepartmentForm
        open={formOpen}
        department={editingDept}
        parentId={parentId}
        onClose={() => { setFormOpen(false); setEditingDept(undefined); setParentId(undefined); }}
      />
    </div>
  );
}
