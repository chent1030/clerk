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
  company: 'Company',
  department: 'Department',
  specific_users: 'Specific Users',
  private: 'Private',
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
      const res = await downloadSkill(skill.id);
      window.open(res.download_url, '_blank');
    } catch {
      message.error('Download failed');
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
        { onSuccess: () => { message.success('Visibility updated'); setVisibilityModal(undefined); } },
      );
    }
  };

  const columns: ColumnsType<Skill> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Version', dataIndex: 'version', key: 'version', width: 80 },
    { title: 'Author', dataIndex: 'author_name', key: 'author_name', width: 120 },
    {
      title: 'Visibility',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 120,
      render: (v: string) => <Tag>{visibilityLabels[v] || v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <Tag color={statusColors[status]}>{status.replace('_', ' ')}</Tag>,
    },
    { title: 'Size', dataIndex: 'file_size', key: 'file_size', width: 80, render: (size: number) => `${(size / 1024).toFixed(1)} KB` },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.status === SkillStatus.APPROVED && (
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>Download</Button>
          )}
          {record.status === SkillStatus.PENDING_REVIEW && record.author_id === user?.id && (
            <Button size="small" onClick={() => withdrawMut.mutate(record.id, { onSuccess: () => message.success('Withdrawn') })}>
              Withdraw
            </Button>
          )}
          {record.status === SkillStatus.PENDING_REVIEW && user?.role === UserRole.SUPER_ADMIN && (
            <Button size="small" type="primary" onClick={() => setReviewSkill(record)}>Review</Button>
          )}
          {record.status === SkillStatus.APPROVED && record.author_id === user?.id && (
            <Button size="small" onClick={() => openVisibilityModal(record)}>Visibility</Button>
          )}
          {(record.status === SkillStatus.WITHDRAWN || record.status === SkillStatus.REJECTED) && record.author_id === user?.id && (
            <Button size="small" onClick={() => submitMut.mutate(record.id, { onSuccess: () => message.success('Submitted') })}>
              Resubmit
            </Button>
          )}
          {(record.author_id === user?.id || user?.role === UserRole.SUPER_ADMIN) && (
            <Popconfirm title="Delete this skill?" onConfirm={() => deleteMut.mutate(record.id, { onSuccess: () => message.success('Deleted') })}>
              <Button size="small" danger>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: 'All' },
    { key: SkillStatus.PENDING_REVIEW, label: 'Pending Review' },
    { key: SkillStatus.APPROVED, label: 'Approved' },
    { key: SkillStatus.REJECTED, label: 'Rejected' },
    { key: SkillStatus.WITHDRAWN, label: 'Withdrawn' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        {!showReview && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
            Upload Skill
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
        title="Set Visibility"
        open={!!visibilityModal}
        onCancel={() => setVisibilityModal(undefined)}
        onOk={handleVisibilityOk}
      >
        <Select
          value={selectedVisibility}
          onChange={(v) => setSelectedVisibility(v)}
          style={{ width: '100%' }}
          options={[
            { value: SkillVisibility.COMPANY, label: 'Company (All users)' },
            { value: SkillVisibility.DEPARTMENT, label: 'Department' },
            { value: SkillVisibility.SPECIFIC_USERS, label: 'Specific Users' },
            { value: SkillVisibility.PRIVATE, label: 'Private (Only me)' },
          ]}
        />
      </Modal>
    </div>
  );
}
