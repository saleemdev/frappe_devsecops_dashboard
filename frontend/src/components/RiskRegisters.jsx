import { useState, useEffect } from 'react'
import { Row, Col, Card, Spin, Empty, Button, Space, Typography, theme, Input, Select, Table, Tag, Tooltip, Drawer, message, Popconfirm } from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined, FileProtectOutlined, EditOutlined, DeleteOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons'
import { useResponsive } from '../hooks/useResponsive'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

/**
 * Risk Registers Component
 * Displays list of risk registers with filtering and CRUD operations
 * Follows Gestalt principles for visual organization
 */
function RiskRegisters({ navigateToRoute }) {
  const { token } = theme.useToken()
  const { isMobile } = useResponsive()

  const [riskRegisters, setRiskRegisters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchRiskRegisters()
  }, [])

  const fetchRiskRegisters = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch with specific fields including project_name
      // Note: 'risks' is a child table and cannot be included in fields parameter
      const fields = [
        'name',
        'project',
        'project_name',
        'risk_register_status',
        'last_reviewed_date',
        'risk_summary'
      ]
      const url = `/api/resource/Risk Register?fields=${JSON.stringify(fields)}`

      console.log('[RiskRegisters] Fetching from:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[RiskRegisters] Fetched data:', result.data)
        setRiskRegisters(result.data || [])
      } else {
        const errorData = await response.json()
        console.error('[RiskRegisters] API Error:', errorData)

        // Extract error message
        let errorMessage = 'Failed to fetch risk registers'
        if (errorData._server_messages) {
          try {
            const serverMessages = JSON.parse(errorData._server_messages)
            const firstMessage = JSON.parse(serverMessages[0])
            errorMessage = firstMessage.message || errorMessage
          } catch (e) {
            errorMessage = errorData._server_messages
          }
        } else if (errorData.exception) {
          errorMessage = errorData.exception
        } else if (errorData.message) {
          errorMessage = errorData.message
        }

        setError(errorMessage)
        setRiskRegisters([])
      }
    } catch (err) {
      console.error('[RiskRegisters] Error fetching:', err)
      setError(err.message || 'An error occurred while fetching risk registers')
      setRiskRegisters([])
    } finally {
      setLoading(false)
    }
  }

  const filteredRiskRegisters = riskRegisters.filter(register => {
    const matchesSearch = !searchText ||
      (register.project && register.project.toLowerCase().includes(searchText.toLowerCase())) ||
      (register.project_name && register.project_name.toLowerCase().includes(searchText.toLowerCase()))

    const matchesStatus = filterStatus === 'all' ||
      (register.risk_register_status && register.risk_register_status.toLowerCase() === filterStatus.toLowerCase())

    return matchesSearch && matchesStatus
  })

  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Under Review', value: 'under review' },
    { label: 'Archived', value: 'archived' }
  ]

  const handleCreateRegister = () => {
    if (navigateToRoute) {
      navigateToRoute('risk-register-create')
    }
  }

  const handleViewRegister = (register) => {
    console.log('[RiskRegisters] View clicked for register:', register.name)
    if (navigateToRoute) {
      navigateToRoute('risk-register-detail', register.name)
    } else {
      console.error('[RiskRegisters] navigateToRoute is not available')
    }
  }

  const handleEditRegister = (registerId) => {
    console.log('[RiskRegisters] Edit clicked for registerId:', registerId)
    if (navigateToRoute) {
      navigateToRoute('risk-register-edit', registerId)
    } else {
      console.error('[RiskRegisters] navigateToRoute is not available')
    }
  }

  const handleDeleteRegister = async (registerId) => {
    try {
      console.log('[RiskRegisters] Deleting register:', registerId)

      const response = await fetch(`/api/resource/Risk Register/${registerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      if (response.ok) {
        message.success({
          content: 'Risk Register deleted successfully',
          duration: 3
        })
        fetchRiskRegisters()
      } else {
        const errorData = await response.json()
        console.error('[RiskRegisters] Delete error:', errorData)

        // Extract error message
        let errorMessage = 'Failed to delete risk register'
        if (errorData._server_messages) {
          try {
            const serverMessages = JSON.parse(errorData._server_messages)
            const firstMessage = JSON.parse(serverMessages[0])
            errorMessage = firstMessage.message || errorMessage
          } catch (e) {
            errorMessage = errorData._server_messages
          }
        } else if (errorData.exception) {
          errorMessage = errorData.exception
        } else if (errorData.message) {
          errorMessage = errorData.message
        }

        message.error({
          content: errorMessage,
          duration: 5
        })
      }
    } catch (error) {
      console.error('[RiskRegisters] Error deleting:', error)
      message.error({
        content: `Network error: ${error.message}. Please check your connection and try again.`,
        duration: 5
      })
    }
  }

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase()
    switch (statusLower) {
      case 'active': return 'green'
      case 'under review': return 'orange'
      case 'archived': return 'default'
      default: return 'blue'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Calculate risk statistics from child table
  const getRiskStats = (register) => {
    // This would need to fetch child table data
    // For now returning placeholder
    return {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  }

  const tableColumns = [
    {
      title: <Text strong style={{ fontSize: '13px' }}>Project</Text>,
      dataIndex: 'project_name',
      key: 'project_name',
      fixed: 'left',
      width: 280,
      render: (text, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0', maxWidth: '100%' }}>
          <Button
            type="link"
            onClick={() => handleViewRegister(record)}
            style={{
              padding: 0,
              height: 'auto',
              fontWeight: 600,
              fontSize: '15px',
              textAlign: 'left',
              color: token.colorPrimary,
              lineHeight: '1.4',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              wordBreak: 'break-word',
              display: 'block',
              maxWidth: '100%'
            }}
          >
            {text || record.project || 'Unnamed Project'}
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileProtectOutlined style={{ fontSize: '11px', color: token.colorTextTertiary }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.name}
            </Text>
          </div>
        </div>
      ),
      sorter: (a, b) => (a.project_name || a.project || '').localeCompare(b.project_name || b.project || ''),
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Status</Text>,
      dataIndex: 'risk_register_status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status) => (
        <Tag
          color={getStatusColor(status)}
          style={{
            margin: 0,
            fontWeight: 500,
            fontSize: '12px',
            padding: '3px 12px',
            borderRadius: '6px'
          }}
        >
          {status || 'Active'}
        </Tag>
      ),
      filters: statusOptions.filter(opt => opt.value !== 'all').map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => (record.risk_register_status || 'active').toLowerCase() === value.toLowerCase(),
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Last Reviewed</Text>,
      dataIndex: 'last_reviewed_date',
      key: 'last_reviewed_date',
      width: 150,
      render: (date) => (
        <Text style={{ fontSize: '13px' }}>
          {formatDate(date)}
        </Text>
      ),
      sorter: (a, b) => {
        const dateA = new Date(a.last_reviewed_date || 0)
        const dateB = new Date(b.last_reviewed_date || 0)
        return dateA - dateB
      },
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Risk Summary</Text>,
      key: 'risk_summary',
      width: 180,
      render: (_, record) => {
        const stats = getRiskStats(record)
        return (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <Tooltip title="Critical Risks">
              <Tag color="red" style={{ margin: 0, fontSize: '11px' }}>
                <WarningOutlined /> {stats.critical}
              </Tag>
            </Tooltip>
            <Tooltip title="High Risks">
              <Tag color="orange" style={{ margin: 0, fontSize: '11px' }}>
                {stats.high}
              </Tag>
            </Tooltip>
            <Tooltip title="Medium Risks">
              <Tag color="blue" style={{ margin: 0, fontSize: '11px' }}>
                {stats.medium}
              </Tag>
            </Tooltip>
            <Tooltip title="Low Risks">
              <Tag color="green" style={{ margin: 0, fontSize: '11px' }}>
                {stats.low}
              </Tag>
            </Tooltip>
          </div>
        )
      },
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Actions</Text>,
      key: 'actions',
      fixed: 'right',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="middle"
              icon={<EyeOutlined />}
              onClick={() => handleViewRegister(record)}
              style={{ color: token.colorPrimary }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="middle"
              icon={<EditOutlined />}
              onClick={() => handleEditRegister(record.name)}
              style={{ color: token.colorInfo }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Risk Register"
            description="Are you sure you want to delete this risk register?"
            onConfirm={() => handleDeleteRegister(record.name)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="middle"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Header - Following Projects pattern */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <FileProtectOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Risk Registers
              </Title>
              <Text type="secondary">Manage project risk registers and mitigation strategies</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchRiskRegisters}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateRegister}
                size="large"
              >
                New Risk Register
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: token.colorError, borderLeft: `4px solid ${token.colorError}` }}>
          <Text type="danger">{error}</Text>
          <Button type="primary" onClick={fetchRiskRegisters} style={{ marginLeft: '12px' }}>
            Retry
          </Button>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={12}>
            <Input
              placeholder="Search by project name..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              style={{ width: '100%' }}
              placeholder="Filter by status"
            />
          </Col>
        </Row>
      </Card>

      {/* Risk Registers Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : filteredRiskRegisters.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchText || filterStatus !== 'all' ? 'No risk registers match your filters' : 'No risk registers found'}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRegister}>
              Create Your First Risk Register
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <Table
            columns={tableColumns}
            dataSource={filteredRiskRegisters}
            rowKey={(record) => record.name}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => (
                <Text strong style={{ fontSize: '13px' }}>
                  {range[0]}-{range[1]} of {total} risk registers
                </Text>
              ),
              pageSizeOptions: ['10', '20', '50'],
              style: { padding: '16px 24px' }
            }}
            scroll={{ x: 1200 }}
            size="middle"
            bordered={false}
            rowClassName={(record, index) =>
              index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
            }
          />
          <style>
            {`
              .table-row-light {
                background-color: ${token.colorBgContainer};
              }
              .table-row-dark {
                background-color: ${token.colorBgLayout};
              }
              .table-row-light:hover,
              .table-row-dark:hover {
                background-color: ${token.colorPrimaryBg} !important;
              }
              .ant-table-thead > tr > th {
                background-color: ${token.colorBgContainer} !important;
                font-weight: 600 !important;
                padding: 16px !important;
                border-bottom: 2px solid ${token.colorBorder} !important;
              }
              .ant-table-tbody > tr > td {
                padding: 12px 16px !important;
                border-bottom: 1px solid ${token.colorBorderSecondary} !important;
              }
            `}
          </style>
        </Card>
      )}
    </div>
  )
}

export default RiskRegisters
