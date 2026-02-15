import { useState } from 'react'
import { Table, Button, DatePicker, TimePicker, Select, Checkbox, InputNumber, Typography, Space, theme, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

/**
 * TimeLogTable Component
 * Editable table for timesheet time logs
 * Pattern: From approved plan - inline editing with activity types and projects
 */
function TimeLogTable({ timeLogs = [], onChange, activityTypes = [], projects = [] }) {
  const { token } = theme.useToken()

  const handleCellChange = (index, field, value) => {
    const newTimeLogs = [...timeLogs]
    newTimeLogs[index] = {
      ...newTimeLogs[index],
      [field]: value
    }

    // Auto-calculate hours when from_time or to_time changes
    if ((field === 'from_time' || field === 'to_time') && newTimeLogs[index].from_time && newTimeLogs[index].to_time) {
      const fromTime = dayjs(newTimeLogs[index].from_time, 'HH:mm')
      const toTime = dayjs(newTimeLogs[index].to_time, 'HH:mm')
      const hours = toTime.diff(fromTime, 'hour', true)
      newTimeLogs[index].hours = hours > 0 ? hours : 0
    }

    onChange(newTimeLogs)
  }

  const handleDelete = (index) => {
    const newTimeLogs = timeLogs.filter((_, i) => i !== index)
    onChange(newTimeLogs)
    message.success('Time log removed')
  }

  const handleAddRow = () => {
    const newRow = {
      date: dayjs().format('YYYY-MM-DD'),
      from_time: '09:00',
      to_time: '17:00',
      activity_type: null,
      project: null,
      is_billable: false,
      hours: 8.0,
      description: ''
    }
    onChange([...timeLogs, newRow])
    message.success('New time log added')
  }

  const columns = [
    {
      title: <Text strong style={{ fontSize: 13 }}>Date</Text>,
      dataIndex: 'date',
      width: 150,
      fixed: 'left',
      render: (text, record, index) => (
        <DatePicker
          value={text ? dayjs(text) : null}
          onChange={(date) => handleCellChange(index, 'date', date ? date.format('YYYY-MM-DD') : null)}
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
        />
      )
    },
    {
      title: <Text strong style={{ fontSize: 13 }}>From Time</Text>,
      dataIndex: 'from_time',
      width: 120,
      render: (text, record, index) => (
        <TimePicker
          value={text ? dayjs(text, 'HH:mm') : null}
          onChange={(time) => handleCellChange(index, 'from_time', time ? time.format('HH:mm') : null)}
          format="HH:mm"
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: <Text strong style={{ fontSize: 13 }}>To Time</Text>,
      dataIndex: 'to_time',
      width: 120,
      render: (text, record, index) => (
        <TimePicker
          value={text ? dayjs(text, 'HH:mm') : null}
          onChange={(time) => handleCellChange(index, 'to_time', time ? time.format('HH:mm') : null)}
          format="HH:mm"
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: <Text strong style={{ fontSize: 13 }}>Activity</Text>,
      dataIndex: 'activity_type',
      width: 200,
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => handleCellChange(index, 'activity_type', value)}
          options={activityTypes}
          placeholder="Select activity"
          style={{ width: '100%' }}
          allowClear
        />
      )
    },
    {
      title: <Text strong style={{ fontSize: 13 }}>Project</Text>,
      dataIndex: 'project',
      width: 200,
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => handleCellChange(index, 'project', value)}
          options={projects}
          placeholder="Select project"
          style={{ width: '100%' }}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      )
    },
    {
      title: <Text strong style={{ fontSize: 13 }}>Billable</Text>,
      dataIndex: 'is_billable',
      width: 100,
      align: 'center',
      render: (checked, record, index) => (
        <Checkbox
          checked={checked}
          onChange={(e) => handleCellChange(index, 'is_billable', e.target.checked)}
        />
      )
    },
    {
      title: <Text strong style={{ fontSize: 13 }}>Hours</Text>,
      dataIndex: 'hours',
      width: 100,
      render: (hours, record, index) => (
        <InputNumber
          value={hours}
          onChange={(value) => handleCellChange(index, 'hours', value)}
          min={0}
          max={24}
          step={0.5}
          precision={2}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: <Text strong style={{ fontSize: 13 }}>Actions</Text>,
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record, index) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(index)}
          size="small"
        />
      )
    }
  ]

  const totalHours = timeLogs.reduce((sum, log) => sum + (log.hours || 0), 0)
  const totalTOILHours = timeLogs
    .filter(log => !log.is_billable)
    .reduce((sum, log) => sum + (log.hours || 0), 0)
  const totalTOILDays = (totalTOILHours / 8).toFixed(2)

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Table
        columns={columns}
        dataSource={timeLogs.map((log, index) => ({ ...log, key: index }))}
        pagination={false}
        size="middle"
        scroll={{ x: 1200 }}
        style={{
          backgroundColor: token.colorBgContainer,
          borderRadius: 8
        }}
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddRow}
        style={{
          width: '100%',
          height: 40,
          borderColor: token.colorPrimary,
          color: token.colorPrimary
        }}
      >
        Add Time Log
      </Button>

      {timeLogs.length > 0 && (
        <div
          style={{
            padding: 16,
            backgroundColor: token.colorInfoBg,
            border: `1px solid ${token.colorInfoBorder}`,
            borderRadius: 8
          }}
        >
          <Space direction="vertical" size="small">
            <Text strong style={{ fontSize: 15 }}>
              Summary
            </Text>
            <div>
              <Text type="secondary">Total Hours: </Text>
              <Text strong style={{ fontSize: 16 }}>
                {totalHours.toFixed(2)} hours
              </Text>
            </div>
            <div>
              <Text type="secondary">TOIL Hours (Non-Billable): </Text>
              <Text strong style={{ fontSize: 16, color: token.colorPrimary }}>
                {totalTOILHours.toFixed(2)} hours
              </Text>
            </div>
            <div>
              <Text type="secondary">TOIL Days: </Text>
              <Text strong style={{ fontSize: 18, color: token.colorSuccess }}>
                {totalTOILDays} days
              </Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                (8 hours = 1 day)
              </Text>
            </div>
          </Space>
        </div>
      )}
    </Space>
  )
}

export default TimeLogTable
