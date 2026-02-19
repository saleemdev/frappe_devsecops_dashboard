import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  PrinterOutlined,
  UserOutlined
} from '@ant-design/icons'

import useNavigationStore from '../stores/navigationStore'
import useToilStore from '../stores/toilStore'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'
import {
  getToilStatusColor,
  isReviewableTimesheet,
  normalizeToilStatus
} from '../utils/toilStatusUtils'

const { Title, Text } = Typography
const { Panel } = Collapse

const TOILDetail = ({ timesheetId }) => {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const [form] = Form.useForm()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const {
    selectedTimesheet,
    loading,
    userRole,
    submitting,
    initialize,
    fetchTimesheet,
    approveTimesheet,
    rejectTimesheet
  } = useToilStore()

  const { goToTOILList } = useNavigationStore()

  const glassCardStyle = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))',
    border: '1px solid rgba(255,255,255,0.45)',
    boxShadow: '0 10px 32px rgba(15, 23, 42, 0.12)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)'
  }

  const pageShellStyle = {
    padding: isMobile ? 12 : 20,
    borderRadius: isMobile ? 14 : 18,
    background: 'radial-gradient(circle at 8% 0%, rgba(56,189,248,0.22), rgba(110,231,183,0.12) 36%, rgba(255,255,255,0.08) 68%)'
  }

  useEffect(() => {
    let mounted = true

    const loadTimesheetData = async () => {
      if (!timesheetId) return
      try {
        setLoadError(null)
        await initialize()
        await fetchTimesheet(timesheetId)
      } catch (error) {
        if (!mounted) return
        const errorMsg = error?.message || 'Failed to load timesheet details'
        setLoadError(errorMsg)
        message.error(errorMsg)
      }
    }

    loadTimesheetData()

    return () => {
      mounted = false
    }
  }, [fetchTimesheet, initialize, timesheetId])

  const timesheet = useMemo(() => {
    if (!selectedTimesheet) return null
    return {
      ...selectedTimesheet,
      toil_status: normalizeToilStatus(selectedTimesheet),
      start_date: selectedTimesheet.start_date || selectedTimesheet.from_date,
      end_date: selectedTimesheet.end_date || selectedTimesheet.to_date
    }
  }, [selectedTimesheet])

  const handleEditTimesheet = () => {
    window.location.href = `/app/timesheet/${timesheetId}`
  }

  const handlePrintTimesheet = () => {
    try {
      const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Timesheet&name=${encodeURIComponent(timesheetId)}&format=Standard&no_letterhead=0`
      window.open(pdfUrl, '_blank')
      message.success('PDF download started')
    } catch (error) {
      message.error('Failed to download PDF')
    }
  }

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
          await fetchTimesheet(timesheetId)
          return
        }
        message.error(result.error || 'Failed to approve timesheet')
        return
      }

      const result = await rejectTimesheet(timesheetId, values.reason)
      if (result.success) {
        message.success(result.message || 'Timesheet rejected')
        setIsModalVisible(false)
        await fetchTimesheet(timesheetId)
        return
      }
      message.error(result.error || 'Failed to reject timesheet')
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error?.message || 'Failed to process approval action')
      }
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading timesheet details...</div>
      </div>
    )
  }

  if (!loading && !timesheet) {
    const errorDescription = loadError || 'Timesheet not found'
    return (
      <Card>
        <Empty description={errorDescription} image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Space direction="vertical" style={{ marginTop: 16 }}>
            <Text type="secondary">{errorDescription}</Text>
            <Button type="primary" onClick={goToTOILList}>
              Back to Timesheet List
            </Button>
          </Space>
        </Empty>
      </Card>
    )
  }

  const canReview = userRole === 'supervisor' && isReviewableTimesheet(timesheet)

  return (
    <div style={pageShellStyle}>
      <Card style={{ marginBottom: 16, ...getHeaderBannerStyle(token), ...glassCardStyle }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={16}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={goToTOILList} type="default" size={isMobile ? 'middle' : 'large'}>
                Back to Timesheet List
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ClockCircleOutlined
                  style={{
                    marginRight: 16,
                    color: getHeaderIconColor(token),
                    fontSize: '32px'
                  }}
                />
                Timesheet: {timesheet.name}
              </Title>
              <Space wrap size="small">
                <Tag color={getToilStatusColor(timesheet.toil_status)} style={{ fontSize: '14px', padding: '6px 12px' }}>
                  <strong>TOIL Status:</strong> {timesheet.toil_status || 'Not Applicable'}
                </Tag>
                <Tag color="blue" style={{ fontSize: '14px', padding: '6px 12px' }}>
                  <strong>TOIL Days:</strong> {Number(timesheet.toil_days || 0).toFixed(2)}
                </Tag>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <Space wrap>
              <Button icon={<PrinterOutlined />} onClick={handlePrintTimesheet}>
                Print
              </Button>
              <Button icon={<EditOutlined />} type="primary" onClick={handleEditTimesheet}>
                Edit
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>Timesheet Details</span>
          </Space>
        }
        style={{ marginBottom: 16, ...glassCardStyle }}
      >
        <Descriptions bordered column={isMobile ? 1 : 2}>
          <Descriptions.Item label={<Space size={8}><UserOutlined /><span>Employee</span></Space>}>
            {timesheet.employee_name || timesheet.employee || '-'}
          </Descriptions.Item>

          <Descriptions.Item label={<Space size={8}><CalendarOutlined /><span>Date Range</span></Space>}>
            {timesheet.start_date || '-'} to {timesheet.end_date || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Total Hours">
            {Number(timesheet.total_hours || 0).toFixed(2)} hours
          </Descriptions.Item>

          <Descriptions.Item label="Total TOIL Hours">
            <Text strong>{Number(timesheet.total_toil_hours || 0).toFixed(2)} hours</Text>
          </Descriptions.Item>

          <Descriptions.Item label="TOIL Days">
            <Tag color="blue" style={{ fontWeight: 600 }}>
              {Number(timesheet.toil_days || 0).toFixed(2)} days
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="TOIL Status">
            <Tag color={getToilStatusColor(timesheet.toil_status)}>{timesheet.toil_status || 'Not Applicable'}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Submitted By">
            {timesheet.owner || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Last Updated">
            {timesheet.modified || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Space>
            <CalendarOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>TOIL Calculation Breakdown</span>
          </Space>
        }
        style={{ marginBottom: 16, ...glassCardStyle }}
      >
        <Collapse defaultActiveKey={[]}>
          <Panel header="View Day-by-Day Breakdown" key="1">
            {timesheet.toil_calculation_details ? (
              <div
                style={{
                  backgroundColor: 'rgba(250,250,250,0.7)',
                  padding: '12px',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {timesheet.toil_calculation_details}
              </div>
            ) : (
              <Text type="secondary">No breakdown available</Text>
            )}
          </Panel>
        </Collapse>
      </Card>

      {timesheet.toil_allocation && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
              <span>Leave Allocation Info</span>
            </Space>
          }
          style={{ marginBottom: 16, ...glassCardStyle }}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Allocation ID">
              <a href={`/app/leave-allocation/${timesheet.toil_allocation}`} target="_blank" rel="noopener noreferrer">
                {timesheet.toil_allocation}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Validity">
              Valid for 6 months from approval date
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {canReview && (
        <Card style={glassCardStyle}>
          <Space size="large" wrap>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size={isMobile ? 'middle' : 'large'}
              onClick={() => {
                form.resetFields()
                setModalAction('approve')
                setIsModalVisible(true)
              }}
              loading={submitting}
            >
              Approve Timesheet
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              size={isMobile ? 'middle' : 'large'}
              onClick={() => {
                form.resetFields()
                setModalAction('reject')
                setIsModalVisible(true)
              }}
              loading={submitting}
            >
              Reject Timesheet
            </Button>
          </Space>
        </Card>
      )}

      <Modal
        title={modalAction === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={modalAction === 'approve' ? 'Approve' : 'Reject'}
        width={isMobile ? '94vw' : 640}
        okButtonProps={{
          loading: submitting,
          danger: modalAction === 'reject'
        }}
        cancelButtonProps={{ disabled: submitting }}
      >
        {timesheet && (
          <>
            {submitting ? (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="Submitting timesheet review..."
                description="Please wait while we process your approval action."
              />
            ) : null}

            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Employee">{timesheet.employee_name}</Descriptions.Item>
              <Descriptions.Item label="Period">{timesheet.start_date} - {timesheet.end_date}</Descriptions.Item>
              <Descriptions.Item label="TOIL Status">
                <Tag color={getToilStatusColor(timesheet.toil_status)}>{timesheet.toil_status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="TOIL Hours">{Number(timesheet.total_toil_hours || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="TOIL Days">{Number(timesheet.toil_days || 0).toFixed(2)}</Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              {modalAction === 'approve' ? (
                <Form.Item name="comment" label="Approval Comment (Optional)">
                  <Input.TextArea rows={3} placeholder="Add notes about this approval..." />
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
                  <Input.TextArea rows={3} placeholder="Explain why this timesheet is rejected..." />
                </Form.Item>
              )}
            </Form>
          </>
        )}
      </Modal>
    </div>
  )
}

export default TOILDetail
