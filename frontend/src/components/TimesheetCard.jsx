import React from 'react'
import { Card, Button, Tag, Statistic, Space } from 'antd'
import { EyeOutlined, CheckCircleOutlined } from '@ant-design/icons'

const TimesheetCard = ({ timesheet, onView, onApprove, isSupervisor }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'default'
      case 'Pending Accrual': return 'orange'
      case 'Accrued': return 'blue'
      case 'Partially Used': return 'cyan'
      case 'Fully Used': return 'green'
      default: return 'default'
    }
  }

  return (
    <Card
      style={{ marginBottom: 16 }}
      actions={[
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => onView(timesheet)}
          key="view"
        >
          View
        </Button>,
        isSupervisor && timesheet.toil_status === 'Pending Accrual' && (
          <Button
            type="text"
            icon={<CheckCircleOutlined />}
            onClick={() => onApprove(timesheet)}
            key="approve"
          >
            Approve
          </Button>
        )
      ].filter(Boolean)}
    >
      <Card.Meta
        title={`${timesheet.employee_name} - ${timesheet.name}`}
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Tag color={getStatusColor(timesheet.toil_status)}>
              {timesheet.toil_status || 'Not Applicable'}
            </Tag>
            <div>
              <Statistic
                value={timesheet.toil_days}
                precision={2}
                suffix="days"
                style={{ marginTop: 8 }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {timesheet.from_date} to {timesheet.to_date}
            </div>
          </Space>
        }
      />
    </Card>
  )
}

export default TimesheetCard
