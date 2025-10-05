import React from 'react'
import { Modal, Table, Tag } from 'antd'

const statusColor = (s) => {
  const v = (s || '').toLowerCase()
  if (v === 'completed' || v === 'closed' || v === 'done') return 'green'
  if (v === 'in progress' || v === 'ongoing' || v === 'open') return 'blue'
  if (v === 'pending' || v === 'todo') return 'gold'
  return 'default'
}

export default function TaskTypeTasksModal({ open, onCancel, taskType, projectName, loading, tasks = [] }) {
  const columns = [
    { title: 'Task', dataIndex: 'subject', key: 'subject' },
    { title: 'Assigned To', dataIndex: 'assigned_to', key: 'assigned_to', width: 160 },
    { title: 'Due', dataIndex: 'due_date', key: 'due_date', width: 120 },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100 },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (val) => <Tag color={statusColor(val)}>{val}</Tag>
    }
  ]

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      title={`${taskType || 'Tasks'} — ${projectName || ''}`.trim()}
    >
      <Table
        rowKey={(r) => r.id || r.name || r.subject}
        loading={loading}
        columns={columns}
        dataSource={tasks}
        size="small"
        pagination={{ pageSize: 8 }}
      />
    </Modal>
  )
}

