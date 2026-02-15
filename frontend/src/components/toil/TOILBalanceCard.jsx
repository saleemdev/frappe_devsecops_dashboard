import { Card, Statistic, Row, Col, Alert, Typography, Spin, theme, Tag } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'

const { Text } = Typography

/**
 * TOILBalanceCard Component
 * Displays TOIL balance with expiry warnings
 * Pattern: From approved plan - shows available balance before leave application
 */
function TOILBalanceCard({ balance, loading = false }) {
  const { token } = theme.useToken()

  if (loading) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading TOIL balance...</Text>
          </div>
        </div>
      </Card>
    )
  }

  if (!balance) {
    return (
      <Alert
        message="No Balance Data"
        description="Unable to load your TOIL balance. Please try again."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    )
  }

  const hasExpiringSoon = balance.expiring_soon && balance.expiring_soon.length > 0
  const expiringDays = hasExpiringSoon
    ? balance.expiring_soon.reduce((sum, item) => sum + (item.days || 0), 0)
    : 0

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockCircleOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
          <span>Your TOIL Balance</span>
        </div>
      }
      style={{
        marginBottom: 16,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Statistic
            title="Available Days"
            value={balance.available || 0}
            precision={1}
            valueStyle={{
              color: token.colorSuccess,
              fontSize: 32,
              fontWeight: 700
            }}
            prefix={<CheckCircleOutlined />}
            suffix="days"
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Total Allocated"
            value={balance.total_allocated || 0}
            precision={1}
            valueStyle={{
              color: token.colorTextSecondary,
              fontSize: 24
            }}
            suffix="days"
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Consumed"
            value={balance.consumed || 0}
            precision={1}
            valueStyle={{
              color: token.colorTextTertiary,
              fontSize: 24
            }}
            suffix="days"
          />
        </Col>
      </Row>

      {hasExpiringSoon && (
        <Alert
          message={
            <span>
              <WarningOutlined style={{ marginRight: 8 }} />
              {expiringDays.toFixed(1)} days expiring soon
            </span>
          }
          description={
            <div style={{ marginTop: 8 }}>
              {balance.expiring_soon.map((item, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  <Tag color="orange" style={{ marginRight: 8 }}>
                    {new Date(item.expiry_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Tag>
                  <Text>{item.days.toFixed(1)} days</Text>
                </div>
              ))}
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                Use these TOIL days before they expire
              </Text>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {balance.available === 0 && (
        <Alert
          message="No TOIL Balance"
          description="You do not have any TOIL days available to use for leave. Submit approved timesheets to accrue TOIL."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  )
}

export default TOILBalanceCard
