import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Badge,
  Dropdown,
  Modal
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  ApiOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  MoreOutlined
} from '@ant-design/icons'
import { useSwaggerCollectionsStore, useNavigationStore } from '../stores/index.js'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

const SwaggerCollections = () => {
  const {
    swaggerCollections,
    loading,
    error,
    filters,
    pagination,
    fetchSwaggerCollections,
    deleteSwaggerCollection,
    exportSwaggerCollection,
    setFilters,
    setPagination,
    clearError
  } = useSwaggerCollectionsStore()

  const { navigateToRoute } = useNavigationStore()

  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [importModalVisible, setImportModalVisible] = useState(false)

  useEffect(() => {
    fetchSwaggerCollections()
  }, [fetchSwaggerCollections])

  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleSearch = (value) => {
    setFilters({ search: value })
    fetchSwaggerCollections({ search: value })
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { [key]: value }
    setFilters(newFilters)
    fetchSwaggerCollections(newFilters)
  }

  const handleTableChange = (paginationConfig, filtersConfig, sorter) => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize
    })
  }

  const handleView = (record) => {
    navigateToRoute('swagger-detail', null, record.id)
  }

  const handleEdit = (record) => {
    // Navigate to edit form (to be implemented)
    message.info('Edit functionality will be implemented')
  }

  const handleDelete = async (record) => {
    try {
      await deleteSwaggerCollection(record.id)
      message.success('Swagger collection deleted successfully')
    } catch (error) {
      message.error('Failed to delete swagger collection')
    }
  }

  const handleExport = async (record, format = 'json') => {
    try {
      const result = await exportSwaggerCollection(record.id, format)
      
      // Create download link
      const blob = new Blob([result.content], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success('Swagger collection exported successfully')
    } catch (error) {
      message.error('Failed to export swagger collection')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => deleteSwaggerCollection(id)))
      setSelectedRowKeys([])
      message.success('Selected swagger collections deleted successfully')
    } catch (error) {
      message.error('Failed to delete selected swagger collections')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'Development':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'Deprecated':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />
      default:
        return <WarningOutlined style={{ color: '#d9d9d9' }} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'green'
      case 'Development': return 'orange'
      case 'Deprecated': return 'red'
      default: return 'default'
    }
  }

  const getTestStatusColor = (testStatus) => {
    switch (testStatus) {
      case 'Passed': return 'green'
      case 'Failed': return 'red'
      case 'Warning': return 'orange'
      default: return 'default'
    }
  }

  const getActionMenuItems = (record) => [
    {
      key: 'view',
      label: 'View Details',
      icon: <EyeOutlined />,
      onClick: () => handleView(record)
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => handleEdit(record)
    },
    {
      type: 'divider'
    },
    {
      key: 'export-json',
      label: 'Export as JSON',
      icon: <DownloadOutlined />,
      onClick: () => handleExport(record, 'json')
    },
    {
      key: 'export-yaml',
      label: 'Export as YAML',
      icon: <DownloadOutlined />,
      onClick: () => handleExport(record, 'yaml')
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: 'Delete Swagger Collection',
          content: `Are you sure you want to delete "${record.name}"?`,
          okText: 'Delete',
          okType: 'danger',
          onOk: () => handleDelete(record)
        })
      }
    }
  ]

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            style={{ padding: 0, height: 'auto', fontWeight: 500 }}
            onClick={() => handleView(record)}
          >
            {text}
          </Button>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </Space>
      ),
      sorter: true
    },
    {
      title: 'Project',
      dataIndex: 'project',
      key: 'project',
      render: (project) => (
        <Tag color="blue">{project}</Tag>
      ),
      filters: [
        { text: 'ePrescription', value: 'ePrescription' },
        { text: 'Patient Portal', value: 'Patient Portal' },
        { text: 'Mobile Health App', value: 'Mobile Health App' },
        { text: 'Analytics Dashboard', value: 'Analytics Dashboard' },
        { text: 'Infrastructure', value: 'Infrastructure' }
      ]
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (version) => (
        <Tag color="purple">{version}</Tag>
      ),
      sorter: true
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Space>
          {getStatusIcon(status)}
          <Tag color={getStatusColor(status)}>{status}</Tag>
        </Space>
      ),
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Development', value: 'Development' },
        { text: 'Deprecated', value: 'Deprecated' }
      ]
    },
    {
      title: 'Test Status',
      dataIndex: 'testStatus',
      key: 'testStatus',
      render: (testStatus, record) => (
        <Tooltip title={`Last tested: ${record.lastTested}`}>
          <Tag color={getTestStatusColor(testStatus)}>{testStatus}</Tag>
        </Tooltip>
      )
    },
    {
      title: 'Endpoints',
      dataIndex: 'endpoints',
      key: 'endpoints',
      render: (endpoints) => (
        <Badge count={endpoints?.length || 0} showZero color="#1890ff" />
      )
    },
    {
      title: 'Updated',
      dataIndex: 'updatedDate',
      key: 'updatedDate',
      sorter: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{ items: getActionMenuItems(record) }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: record.status === 'Active' // Prevent deletion of active collections
    })
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <ApiOutlined /> Swagger Collections
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
              >
                Import
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => message.info('Create functionality will be implemented')}
              >
                New Collection
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={8} md={6}>
            <Search
              placeholder="Search collections..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="Active">Active</Option>
              <Option value="Development">Development</Option>
              <Option value="Deprecated">Deprecated</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Project"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('project', value)}
            >
              <Option value="ePrescription">ePrescription</Option>
              <Option value="Patient Portal">Patient Portal</Option>
              <Option value="Mobile Health App">Mobile Health App</Option>
              <Option value="Analytics Dashboard">Analytics Dashboard</Option>
              <Option value="Infrastructure">Infrastructure</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text>{selectedRowKeys.length} item(s) selected</Text>
            </Col>
            <Col>
              <Space>
                <Popconfirm
                  title="Delete selected collections?"
                  description="This action cannot be undone."
                  onConfirm={handleBulkDelete}
                  okText="Delete"
                  okType="danger"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Delete Selected
                  </Button>
                </Popconfirm>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={swaggerCollections}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} collections`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}

export default SwaggerCollections
