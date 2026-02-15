import { Alert, Typography, Space, Button } from 'antd'
import { WarningOutlined, ContactsOutlined } from '@ant-design/icons'

const { Text, Paragraph } = Typography

/**
 * ConfigurationWarning Component
 * Displays blocking warning when employee setup is incomplete (no supervisor)
 * Pattern: From approved plan - prevents actions until configuration is fixed
 */
function ConfigurationWarning({ setupData, onContactHR }) {
  if (!setupData || setupData.valid) return null

  const issues = setupData.issues || ['Your supervisor is not configured. Please contact HR.']

  return (
    <Alert
      message="Configuration Required"
      description={
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Paragraph style={{ marginBottom: 8, marginTop: 8 }}>
            You cannot submit timesheets or leave applications until the following issues are resolved:
          </Paragraph>
          <ul style={{ paddingLeft: 20, marginBottom: 8 }}>
            {issues.map((issue, index) => (
              <li key={index}>
                <Text>{issue}</Text>
              </li>
            ))}
          </ul>
          <Paragraph style={{ marginBottom: 8 }}>
            Please contact your HR department to configure your employee record properly.
          </Paragraph>
          {onContactHR && (
            <Button
              type="primary"
              icon={<ContactsOutlined />}
              onClick={onContactHR}
              style={{ marginTop: 8 }}
            >
              Contact HR
            </Button>
          )}
        </Space>
      }
      type="error"
      showIcon
      icon={<WarningOutlined style={{ fontSize: 20 }} />}
      style={{
        marginBottom: 16,
        borderRadius: 8
      }}
      closable={false}
    />
  )
}

export default ConfigurationWarning
