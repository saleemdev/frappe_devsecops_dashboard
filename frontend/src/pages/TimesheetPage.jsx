import { Button, Typography, theme } from 'antd'
import { PlusOutlined, ClockCircleOutlined } from '@ant-design/icons'
import TOILList from '../components/TOILList'
import { getHeaderBannerStyle } from '../utils/themeUtils'

const { Title, Text } = Typography

/**
 * TimesheetPage Component
 * Main page for viewing and managing timesheets with TOIL
 * Pattern: Glassmorphic design matching Change Management Teams
 */
function TimesheetPage({ navigateToRoute }) {
  const { token } = theme.useToken()

  const handleCreateTimesheet = () => {
    if (navigateToRoute) {
      navigateToRoute('toil-timesheet-new')
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
            <ClockCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: token.colorText }}>
              Timesheets (TOIL)
            </Title>
            <Text type="secondary">
              Record overtime hours and track TOIL accrual
            </Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateTimesheet}
        >
          Record Timesheet
        </Button>
      </div>

      {/* Timesheet List */}
      <TOILList navigateToRoute={navigateToRoute} />
    </div>
  )
}

export default TimesheetPage
