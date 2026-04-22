import { useState } from 'react';
import { Modal, Descriptions, Radio, Input, Button, message, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useReviewSkill } from '../../hooks/useSkills';
import { downloadSkill } from '../../api/skills';
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

  const handleDownload = async () => {
    try {
      await downloadSkill(skill.id, skill.name);
      message.success('下载已开始');
    } catch {
      message.error('下载失败');
    }
  };

  const handleSubmit = async () => {
    try {
      await reviewMut.mutateAsync({ id: skill.id, action, comment });
      message.success(action === 'approve' ? 'Skill 已通过' : 'Skill 已驳回');
      onClose();
      setComment('');
      setAction('approve');
    } catch (e: any) {
      message.error(e.response?.data?.detail || '审核失败');
    }
  };

  return (
    <Modal
      title="审核 Skill"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            下载验证
          </Button>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={reviewMut.isPending}
            danger={action === 'reject'}
            onClick={handleSubmit}
          >
            {action === 'approve' ? '通过' : '驳回'}
          </Button>
        </Space>
      }
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="名称">{skill.name}</Descriptions.Item>
        <Descriptions.Item label="版本">{skill.version}</Descriptions.Item>
        <Descriptions.Item label="描述">{skill.description || '-'}</Descriptions.Item>
        <Descriptions.Item label="作者">{skill.author_name || skill.author_id}</Descriptions.Item>
        <Descriptions.Item label="大小">{(skill.file_size / 1024).toFixed(1)} KB</Descriptions.Item>
      </Descriptions>
      <div style={{ marginTop: 16 }}>
        <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
          <Radio value="approve">通过</Radio>
          <Radio value="reject">驳回</Radio>
        </Radio.Group>
      </div>
      <div style={{ marginTop: 12 }}>
        <TextArea
          rows={3}
          placeholder="审核意见（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
    </Modal>
  );
}
