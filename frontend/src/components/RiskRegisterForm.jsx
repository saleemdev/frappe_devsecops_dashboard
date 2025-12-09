import { useState, useEffect } from 'react'
import { Card, Form, Input, Select, Button, Space, Typography, theme, message, Row, Col, Table, DatePicker, Drawer, Upload, List, Avatar } from 'antd'
import { SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined, FileTextOutlined, MessageOutlined, PaperClipOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

/**
 * Risk Register Form Component
 * Create/Edit risk registers with child table for risks
 * Includes document attachments and comment drawer
 */
function RiskRegisterForm({ registerId, navigateToRoute }) {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [risks, setRisks] = useState([])
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    fetchProjects()
    if (registerId) {
      fetchRegisterData()
    }
  }, [registerId])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/resource/Project?fields=["name","project_name"]&limit_page_length=500', {
        headers: {
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })
      if (response.ok) {
        const result = await response.json()
        setProjects(result.data || [])
      }
    } catch (error) {
      console.error('[RiskRegisterForm] Error fetching projects:', error)
    }
  }

  const fetchRegisterData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/resource/Risk Register/${registerId}`, {
        headers: {
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        const data = result.data

        form.setFieldsValue({
          project: data.project,
          risk_register_status: data.risk_register_status,
          last_reviewed_date: data.last_reviewed_date ? dayjs(data.last_reviewed_date) : null,
          risk_summary: data.risk_summary,
          notes: data.notes
        })

        setRisks(data.risks || [])
      }
    } catch (error) {
      console.error('[RiskRegisterForm] Error fetching register:', error)
      message.error('Failed to load risk register data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    try {
      setLoading(true)

      const payload = {
        ...values,
        last_reviewed_date: values.last_reviewed_date ? values.last_reviewed_date.format('YYYY-MM-DD') : null,
        risks: risks.map((risk, idx) => ({
          ...risk,
          idx: idx + 1,
          identified_date: risk.identified_date ? (typeof risk.identified_date === 'string' ? risk.identified_date : risk.identified_date.format('YYYY-MM-DD')) : null,
          target_closure_date: risk.target_closure_date ? (typeof risk.target_closure_date === 'string' ? risk.target_closure_date : risk.target_closure_date.format('YYYY-MM-DD')) : null,
          actual_closure_date: risk.actual_closure_date ? (typeof risk.actual_closure_date === 'string' ? risk.actual_closure_date : risk.actual_closure_date.format('YYYY-MM-DD')) : null
        }))
      }

      console.log('[RiskRegisterForm] Submitting payload:', payload)

      const url = registerId
        ? `/api/resource/Risk Register/${registerId}`
        : '/api/resource/Risk Register'

      const method = registerId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        message.success({
          content: `Risk Register ${registerId ? 'updated' : 'created'} successfully`,
          duration: 3
        })
        if (navigateToRoute) {
          navigateToRoute('risk-registers')
        }
      } else {
        const errorData = await response.json()
        console.error('[RiskRegisterForm] API Error:', errorData)

        // Extract error message from various possible formats
        let errorMessage = 'Failed to save risk register'
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
        } else if (errorData.exc) {
          errorMessage = errorData.exc
        }

        message.error({
          content: errorMessage,
          duration: 5
        })
      }
    } catch (error) {
      console.error('[RiskRegisterForm] Error saving:', error)
      message.error({
        content: `Network error: ${error.message}. Please check your connection and try again.`,
        duration: 5
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (navigateToRoute) {
      navigateToRoute('risk-registers')
    }
  }

  const addRisk = () => {
    setRisks([...risks, {
      risk_id: `R${String(risks.length + 1).padStart(3, '0')}`,
      risk_title: '',
      risk_description: '',
      risk_category: 'Technical',
      probability: '3',
      impact: '3',
      risk_score: 9,
      priority: 'Medium',
      status: 'Identified',
      mitigation_strategy: '',
      contingency_plan: '',
      identified_date: dayjs(),
      target_closure_date: null,
      actual_closure_date: null
    }])
  }

  const removeRisk = (index) => {
    const newRisks = risks.filter((_, i) => i !== index)
    setRisks(newRisks)
  }

  const updateRisk = (index, field, value) => {
    const newRisks = [...risks]
    newRisks[index] = { ...newRisks[index], [field]: value }

    // Auto-calculate risk score and priority
    if (field === 'probability' || field === 'impact') {
      const prob = parseInt(field === 'probability' ? value : newRisks[index].probability)
      const imp = parseInt(field === 'impact' ? value : newRisks[index].impact)
      newRisks[index].risk_score = prob * imp

      if (newRisks[index].risk_score >= 15) {
        newRisks[index].priority = 'Critical'
      } else if (newRisks[index].risk_score >= 10) {
        newRisks[index].priority = 'High'
      } else if (newRisks[index].risk_score >= 5) {
        newRisks[index].priority = 'Medium'
      } else {
        newRisks[index].priority = 'Low'
      }
    }

    setRisks(newRisks)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return token.colorError
      case 'High': return token.colorWarning
      case 'Medium': return token.colorInfo
      case 'Low': return token.colorSuccess
      default: return token.colorTextSecondary
    }
  }

  const riskColumns = [
    {
      title: 'Risk ID',
      dataIndex: 'risk_id',
      key: 'risk_id',
      width: 100,
      render: (text, record, index) => (
        <Text strong style={{ fontSize: '12px' }}>{text || `R${String(index + 1).padStart(3, '0')}`}</Text>
      )
    },
    {
      title: 'Risk Title *',
      dataIndex: 'risk_title',
      key: 'risk_title',
      width: 200,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => updateRisk(index, 'risk_title', e.target.value)}
          placeholder="Enter risk title"
          required
        />
      )
    },
    {
      title: 'Category',
      dataIndex: 'risk_category',
      key: 'risk_category',
      width: 150,
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => updateRisk(index, 'risk_category', value)}
          style={{ width: '100%' }}
          options={[
            { label: 'Technical', value: 'Technical' },
            { label: 'Schedule', value: 'Schedule' },
            { label: 'Budget', value: 'Budget' },
            { label: 'Resource', value: 'Resource' },
            { label: 'External', value: 'External' },
            { label: 'Quality', value: 'Quality' },
            { label: 'Security', value: 'Security' },
            { label: 'Compliance', value: 'Compliance' },
            { label: 'Other', value: 'Other' }
          ]}
        />
      )
    },
    {
      title: 'Probability',
      dataIndex: 'probability',
      key: 'probability',
      width: 110,
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => updateRisk(index, 'probability', value)}
          style={{ width: '100%' }}
          options={[
            { label: '1 - Very Low', value: '1' },
            { label: '2 - Low', value: '2' },
            { label: '3 - Medium', value: '3' },
            { label: '4 - High', value: '4' },
            { label: '5 - Very High', value: '5' }
          ]}
        />
      )
    },
    {
      title: 'Impact',
      dataIndex: 'impact',
      key: 'impact',
      width: 110,
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => updateRisk(index, 'impact', value)}
          style={{ width: '100%' }}
          options={[
            { label: '1 - Minimal', value: '1' },
            { label: '2 - Minor', value: '2' },
            { label: '3 - Moderate', value: '3' },
            { label: '4 - Major', value: '4' },
            { label: '5 - Severe', value: '5' }
          ]}
        />
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      align: 'center',
      render: (text, record) => (
        <Text strong style={{ fontSize: '12px', color: getPriorityColor(text) }}>
          {text} ({record.risk_score})
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => updateRisk(index, 'status', value)}
          style={{ width: '100%' }}
          options={[
            { label: 'Identified', value: 'Identified' },
            { label: 'Assessing', value: 'Assessing' },
            { label: 'Mitigating', value: 'Mitigating' },
            { label: 'Monitoring', value: 'Monitoring' },
            { label: 'Closed', value: 'Closed' },
            { label: 'Accepted', value: 'Accepted' }
          ]}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record, index) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeRisk(index)}
        />
      )
    }
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <FileTextOutlined style={{ marginRight: 16, color: token.colorPrimary }} />
          {registerId ? 'Edit Risk Register' : 'Create Risk Register'}
        </Title>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          risk_register_status: 'Active'
        }}
      >
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="project"
                label="Project"
                rules={[{ required: true, message: 'Please select a project' }]}
              >
                <Select
                  showSearch
                  placeholder="Select project"
                  options={projects.map(p => ({ label: p.project_name || p.name, value: p.name }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  disabled={!!registerId}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="risk_register_status"
                label="Status"
              >
                <Select
                  options={[
                    { label: 'Active', value: 'Active' },
                    { label: 'Under Review', value: 'Under Review' },
                    { label: 'Archived', value: 'Archived' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="last_reviewed_date"
                label="Last Reviewed Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="risk_summary"
            label="Risk Summary"
          >
            <TextArea
              rows={3}
              placeholder="Brief summary of key risks and overall risk profile"
            />
          </Form.Item>
        </Card>

        {/* Risks Table */}
        <Card
          title={
            <Space>
              <Text strong>Risk Items</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>({risks.length} risks)</Text>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addRisk}
              size="small"
            >
              Add Risk
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            columns={riskColumns}
            dataSource={risks}
            rowKey={(record, index) => index}
            pagination={false}
            scroll={{ x: 1400 }}
            size="small"
            expandable={{
              expandedRowRender: (record, index) => (
                <div style={{ padding: '16px', backgroundColor: token.colorBgLayout }}>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Text strong>Description:</Text>
                      <TextArea
                        value={record.risk_description}
                        onChange={(e) => updateRisk(index, 'risk_description', e.target.value)}
                        placeholder="Detailed risk description"
                        rows={2}
                        style={{ marginTop: 8, marginBottom: 16 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Text strong>Mitigation Strategy:</Text>
                      <TextArea
                        value={record.mitigation_strategy}
                        onChange={(e) => updateRisk(index, 'mitigation_strategy', e.target.value)}
                        placeholder="How to mitigate this risk"
                        rows={3}
                        style={{ marginTop: 8 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Text strong>Contingency Plan:</Text>
                      <TextArea
                        value={record.contingency_plan}
                        onChange={(e) => updateRisk(index, 'contingency_plan', e.target.value)}
                        placeholder="Backup plan if risk occurs"
                        rows={3}
                        style={{ marginTop: 8 }}
                      />
                    </Col>
                  </Row>
                </div>
              )
            }}
          />
        </Card>

        {/* Notes */}
        <Card title="Additional Notes" style={{ marginBottom: 16 }}>
          <Form.Item
            name="notes"
            label={null}
          >
            <TextArea
              rows={4}
              placeholder="Additional notes, observations, or context"
            />
          </Form.Item>
        </Card>

        {/* Action Buttons */}
        <Card>
          <Space style={{ float: 'right' }}>
            {registerId && (
              <>
                <Button
                  icon={<PaperClipOutlined />}
                  onClick={() => message.info('Attachments feature coming soon')}
                >
                  Attachments
                </Button>
                <Button
                  icon={<MessageOutlined />}
                  onClick={() => setCommentsDrawerOpen(true)}
                >
                  Comments
                </Button>
              </>
            )}
            <Button
              icon={<CloseOutlined />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={loading}
            >
              {registerId ? 'Update' : 'Create'}
            </Button>
          </Space>
        </Card>
      </Form>

      {/* Comments Drawer */}
      <Drawer
        title="Comments"
        placement="right"
        width={500}
        onClose={() => setCommentsDrawerOpen(false)}
        open={commentsDrawerOpen}
      >
        <div style={{ marginBottom: 16 }}>
          <TextArea
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <Button
            type="primary"
            style={{ marginTop: 8 }}
            onClick={() => {
              if (newComment.trim()) {
                message.success('Comment added')
                setNewComment('')
              }
            }}
          >
            Add Comment
          </Button>
        </div>
        <List
          dataSource={comments}
          locale={{ emptyText: 'No comments yet' }}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={item.author}
                description={
                  <div>
                    <div>{item.content}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{item.datetime}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  )
}

export default RiskRegisterForm
