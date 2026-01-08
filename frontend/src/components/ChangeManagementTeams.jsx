import { useState, useEffect } from 'react'
import { Row, Col, Card, Spin, Empty, Button, Space, Typography, theme, Input, Select, Table, Tag, Tooltip, message, Popconfirm, Breadcrumb, Badge, Avatar } from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, EyeOutlined, TeamOutlined, CrownOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import useChangeManagementTeamStore from '../stores/changeManagementTeamStore'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

function ChangeManagementTeams({ navigateToRoute }) {
  const { token } = theme.useToken()
  const [localSearch, setLocalSearch] = useState('')
  const [localStatusFilter, setLocalStatusFilter] = useState('all')

  const {
    teams,
    loading,
    error,
    pagination,
    filters,
    fetchTeams,
    setFilters,
    setPagination,
    deleteTeam
  } = useChangeManagementTeamStore()

  // Load teams on mount
  useEffect(() => {
    fetchTeams({}, pagination)
  }, [])

  const handleSearch = (value) => {
    setLocalSearch(value)
    setFilters({ search: value, status: localStatusFilter })
  }

  const handleStatusFilter = (value) => {
    setLocalStatusFilter(value)
    setFilters({ search: localSearch, status: value })
  }

  const handleRefresh = () => {
    fetchTeams(filters, pagination)
  }

  const handleCreateTeam = () => {
    if (navigateToRoute) {
      navigateToRoute('change-management-team-create')
    }
  }

  const handleViewTeam = (teamId) => {
    if (navigateToRoute) {
      navigateToRoute('change-management-team-detail', null, teamId)
    }
  }

  const handleEditTeam = (teamId) => {
    if (navigateToRoute) {
      navigateToRoute('change-management-team-edit', null, teamId)
    }
  }

  const handleDeleteTeam = async (teamId) => {
    try {
      await deleteTeam(teamId)
      message.success('Team deleted successfully')
    } catch (error) {
      message.error(`Failed to delete team: ${error.message}`)
    }
  }

  const getStatusColor = (status) => {
    const statusLower = (status || 'active').toLowerCase()
    switch (statusLower) {
      case 'active':
        return { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' }
      case 'inactive':
        return { color: '#8c8c8c', bg: '#f5f5f5', border: '#d9d9d9' }
      default:
        return { color: '#1677ff', bg: '#e6f4ff', border: '#91caff' }
    }
  }

  const getDefaultBadge = (isDefault) => {
    if (isDefault) {
      return (
        <Tag
          icon={<StarFilled style={{ color: '#faad14' }} />}
          style={{
            backgroundColor: '#fffbe6',
            borderColor: '#ffe58f',
            color: '#d48806',
            fontWeight: 600,
            fontSize: '11px',
            marginLeft: 8
          }}
        >
          Default
        </Tag>
      )
    }
    return null
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const tableColumns = [
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Team</Text>,
      dataIndex: 'team_name',
      key: 'team_name',
      fixed: 'left',
      width: 280,
      render: (text, record) => {
        const statusStyle = getStatusColor(record.status)
        const isActive = (record.status || 'active').toLowerCase() === 'active'
        const isDefault = record.is_default === 1

        return (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '8px 0',
            backgroundColor: isDefault ? '#fffbe6' : 'transparent',
            margin: '-8px 0 -8px -8px',
            paddingLeft: 8,
            borderRadius: '8px 0 0 8px',
            borderLeft: isDefault ? '3px solid #faad14' : '3px solid transparent'
          }}>
            <Badge
              dot={isDefault ? 'gold' : 'default'}
              color={isDefault ? '#faad14' : 'default'}
              offset={[-2, 4]}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: isDefault ? '#faad14' : token.colorPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDefault ? '0 2px 8px rgba(250, 173, 20, 0.3)' : 'none'
              }}>
                <TeamOutlined style={{ fontSize: '18px', color: '#fff' }} />
              </div>
            </Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  type="link"
                  onClick={() => handleViewTeam(record.name)}
                  style={{
                    padding: 0,
                    height: 'auto',
                    fontWeight: isDefault ? 700 : 600,
                    fontSize: '14px',
                    textAlign: 'left',
                    color: isDefault ? '#faad14' : isActive ? '#52c41a' : token.colorPrimary,
                    marginBottom: 2
                  }}
                >
                  {text || 'Unnamed Team'}
                </Button>
                {isDefault && (
                  <Tooltip title="This is the default team for new change requests">
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#fffbe6',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: '1px solid #ffe58f'
                    }}>
                      <StarFilled style={{ color: '#faad14', fontSize: 11 }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#d48806' }}>Default</span>
                    </div>
                  </Tooltip>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text
                  type="secondary"
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    backgroundColor: token.colorBgLayout,
                    padding: '2px 6px',
                    borderRadius: 4
                  }}
                >
                  {record.name}
                </Text>
                {isDefault && (
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: 4,
                      backgroundColor: '#fffbe6',
                      borderColor: '#ffe58f',
                      color: '#d48806',
                      fontWeight: 500
                    }}
                  >
                    Default
                  </Tag>
                )}
              </div>
            </div>
          </div>
        )
      },
      sorter: (a, b) => (a.team_name || '').localeCompare(b.team_name || '')
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Description</Text>,
      dataIndex: 'description',
      key: 'description',
      width: 250,
      render: (text, record) => (
        <div>
          <Text style={{ fontSize: '12px', color: token.colorText }}>
            {text ? text.substring(0, 60) + (text.length > 60 ? '...' : '') : (
              <Text type="secondary" italic>No description</Text>
            )}
          </Text>
          {record.is_default && (
            <div style={{ marginTop: 4 }}>
              {getDefaultBadge(true)}
            </div>
          )}
        </div>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Created</Text>,
      dataIndex: 'creation',
      key: 'creation',
      width: 120,
      render: (date) => (
        <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>
          {formatDate(date)}
        </Text>
      ),
      sorter: (a, b) => new Date(a.creation || 0) - new Date(b.creation || 0)
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Actions</Text>,
      key: 'actions',
      fixed: 'right',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewTeam(record.name)}
              style={{ color: token.colorPrimary }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditTeam(record.name)}
              style={{ color: token.colorInfo }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Team"
              description="Are you sure you want to delete this team?"
              onConfirm={() => handleDeleteTeam(record.name)}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                style={{ color: token.colorError }}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  if (error) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Empty
          description={error}
          style={{ marginTop: '50px', marginBottom: '50px' }}
        >
          <Button type="primary" onClick={handleRefresh}>
            Retry
          </Button>
        </Empty>
      </Card>
    )
  }

  return (
    <div>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col xs={24} sm={16}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Breadcrumb
                items={[
                  { title: 'Configuration' },
                  { title: 'Change Management' },
                  { title: 'Teams' }
                ]}
                style={{ fontSize: '12px' }}
              />
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <TeamOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Change Management Teams
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Configure static teams for change management operations
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateTeam}
              >
                Add Team
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search team name..."
              prefix={<SearchOutlined />}
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by status"
              value={localStatusFilter}
              onChange={handleStatusFilter}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Teams Table */}
      <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <Spin spinning={loading} tip="Loading teams...">
          {teams.length > 0 ? (
            <Table
              columns={tableColumns}
              dataSource={teams}
              rowKey="name"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                onChange: (page, pageSize) =>
                  setPagination({ current: page, pageSize, total: pagination.total })
              }}
              scroll={{ x: 1000 }}
              size="middle"
            />
          ) : (
            <Empty
              description="No teams found"
              style={{ marginTop: '50px', marginBottom: '50px' }}
            >
              <Button type="primary" onClick={handleCreateTeam}>
                Create First Team
              </Button>
            </Empty>
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default ChangeManagementTeams
