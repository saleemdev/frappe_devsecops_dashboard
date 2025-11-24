import React, { useState, useEffect } from 'react'
import {
    Form,
    Input,
    Button,
    Select,
    Row,
    Col,
    Card,
    Space,
    message,
    DatePicker,
    Spin,
    Typography,
    Checkbox,
    InputNumber,
    Divider
,
  theme
} from 'antd'
import {
    ArrowLeftOutlined,
    SaveOutlined,
    SafetyCertificateOutlined,
    KeyOutlined,
    LinkOutlined,
    UserOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import { createApiClient } from '../services/api/config'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const PasswordVaultForm = ({ mode = 'create', entryId = null, navigateToRoute }) => {
  const { token } = theme.useToken()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [entry, setEntry] = useState(null)
    const [apiClient, setApiClient] = useState(null)

    // Initialize API client
    useEffect(() => {
        const initClient = async () => {
            const client = await createApiClient()
            setApiClient(client)
        }
        initClient()
    }, [])

    // Load entry data if editing
    useEffect(() => {
        if (apiClient && mode === 'edit' && entryId) {
            loadEntry()
        } else if (mode === 'create') {
            // Initialize form for create mode
            form.setFieldsValue({
                category: 'Login',
                is_active: true
            })
        }
    }, [apiClient, mode, entryId])

    const loadEntry = async () => {
        if (!apiClient) return
        setLoading(true)
        try {
            const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entry', {
                params: { name: entryId }
            })

            const data = response.data.data || response.data

            if (data) {
                setEntry(data)

                // Format dates for form
                const formData = {
                    ...data,
                    expiry_date: data.expiry_date ? dayjs(data.expiry_date) : null,
                    is_active: data.is_active === 1 || data.is_active === true
                }

                form.setFieldsValue(formData)
            } else {
                message.error('Failed to load password entry details')
            }
        } catch (error) {
            message.error('Failed to load password entry')
            console.error('Error loading entry:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (values) => {
        if (!apiClient) return
        setSubmitting(true)
        try {
            const formData = {
                title: values.title,
                username: values.username || '',
                password: values.password,
                url: values.url || '',
                port: values.port || null,
                category: values.category || 'Login',
                project: values.project || '',
                notes: values.notes || '',
                tags: values.tags || '',
                expiry_date: values.expiry_date ? values.expiry_date.format('YYYY-MM-DD') : null,
                is_active: values.is_active ? 1 : 0
            }

            let response
            if (mode === 'create') {
                response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_vault.create_vault_entry', {
                    data: formData
                })
            } else {
                response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_vault.update_vault_entry', {
                    name: entryId,
                    data: formData
                })
            }

            if (response.data && (response.data.success || response.data.message)) {
                // Show success modal
                await Swal.fire({
                    icon: 'success',
                    title: mode === 'create' ? 'Password Created!' : 'Password Updated!',
                    text: `Password entry has been ${mode === 'create' ? 'created' : 'updated'} successfully.`,
                    confirmButtonText: 'Back to Vault',
                    confirmButtonColor: '#1890ff'
                })

                // Navigate back to list
                navigateToRoute('password-vault')
            } else {
                throw new Error(response.data?.error || 'Unknown error occurred')
            }
        } catch (error) {
            console.error('Error saving password:', error)
            Swal.fire({
                icon: 'error',
                title: 'Operation Failed',
                text: error.message || 'Failed to save password entry',
                confirmButtonColor: '#ff4d4f'
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }} />
    }

    return (
        <div>
            {/* Header */}
            <Card style={{
                marginBottom: 16,
                ...getHeaderBannerStyle(token)
            }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space direction="vertical" size="small">
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigateToRoute('password-vault')}
                                style={{ paddingLeft: 0 }}
                            >
                                Back to Vault
                            </Button>
                            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                                <SafetyCertificateOutlined style={{
                                    marginRight: 16,
                                    color: getHeaderIconColor(token),
                                    fontSize: '32px'
                                }} />
                                {mode === 'create' ? 'Add Password Entry' : `Edit: ${entry?.title || 'Password Entry'}`}
                            </Title>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Card bordered={false}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Row gutter={[24, 24]}>
                        {/* Left Column */}
                        <Col xs={24} md={12}>
                            <Card title="Credentials" size="small" style={{ height: '100%' }}>
                                <Form.Item
                                    label="Title"
                                    name="title"
                                    rules={[{ required: true, message: 'Please enter a title' }]}
                                >
                                    <Input placeholder="e.g., Gmail Account" prefix={<KeyOutlined />} />
                                </Form.Item>

                                <Form.Item
                                    label="Username / Email"
                                    name="username"
                                >
                                    <Input placeholder="e.g., user@example.com" prefix={<UserOutlined />} />
                                </Form.Item>

                                <Form.Item
                                    label="Password"
                                    name="password"
                                    rules={[{ required: true, message: 'Please enter a password' }]}
                                >
                                    <Input.Password placeholder="Enter password" />
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={16}>
                                        <Form.Item
                                            label="URL"
                                            name="url"
                                        >
                                            <Input placeholder="e.g., https://gmail.com" prefix={<LinkOutlined />} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label="Port"
                                            name="port"
                                        >
                                            <InputNumber placeholder="e.g., 3306" min={1} max={65535} style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        {/* Right Column */}
                        <Col xs={24} md={12}>
                            <Card title="Additional Information" size="small" style={{ height: '100%' }}>
                                <Form.Item
                                    label="Category"
                                    name="category"
                                    rules={[{ required: true, message: 'Please select a category' }]}
                                >
                                    <Select
                                        options={[
                                            { label: 'Login', value: 'Login' },
                                            { label: 'API Key', value: 'API Key' },
                                            { label: 'Database', value: 'Database' },
                                            { label: 'SSH Key', value: 'SSH Key' },
                                            { label: 'Certificate', value: 'Certificate' },
                                            { label: 'Other', value: 'Other' }
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Associated Project"
                                    name="project"
                                >
                                    <Input placeholder="Project name (optional)" />
                                </Form.Item>

                                <Form.Item
                                    label="Tags"
                                    name="tags"
                                >
                                    <Input placeholder="Comma-separated tags" />
                                </Form.Item>

                                <Form.Item
                                    label="Expiry Date"
                                    name="expiry_date"
                                >
                                    <DatePicker style={{ width: '100%' }} />
                                </Form.Item>

                                <Form.Item
                                    label="Status"
                                    name="is_active"
                                    valuePropName="checked"
                                >
                                    <Checkbox>Active</Checkbox>
                                </Form.Item>
                            </Card>
                        </Col>
                    </Row>

                    {/* Notes Section */}
                    <Card title="Notes" size="small" style={{ marginTop: '24px' }}>
                        <Form.Item
                            name="notes"
                        >
                            <Input.TextArea rows={4} placeholder="Additional notes or comments..." />
                        </Form.Item>
                    </Card>

                    {/* Form Actions */}
                    <Form.Item style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <Button onClick={() => navigateToRoute('password-vault')} size="large">
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                htmlType="submit"
                                loading={submitting}
                                size="large"
                            >
                                {mode === 'create' ? 'Create Entry' : 'Update Entry'}
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}

export default PasswordVaultForm
