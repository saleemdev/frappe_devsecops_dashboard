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
    Divider,
    theme
} from 'antd'
import {
    ArrowLeftOutlined,
    SaveOutlined,
    SafetyCertificateOutlined,
    KeyOutlined,
    LinkOutlined,
    UserOutlined,
    LockOutlined,
    FileTextOutlined,
    TagsOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    GlobalOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const PasswordVaultForm = ({ mode = 'create', entryId = null, navigateToRoute }) => {
  const { token } = theme.useToken()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [entry, setEntry] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState('Login')

    // Load entry data if editing
    useEffect(() => {
        if (mode === 'edit' && entryId) {
            loadEntry()
        } else if (mode === 'create') {
            // Initialize form for create mode
            form.setFieldsValue({
                category: 'Login',
                is_active: true
            })
        }
    }, [mode, entryId, form])

    const loadEntry = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entry?name=${entryId}`, {
                headers: {
                    'X-Frappe-CSRF-Token': window.csrf_token || ''
                }
            })

            if (!response.ok) throw new Error('Failed to load entry')

            const result = await response.json()
            const data = result.message || result.data || result

            if (data) {
                setEntry(data)
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

            const endpoint = mode === 'create'
                ? '/api/method/frappe_devsecops_dashboard.api.password_vault.create_vault_entry'
                : '/api/method/frappe_devsecops_dashboard.api.password_vault.update_vault_entry'

            const payload = mode === 'create'
                ? { data: formData }
                : { name: entryId, data: formData }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': window.csrf_token || ''
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            const data = result.message || result.data || result

            if (data && (data.success || data.message)) {
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
                throw new Error(data?.error || 'Unknown error occurred')
            }
        } catch (error) {
            console.error('[PasswordVaultForm] Error saving password:', error)
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

            <Card
                bordered={false}
                style={{
                    background: `linear-gradient(135deg, ${token.colorBgLayout}80 0%, ${token.colorBgLayout} 100%)`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    style={{ maxWidth: '100%' }}
                >
                    <Row gutter={[24, 24]}>
                        {/* Left Column - Credentials */}
                        <Col xs={24} md={12}>
                            <Card
                                bordered={false}
                                style={{
                                    height: '100%',
                                    border: `1px solid ${token.colorBorder}`,
                                    background: token.colorBgContainer,
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                            >
                                {/* Section Header */}
                                <div style={{
                                    marginBottom: '24px',
                                    paddingBottom: '16px',
                                    borderBottom: `2px solid ${token.colorPrimary}20`
                                }}>
                                    <Space size={8}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: `${token.colorPrimary}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <LockOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />
                                        </div>
                                        <div>
                                            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Credentials</Title>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>Core authentication details</Text>
                                        </div>
                                    </Space>
                                </div>

                                <Form.Item
                                    label={<Text strong style={{ fontSize: '13px' }}>Title <span style={{ color: token.colorError }}>*</span></Text>}
                                    name="title"
                                    rules={[{ required: true, message: 'Please enter a title' }]}
                                    style={{ marginBottom: '16px' }}
                                >
                                    <Input
                                        placeholder="e.g., Gmail Account"
                                        prefix={<KeyOutlined style={{ color: token.colorTextSecondary }} />}
                                        size="large"
                                        style={{ borderRadius: '8px' }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={<Text strong style={{ fontSize: '13px' }}>Username / Email</Text>}
                                    name="username"
                                    style={{ marginBottom: '16px' }}
                                >
                                    <Input
                                        placeholder="e.g., user@example.com"
                                        prefix={<UserOutlined style={{ color: token.colorTextSecondary }} />}
                                        size="large"
                                        style={{ borderRadius: '8px' }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={<Text strong style={{ fontSize: '13px' }}>Password <span style={{ color: token.colorError }}>*</span></Text>}
                                    name="password"
                                    rules={[{ required: true, message: 'Please enter a password' }]}
                                    style={{ marginBottom: '16px' }}
                                >
                                    <Input.Password
                                        placeholder="Enter password"
                                        size="large"
                                        style={{ borderRadius: '8px' }}
                                    />
                                </Form.Item>

                                <Divider style={{ margin: '20px 0' }} />

                                <Row gutter={16}>
                                    <Col span={16}>
                                        <Form.Item
                                            label={<Text strong style={{ fontSize: '13px' }}>URL</Text>}
                                            name="url"
                                            style={{ marginBottom: '16px' }}
                                        >
                                            <Input
                                                placeholder="e.g., https://gmail.com"
                                                prefix={<GlobalOutlined style={{ color: token.colorTextSecondary }} />}
                                                size="large"
                                                style={{ borderRadius: '8px' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label={<Text strong style={{ fontSize: '13px' }}>Port</Text>}
                                            name="port"
                                            style={{ marginBottom: '16px' }}
                                        >
                                            <InputNumber
                                                placeholder="3306"
                                                min={1}
                                                max={65535}
                                                size="large"
                                                style={{ width: '100%', borderRadius: '8px' }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        {/* Right Column - Additional Information */}
                        <Col xs={24} md={12}>
                            <Card
                                bordered={false}
                                style={{
                                    height: '100%',
                                    border: `1px solid ${token.colorBorder}`,
                                    background: token.colorBgContainer,
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                            >
                                {/* Section Header */}
                                <div style={{
                                    marginBottom: '24px',
                                    paddingBottom: '16px',
                                    borderBottom: `2px solid ${token.colorSuccess}20`
                                }}>
                                    <Space size={8}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: `${token.colorSuccess}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <FileTextOutlined style={{ fontSize: '20px', color: token.colorSuccess }} />
                                        </div>
                                        <div>
                                            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Additional Info</Title>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>Metadata and configuration</Text>
                                        </div>
                                    </Space>
                                </div>

                                <Form.Item
                                    label={<Text strong style={{ fontSize: '13px' }}>Category <span style={{ color: token.colorError }}>*</span></Text>}
                                    name="category"
                                    rules={[{ required: true, message: 'Please select a category' }]}
                                    style={{ marginBottom: '16px' }}
                                >
                                    <Select
                                        size="large"
                                        style={{ borderRadius: '8px' }}
                                        onChange={(value) => setSelectedCategory(value)}
                                        options={[
                                            { label: '🔐 Login', value: 'Login' },
                                            { label: '🔑 API Key', value: 'API Key' },
                                            { label: '🗄️ Database', value: 'Database' },
                                            { label: '🔓 SSH Key', value: 'SSH Key' },
                                            { label: '📜 Certificate', value: 'Certificate' },
                                            { label: '🔐 RSA Public Key', value: 'RSA Public Key' },
                                            { label: '📁 Other', value: 'Other' }
                                        ]}
                                    />
                                </Form.Item>

                                {selectedCategory === 'RSA Public Key' && (
                                    <>
                                        <Form.Item
                                            label={<Text strong style={{ fontSize: '13px' }}>RSA Public Key <span style={{ color: token.colorError }}>*</span></Text>}
                                            name="password"
                                            rules={[{ required: true, message: 'Please paste the RSA public key' }]}
                                            style={{ marginBottom: '16px' }}
                                        >
                                            <Input.TextArea
                                                rows={8}
                                                placeholder="Paste your RSA public key here (PEM format)&#10;-----BEGIN PUBLIC KEY-----&#10;MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...&#10;-----END PUBLIC KEY-----"
                                                style={{ borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            label={<Text strong style={{ fontSize: '13px' }}>Key Fingerprint (optional)</Text>}
                                            name="username"
                                            style={{ marginBottom: '16px' }}
                                            tooltip="SHA256 fingerprint or key ID for identification"
                                        >
                                            <Input
                                                placeholder="e.g., SHA256:abcd1234efgh5678..."
                                                prefix={<KeyOutlined style={{ color: token.colorTextSecondary }} />}
                                                size="large"
                                                style={{ borderRadius: '8px' }}
                                            />
                                        </Form.Item>
                                    </>
                                )}

                                {selectedCategory !== 'RSA Public Key' && (
                                    <Form.Item
                                        label={<Text strong style={{ fontSize: '13px' }}>Associated Project</Text>}
                                        name="project"
                                        style={{ marginBottom: '16px' }}
                                    >
                                        <Input
                                            placeholder="Project name (optional)"
                                            prefix={<GlobalOutlined style={{ color: token.colorTextSecondary }} />}
                                            size="large"
                                            style={{ borderRadius: '8px' }}
                                        />
                                    </Form.Item>
                                )}

                                <Form.Item
                                    label={<Text strong style={{ fontSize: '13px' }}>Tags</Text>}
                                    name="tags"
                                    style={{ marginBottom: '16px' }}
                                >
                                    <Input
                                        placeholder="Comma-separated tags"
                                        prefix={<TagsOutlined style={{ color: token.colorTextSecondary }} />}
                                        size="large"
                                        style={{ borderRadius: '8px' }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={<Text strong style={{ fontSize: '13px' }}>Expiry Date</Text>}
                                    name="expiry_date"
                                    style={{ marginBottom: '16px' }}
                                >
                                    <DatePicker
                                        style={{ width: '100%', borderRadius: '8px' }}
                                        size="large"
                                        placeholder="Select expiry date"
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={<Text strong style={{ fontSize: '13px' }}>Status</Text>}
                                    name="is_active"
                                    valuePropName="checked"
                                    style={{ marginBottom: '0px' }}
                                >
                                    <Checkbox style={{ fontSize: '13px' }}>
                                        <Space size={4} style={{ marginLeft: '4px' }}>
                                            <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                                            <span>This password is active</span>
                                        </Space>
                                    </Checkbox>
                                </Form.Item>
                            </Card>
                        </Col>
                    </Row>

                    {/* Notes Section */}
                    <Card
                        bordered={false}
                        style={{
                            marginTop: '24px',
                            border: `1px solid ${token.colorBorder}`,
                            background: token.colorBgContainer,
                            borderRadius: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    >
                        {/* Section Header */}
                        <div style={{
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: `2px solid ${token.colorWarning}20`
                        }}>
                            <Space size={8}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: `${token.colorWarning}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FileTextOutlined style={{ fontSize: '18px', color: token.colorWarning }} />
                                </div>
                                <div>
                                    <Text strong style={{ fontSize: '13px' }}>Additional Notes</Text>
                                </div>
                            </Space>
                        </div>

                        <Form.Item
                            name="notes"
                            style={{ marginBottom: '0px' }}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="Add any additional notes or comments about this credential..."
                                style={{ borderRadius: '8px', resize: 'vertical' }}
                                size="large"
                            />
                        </Form.Item>
                    </Card>

                    {/* Form Actions */}
                    <Form.Item style={{ marginTop: '32px', marginBottom: '0px' }}>
                        <Card
                            bordered={false}
                            style={{
                                background: `${token.colorPrimary}05`,
                                border: `1px dashed ${token.colorPrimary}30`,
                                borderRadius: '12px',
                                padding: '20px'
                            }}
                        >
                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Space direction="vertical" size="small">
                                        <Text strong style={{ fontSize: '13px' }}>Form Status</Text>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {mode === 'create' ? 'Create a new password entry' : `Editing: ${entry?.title || 'Password Entry'}`}
                                        </Text>
                                    </Space>
                                </Col>
                                <Col>
                                    <Space size={12}>
                                        <Button
                                            onClick={() => navigateToRoute('password-vault')}
                                            size="large"
                                            style={{
                                                borderRadius: '8px',
                                                height: '40px',
                                                minWidth: '120px'
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<SaveOutlined />}
                                            htmlType="submit"
                                            loading={submitting}
                                            size="large"
                                            style={{
                                                borderRadius: '8px',
                                                height: '40px',
                                                minWidth: '160px',
                                                fontWeight: 600,
                                                boxShadow: `0 4px 12px ${token.colorPrimary}40`
                                            }}
                                        >
                                            {mode === 'create' ? 'Create Entry' : 'Update Entry'}
                                        </Button>
                                    </Space>
                                </Col>
                            </Row>
                        </Card>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}

export default PasswordVaultForm
