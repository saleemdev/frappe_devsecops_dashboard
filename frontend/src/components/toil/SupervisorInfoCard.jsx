import { Alert, Avatar, Typography, theme } from 'antd'
import { UserOutlined, TeamOutlined } from '@ant-design/icons'

const { Text } = Typography

/**
 * SupervisorInfoCard Component
 * Displays supervisor information prominently before timesheet/leave submission
 * Pattern: From approved plan - shows who will approve the request
 */
function SupervisorInfoCard({ supervisor, type = 'timesheet' }) {
  const { token } = theme.useToken()

  if (!supervisor) return null

  const message = type === 'timesheet'
    ? 'Your Timesheet Will Be Submitted To:'
    : 'Your Leave Application Will Be Submitted To:'

  return (
    <Alert
      message={message}
      description={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Avatar
            size={40}
            icon={<UserOutlined />}
            style={{
              backgroundColor: token.colorPrimary,
              boxShadow: '0 2px 8px rgba(22, 119, 255, 0.2)'
            }}
          />
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 16, display: 'block' }}>
              {supervisor.supervisor_name || supervisor.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {supervisor.supervisor_user || supervisor.email}
            </Text>
          </div>
        </div>
      }
      type="info"
      showIcon
      icon={<TeamOutlined style={{ fontSize: 20 }} />}
      style={{
        marginBottom: 16,
        borderRadius: 8,
        border: `1px solid ${token.colorInfoBorder}`,
        backgroundColor: token.colorInfoBg
      }}
    />
  )
}

export default SupervisorInfoCard
