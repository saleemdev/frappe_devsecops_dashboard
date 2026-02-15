import { Button, Typography, theme } from 'antd'
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons'
import { getHeaderBannerStyle } from '../utils/themeUtils'

const { Title, Text } = Typography

/**
 * LeaveApplicationPage Component
 * Main page for viewing and managing TOIL leave applications
 * Pattern: Glassmorphic design matching Change Management Teams
 */
function LeaveApplicationPage({ navigateToRoute }) {
  const { token } = theme.useToken()

  const handleCreateLeaveApplication = () => {
    if (navigateToRoute) {
      navigateToRoute('toil-leave-new')
    }
  }

  return (
    <div>
      {/* Header Banner */}
      <div style={getHeaderBannerStyle(token)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: token.colorPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CalendarOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: token.colorText }}>
              TOIL Leave Applications
            </Title>
            <Text type="secondary">
              Request time off using your earned TOIL balance
            </Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateLeaveApplication}
        >
          Apply for Leave
        </Button>
      </div>

      {/* TODO: Create LeaveApplicationList component similar to TOILList */}
      <div style={{ padding: '24px 0' }}>
        <Text type="secondary">
          Leave application list coming soon. For now, please use the main TOIL list view.
        </Text>
      </div>
    </div>
  )
}

export default LeaveApplicationPage
