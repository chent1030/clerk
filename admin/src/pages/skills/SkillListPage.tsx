import { useState } from 'react';
import { Table, Button, Tabs, Space, Tag, Popconfirm, message, Select, Modal } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSkills, useSubmitSkill, useWithdrawSkill, useDeleteSkill, useSetVisibility } from '../../hooks/useSkills';
import { useAuthStore } from '../../stores/auth';
import { SkillStatus, SkillVisibility, UserRole } from '../../types';
import type { Skill } from '../../types';
import SkillUploadModal from './SkillUploadModal';
import SkillReviewModal from './SkillReviewModal';
import { downloadSkill } from '../../api/skills';

interface SkillListPageProps {
  showReview?: boolean;
}

const statusColors: Record<string, string> = {
  pending_review: 'orange',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'default',
};

const visibilityLabels: Record<string, string> = {
  company: '全公司',
  department: '本部门',
  specific_users: '指定用户',
  private: '仅自己',
};

const statusLabels: Record<string, string> = {
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
};

export default function SkillListPage({ showReview = false }: SkillListPageProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState<string>(showReview ? 'pending_review' : 'all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewSkill, setReviewSkill] = useState<Skill | undefined>();
  const [visibilityModal, setVisibilityModal] = useState<Skill | undefined>();
  const [selectedVisibility, setSelectedVisibility] = useState<SkillVisibility>(SkillVisibility.PRIVATE);

  const { user } = useAuthStore();
  const { data, isLoading } = useSkills(
    page,
    pageSize,
    activeTab !== 'all' ? (activeTab as SkillStatus) : undefined,
  );
  const submitMut = useSubmitSkill();
  const withdrawMut = useWithdrawSkill();
  const deleteMut = useDeleteSkill();
  const setVisMut = useSetVisibility();

  const handleDownload = async (skill: Skill) => {
    try {
      await downloadSkill(skill.id, skill.name);
    } catch {
       message.error('下载失败');
    }
  };

  const openVisibilityModal = (skill: Skill) => {
    setSelectedVisibility(skill.visibility);
    setVisibilityModal(skill);
  };

  const handleVisibilityOk = () => {
    if (visibilityModal) {
      setVisMut.mutate(
        { id: visibilityModal.id, visibility: selectedVisibility },
        { onSuccess: () => { message.success('可见性已更新'); setVisibilityModal(undefined); } },
      );
    }
  };

  const columns: ColumnsType<Skill> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '版本', dataIndex: 'version', key: 'version', width: 80 },
    { title: '作者', dataIndex: 'author_name', key: 'author_name', width: 120 },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 120,
      render: (v: string) => <Tag>{visibilityLabels[v] || v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <Tag color={statusColors[status]}>{statusLabels[status] || status}</Tag>,
    },
    { title: '大小', dataIndex: 'file_size', key: 'file_size', width: 80, render: (size: number) => `${(size / 1024).toFixed(1)} KB` },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space size={4} wrap>
          {(record.status === SkillStatus.APPROVED || user?.role === UserRole.SUPER_ADMIN) && (
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>下载</Button>
          )}
          {record.status === SkillStatus.PENDING_REVIEW && record.author_id === user?.id && (
            <Button size="small" onClick={() => withdrawMut.mutate(record.id, { onSuccess: () => message.success('已撤回') })}>
              撤回
            </Button>
          )}
          {record.status === SkillStatus.PENDING_REVIEW && user?.role === UserRole.SUPER_ADMIN && (
            <Button size="small" type="primary" onClick={() => setReviewSkill(record)}>审核</Button>
          )}
          {record.status === SkillStatus.APPROVED && record.author_id === user?.id && (
            <Button size="small" onClick={() => openVisibilityModal(record)}>可见性</Button>
          )}
          {(record.status === SkillStatus.WITHDRAWN || record.status === SkillStatus.REJECTED) && record.author_id === user?.id && (
            <Button size="small" onClick={() => submitMut.mutate(record.id, { onSuccess: () => message.success('已提交') })}>
              重新提交
            </Button>
          )}
          {(record.author_id === user?.id || user?.role === UserRole.SUPER_ADMIN) && (
            <Popconfirm title="确认删除该 Skill？" onConfirm={() => deleteMut.mutate(record.id, { onSuccess: () => message.success('已删除') })}>
              <Button size="small" danger>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: '全部' },
    { key: SkillStatus.PENDING_REVIEW, label: '待审核' },
    { key: SkillStatus.APPROVED, label: '已通过' },
    { key: SkillStatus.REJECTED, label: '已驳回' },
    { key: SkillStatus.WITHDRAWN, label: '已撤回' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        {!showReview && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
            上传 Skill
          </Button>
        )}
      </div>
      <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); setPage(1); }} items={tabItems} />
      <Table
        columns={columns}
        dataSource={data?.skills || []}
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
      <SkillUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      {reviewSkill && (
        <SkillReviewModal
          skill={reviewSkill}
          open={!!reviewSkill}
          onClose={() => setReviewSkill(undefined)}
        />
      )}
      <Modal
        title="设置可见性"
        open={!!visibilityModal}
        onCancel={() => setVisibilityModal(undefined)}
        onOk={handleVisibilityOk}
      >
        <Select
          value={selectedVisibility}
          onChange={(v) => setSelectedVisibility(v)}
          style={{ width: '100%' }}
          options={[
            { value: SkillVisibility.COMPANY, label: '全公司（所有用户）' },
            { value: SkillVisibility.DEPARTMENT, label: '本部门' },
            { value: SkillVisibility.SPECIFIC_USERS, label: '指定用户' },
            { value: SkillVisibility.PRIVATE, label: '仅自己' },
          ]}
        />
      </Modal>
    </div>
  );
}
