import { useState } from 'react';
import { Modal, Descriptions, Radio, Input, message } from 'antd';
import { useReviewSkill } from '../../hooks/useSkills';
import type { Skill } from '../../types';

const { TextArea } = Input;

interface SkillReviewModalProps {
  skill: Skill;
  open: boolean;
  onClose: () => void;
}

export default function SkillReviewModal({ skill, open, onClose }: SkillReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const reviewMut = useReviewSkill();

  const handleSubmit = async () => {
    try {
      await reviewMut.mutateAsync({ id: skill.id, action, comment });
      message.success(`Skill ${action === 'approve' ? 'approved' : 'rejected'}`);
      onClose();
      setComment('');
      setAction('approve');
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Review failed');
    }
  };

  return (
    <Modal
      title="Review Skill"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={reviewMut.isPending}
      okText={action === 'approve' ? 'Approve' : 'Reject'}
      okButtonProps={{ danger: action === 'reject' }}
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Name">{skill.name}</Descriptions.Item>
        <Descriptions.Item label="Version">{skill.version}</Descriptions.Item>
        <Descriptions.Item label="Description">{skill.description || '-'}</Descriptions.Item>
        <Descriptions.Item label="Author">{skill.author_name || skill.author_id}</Descriptions.Item>
        <Descriptions.Item label="File Size">{(skill.file_size / 1024).toFixed(1)} KB</Descriptions.Item>
      </Descriptions>
      <div style={{ marginTop: 16 }}>
        <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
          <Radio value="approve">Approve</Radio>
          <Radio value="reject">Reject</Radio>
        </Radio.Group>
      </div>
      <div style={{ marginTop: 12 }}>
        <TextArea
          rows={3}
          placeholder="Review comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
    </Modal>
  );
}
