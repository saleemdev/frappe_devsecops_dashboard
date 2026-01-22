/**
 * ZenhubIssuesTable Component
 *
 * Displays issues/projects/epics in a data table with:
 * - Sortable columns
 * - Pagination
 * - Status indicators
 * - Assignee display
 * - Blocked issue warnings
 *
 * @component
 * @param {Object} props
 * @param {Array} props.issues - Array of issue/project/epic objects
 * @param {string} props.searchText - Search filter text
 * @param {boolean} [props.loading] - Loading state
 * @param {Function} [props.onRowClick] - Callback when row is clicked
 * @returns {JSX.Element}
 */

import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Table, Tag, Empty, Space, Typography, Tooltip, Skeleton } from 'antd'
import { CheckCircleOutlined, AlertOutlined } from '@ant-design/icons'
import styles from './ZenhubDashboard.module.css'

const { Text } = Typography

const ZenhubIssuesTable = React.memo(({
  issues = [],
  searchText = '',
  loading = false,
  onRowClick = null
}) => {
  // Filter issues based on search text
  const filteredIssues = useMemo(() => {
    if (!searchText.trim()) {
      return issues
    }

    const lowerSearch = searchText.toLowerCase()
    return issues.filter((issue) => {
      const title = issue.title?.toLowerCase() || ''
      const number = String(issue.number || '')
      return title.includes(lowerSearch) || number.includes(lowerSearch)
    })
  }, [issues, searchText])

  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    )
  }

  if (filteredIssues.length === 0) {
    return <Empty description="No issues found" />
  }

  const getStatusColor = (state) => {
    switch (state) {
      case 'CLOSED':
        return 'success'
      case 'IN_PROGRESS':
        return 'processing'
      case 'OPEN':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (state) => {
    return state?.replace('_', ' ') || 'Unknown'
  }

  const columns = [
    {
      title: '#',
      dataIndex: 'number',
      key: 'number',
      width: 60,
      sorter: (a, b) => a.number - b.number
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      flex: 1,
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <Text ellipsis>{text}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Status',
      dataIndex: 'state',
      key: 'state',
      width: 120,
      render: (state) => (
        <Tag color={getStatusColor(state)}>
          {getStatusLabel(state)}
        </Tag>
      ),
      filters: [
        { text: 'Open', value: 'OPEN' },
        { text: 'In Progress', value: 'IN_PROGRESS' },
        { text: 'Closed', value: 'CLOSED' }
      ],
      onFilter: (value, record) => record.state === value
    },
    {
      title: 'Points',
      dataIndex: ['estimate', 'value'],
      key: 'points',
      width: 80,
      render: (value) => value ? <Text strong>{value}</Text> : <Text type="secondary">—</Text>,
      sorter: (a, b) => (a.estimate?.value || 0) - (b.estimate?.value || 0),
      align: 'right'
    },
    {
      title: 'Assignees',
      dataIndex: 'assignees',
      key: 'assignees',
      width: 150,
      render: (assignees) => {
        if (!assignees?.nodes || assignees.nodes.length === 0) {
          return <Text type="secondary">Unassigned</Text>
        }

        const names = assignees.nodes.slice(0, 2).map(a => a.name).join(', ')
        const moreCount = assignees.nodes.length - 2

        return (
          <Tooltip title={assignees.nodes.map(a => a.name).join(', ')}>
            <Text ellipsis>
              {names}
              {moreCount > 0 && ` +${moreCount}`}
            </Text>
          </Tooltip>
        )
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Space size="small">
          {record.blockingItems?.nodes?.length > 0 && (
            <Tooltip title={`Blocked by ${record.blockingItems.nodes[0].title}`}>
              <AlertOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
          {record.state === 'CLOSED' && (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          )}
        </Space>
      ),
      align: 'center'
    }
  ]

  return (
    <div className={styles.tableContainer}>
      <Table
        columns={columns}
        dataSource={filteredIssues.map((issue, idx) => ({
          ...issue,
          key: issue.id || idx
        }))}
        pagination={{
          pageSize: 25,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`
        }}
        size="small"
        scroll={{ x: 'max-content' }}
        onRow={onRowClick ? (record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: 'pointer' }
        }) : null}
      />
    </div>
  )
})

ZenhubIssuesTable.displayName = 'ZenhubIssuesTable'

ZenhubIssuesTable.propTypes = {
  issues: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      number: PropTypes.number,
      title: PropTypes.string.isRequired,
      state: PropTypes.oneOf(['OPEN', 'IN_PROGRESS', 'CLOSED']),
      estimate: PropTypes.shape({
        value: PropTypes.number
      }),
      assignees: PropTypes.shape({
        nodes: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            name: PropTypes.string
          })
        )
      }),
      blockingItems: PropTypes.shape({
        nodes: PropTypes.array
      })
    })
  ),
  searchText: PropTypes.string,
  loading: PropTypes.bool,
  onRowClick: PropTypes.func
}

export default ZenhubIssuesTable
