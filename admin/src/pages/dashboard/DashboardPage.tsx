import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { UserOutlined, ApartmentOutlined, RobotOutlined, AuditOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth';
import { listUsers } from '../../api/users';
import { getDepartmentTree } from '../../api/departments';
import { listSkills } from '../../api/skills';
import { SkillStatus } from '../../types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ users: 0, departments: 0, pendingSkills: 0, approvedSkills: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, deptsRes, pendingRes, approvedRes] = await Promise.all([
          listUsers({ page: 1, page_size: 1 }),
          getDepartmentTree(),
          listSkills({ page: 1, page_size: 1, status: SkillStatus.PENDING_REVIEW }),
          listSkills({ page: 1, page_size: 1, status: SkillStatus.APPROVED }),
        ]);
        setStats({
          users: usersRes.total,
          departments: deptsRes.departments.length,
          pendingSkills: pendingRes.total,
          approvedSkills: approvedRes.total,
        });
      } catch {}
    }
    load();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>欢迎，{user?.display_name || user?.username}</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="用户总数" value={stats.users} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="部门数" value={stats.departments} prefix={<ApartmentOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="待审核 Skill" value={stats.pendingSkills} prefix={<AuditOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已发布 Skill" value={stats.approvedSkills} prefix={<RobotOutlined />} /></Card>
        </Col>
      </Row>
    </div>
  );
}
