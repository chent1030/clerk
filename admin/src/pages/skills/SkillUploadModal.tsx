import { useState } from 'react';
import { Modal, Form, Input, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useUploadSkill } from '../../hooks/useSkills';

const { Dragger } = Upload;
const { TextArea } = Input;

interface SkillUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SkillUploadModal({ open, onClose }: SkillUploadModalProps) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const uploadMut = useUploadSkill();

  const onFinish = async (values: any) => {
    if (fileList.length === 0) {
      message.error('Please select a file');
      return;
    }
    try {
      const file = fileList[0].originFileObj || fileList[0];
      await uploadMut.mutateAsync({
        file,
        name: values.name,
        description: values.description || '',
        version: values.version || '1.0.0',
      });
      message.success('Skill uploaded');
      onClose();
      form.resetFields();
      setFileList([]);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <Modal
      title="Upload Skill"
      open={open}
      onCancel={() => { onClose(); form.resetFields(); setFileList([]); }}
      onOk={() => form.submit()}
      confirmLoading={uploadMut.isPending}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Skill Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="version" label="Version" initialValue="1.0.0">
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item label="File" required>
          <Dragger
            maxCount={1}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Click or drag file to upload</p>
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
