import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Descriptions,
  message,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Divider,
  Collapse,
  Table,
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  PrinterOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import useToilStore from '../stores/toilStore'
import useNavigationStore from '../stores/navigationStore'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

const TOILDetail = ({ timesheetId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [modalAction, setModalAction] = useState(null) // 'approve' or 'reject'
  const [loadError, setLoadError] = useState(null)

  // Use store state
  const {
    selectedTimesheet,
    loading,
    userRole,
    submitting,
    fetchTimesheet,
    approveTimesheet,
    rejectTimesheet
  } = useToilStore()

  const { goToTOILList } = useNavigationStore()

  // Fetch timesheet on mount
  useEffect(() => {
    let isMounted = true  // Track component mount status

    const loadTimesheetData = async () => {
      if (!timesheetId) {
        console.warn('[TOILDetail] No timesheetId provided')
        return
      }

      try {
        console.log('[TOILDetail] Loading timesheet:', timesheetId)
        await fetchTimesheet(timesheetId)
      } catch (error) {
        console.error('[TOILDetail] Error loading timesheet:', error)

        // Only update state if component is still mounted
        if (isMounted) {
          const errorMsg = error?.message || 'Failed to load timesheet details'
          setLoadError(errorMsg)
          message.error(errorMsg)
        }
      }
    }

    loadTimesheetData()

    // Cleanup: mark component as unmounted
    return () => {
      isMounted = false
    }
  }, [timesheetId])

  // Get status color
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

  // Handle edit timesheet
  const handleEditTimesheet = () => {
    window.location.href = `/app/timesheet/${timesheetId}`
  }

  // Handle print timesheet
  const handlePrintTimesheet = () => {
    try {
      const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Timesheet&name=${encodeURIComponent(timesheetId)}&format=Standard&no_letterhead=0`
      window.open(pdfUrl, '_blank')
      message.success('PDF download started')
    } catch (error) {
      console.error('[TOILDetail] Error printing PDF:', error)
      message.error('Failed to download PDF')
    }
  }

  // Handle approve click
  const handleApproveClick = () => {
    form.resetFields()
    setModalAction('approve')
    setIsModalVisible(true)
  }

  // Handle reject click
  const handleRejectClick = () => {
    form.resetFields()
    setModalAction('reject')
    setIsModalVisible(true)
  }

  // Handle modal OK
  const handleModalOk = async () => {
    try {
      const values = modalAction === 'reject'
        ? await form.validateFields(['reason'])
        : await form.validateFields(['comment'])

      if (modalAction === 'approve') {
        const result = await approveTimesheet(timesheetId, values.comment)
        if (result.success) {
          message.success(result.message || 'Timesheet submitted. TOIL accrual is processing.')
          setIsModalVisible(false)
          // Refresh data
          await fetchTimesheet(timesheetId)
        } else {
          message.error(result.error || 'Failed to approve timesheet')
        }
      } else if (modalAction === 'reject') {
        const result = await rejectTimesheet(timesheetId, values.reason)
        if (result.success) {
          message.success(result.message || 'Timesheet rejected')
          setIsModalVisible(false)
          // Refresh data
          await fetchTimesheet(timesheetId)
        } else {
          message.error(result.error || 'Failed to reject timesheet')
        }
      }
    } catch (error) {
      console.error('[TOILDetail] Modal validation/submission error:', error)
      if (!error?.errorFields) {
        message.error(error?.message || 'Failed to process approval action')
      }
    }
  }

  // Handle back to list
  const handleBackToList = () => {
    console.log('[TOILDetail] Back to list button clicked')
    goToTOILList()
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading timesheet details...</div>
      </div>
    )
  }

  if (!loading && !selectedTimesheet) {
    const errorDescription = loadError || 'Timesheet not found'
    return (
      <Card>
        <Empty
          description={errorDescription}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Space direction="vertical" style={{ marginTop: '16px' }}>
            <Text type="secondary">{errorDescription}</Text>
            <Button type="primary" onClick={handleBackToList}>
              Back to Timesheet List
            </Button>
          </Space>
        </Empty>
      </Card>
    )
  }

  if (!selectedTimesheet) {
    return null
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
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToList}
                type="default"
                size="large"
              >
                Back to Timesheet List
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ClockCircleOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Timesheet: {selectedTimesheet.name}
              </Title>
              <Space wrap size="small">
                <Tag
                  color={getStatusColor(selectedTimesheet.toil_status)}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  <strong>Status:</strong> {selectedTimesheet.toil_status || 'Not Applicable'}
                </Tag>
                <Tag
                  color="blue"
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  <strong>TOIL Days:</strong> {Number(selectedTimesheet.toil_days || 0).toFixed(2)}
                </Tag>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right', marginTop: '16px' }}>
            <Space>
              <Button
                icon={<PrinterOutlined />}
                type="default"
                size="large"
                onClick={handlePrintTimesheet}
              >
                Print
              </Button>
              <Button
                icon={<EditOutlined />}
                type="primary"
                size="large"
                onClick={handleEditTimesheet}
              >
                Edit
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Details Card */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>Timesheet Details</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label={
            <Space size={8}>
              <UserOutlined />
              <span>Employee</span>
            </Space>
          }>
            {selectedTimesheet.employee_name || selectedTimesheet.employee || '-'}
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              <CalendarOutlined />
              <span>Date Range</span>
            </Space>
          }>
            {selectedTimesheet.from_date} to {selectedTimesheet.to_date}
          </Descriptions.Item>

          <Descriptions.Item label="Total Hours">
            {Number(selectedTimesheet.total_hours || 0).toFixed(2)} hours
          </Descriptions.Item>

          <Descriptions.Item label="Total TOIL Hours">
            <Text strong>{Number(selectedTimesheet.total_toil_hours || 0).toFixed(2)} hours</Text>
          </Descriptions.Item>

          <Descriptions.Item label="TOIL Days">
            <Tag color="blue" style={{ fontWeight: 600 }}>
              {Number(selectedTimesheet.toil_days || 0).toFixed(2)} days
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(selectedTimesheet.toil_status)}>
              {selectedTimesheet.toil_status || 'Not Applicable'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Submitted By">
            {selectedTimesheet.owner || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Approval Status">
            {selectedTimesheet.docstatus === 1 ? (
              <Tag color="green" icon={<CheckCircleOutlined />}>Approved</Tag>
            ) : (
              <Tag color="orange">Pending</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* TOIL Calculation Breakdown */}
      <Card
        title={
          <Space>
            <CalendarOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>TOIL Calculation Breakdown</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Collapse defaultActiveKey={[]}>
          <Panel header="View Day-by-Day Breakdown" key="1">
            {selectedTimesheet.toil_calculation_details ? (
              <div style={{
                backgroundColor: '#fafafa',
                padding: '12px',
                borderRadius: '4px',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedTimesheet.toil_calculation_details}
              </div>
            ) : (
              <Text type="secondary">No breakdown available</Text>
            )}
          </Panel>
        </Collapse>
      </Card>

      {/* Allocation Info */}
      {selectedTimesheet.toil_allocation && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
              <span>Leave Allocation Info</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Allocation ID">
              <a
                href={`/app/leave-allocation/${selectedTimesheet.toil_allocation}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selectedTimesheet.toil_allocation}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Validity">
              Valid for 6 months from approval date
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Approval Actions */}
      {userRole === 'supervisor' && selectedTimesheet.toil_status === 'Pending Accrual' && (
        <Card>
          <Space size="large">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="large"
              onClick={handleApproveClick}
              loading={submitting}
            >
              Approve Timesheet
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              size="large"
              onClick={handleRejectClick}
              loading={submitting}
            >
              Reject Timesheet
            </Button>
          </Space>
        </Card>
      )}

      {/* Approval/Reject Modal */}
      <Modal
        title={modalAction === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={modalAction === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={{
          loading: submitting,
          danger: modalAction === 'reject'
        }}
        cancelButtonProps={{ disabled: submitting }}
      >
        {selectedTimesheet && (
          <>
            {submitting ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #91caff',
                  backgroundColor: '#e6f4ff'
                }}
              >
                <Text style={{ color: '#0958d9' }}>
                  Submitting timesheet approval... Please wait.
                </Text>
              </div>
            ) : null}

            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Employee">
                {selectedTimesheet.employee_name}
              </Descriptions.Item>
              <Descriptions.Item label="Period">
                {selectedTimesheet.from_date} - {selectedTimesheet.to_date}
              </Descriptions.Item>
              <Descriptions.Item label="TOIL Hours">
                {Number(selectedTimesheet.total_toil_hours || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="TOIL Days">
                {Number(selectedTimesheet.toil_days || 0).toFixed(2)}
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              {modalAction === 'approve' ? (
                <Form.Item name="comment" label="Approval Comment (Optional)">
                  <Input.TextArea
                    rows={3}
                    placeholder="Add notes about this approval..."
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name="reason"
                  label="Rejection Reason (Required)"
                  rules={[
                    { required: true, message: 'Please provide a reason for rejection' },
                    { min: 10, message: 'Reason must be at least 10 characters' }
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Explain why this timesheet is rejected..."
                  />
                </Form.Item>
              )}
            </Form>

            {modalAction === 'approve' && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#e6f7ff',
                borderRadius: '4px',
                border: '1px solid #91d5ff'
              }}>
                <Text style={{ fontSize: '13px', color: '#0050b3' }}>
                  This will create a Leave Allocation of {Number(selectedTimesheet.toil_days || 0).toFixed(2)} days for {selectedTimesheet.employee_name}.
                </Text>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

export default TOILDetail
