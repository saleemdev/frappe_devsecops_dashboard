/**
 * TOIL Summary Card Component
 * Large balance display with progress bar and expiry warnings
 * Designed for dashboard or dedicated balance view
 */

import React from 'react'
import { Card, Progress, Alert, Button, Statistic, Space, Typography, Row, Col } from 'antd'
import { ClockCircleOutlined, WarningOutlined, CalendarOutlined } from '@ant-design/icons'
import { useQuery } from 'react-query'
import dayjs from 'dayjs'
import api from '../services/api'

const { Title, Text } = Typography

/**
 * TOILSummaryCard Component
 * Displays current TOIL balance with visual progress indicator
 *
 * @param {string} employee - Employee ID (optional, defaults to current user)
 * @param {Function} onViewRecords - Callback to navigate to TOIL records list
 */
const TOILSummaryCard = ({ employee, onViewRecords }) => {
  // Fetch TOIL balance data
  const { data, isLoading, error } = useQuery(
    ['toil-balance', employee],
    async () => {
      const response = await api.toil.getTOILBalance(employee)
      return response.data
    },
    {
      staleTime: 60000, // Cache for 1 minute
      cacheTime: 300000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: true,
      retry: 2
    }
  )

  // Extract data with defaults
  const balance = data?.balance || 0
  const totalAccrued = data?.total_accrued || 0
  const totalConsumed = data?.total_consumed || 0
  const expiringSoon = data?.expiring_soon || []
  const expiringBalance = expiringSoon.reduce((sum, alloc) => sum + (alloc.balance || 0), 0)

  // Calculate progress percentage (balance out of total accrued)
  const progressPercent = totalAccrued > 0 ? (balance / totalAccrued) * 100 : 0

  // Determine progress color based on balance
  const getProgressColor = () => {
    if (balance === 0) return '#d9d9d9'
    if (balance < 1) return '#ff7a45'
    if (balance < 3) return '#ffc53d'
    return '#52c41a'
  }

  return (
    <Card
      loading={isLoading}
      style={{
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      bodyStyle={{
        padding: '24px'
      }}
    >
      {/* Error State */}
      {error && (
        <Alert
          message="Error Loading Balance"
          description={error.message || 'Failed to load TOIL balance. Please try again.'}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Header Section */}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <ClockCircleOutlined
            style={{
              fontSize: '48px',
              color: getProgressColor(),
              marginBottom: '16px'
            }}
          />
          <Title level={2} style={{ margin: 0 }}>
            {balance.toFixed(2)} days
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            Current TOIL Balance
          </Text>
        </div>

        {/* Progress Bar */}
        <Progress
          percent={progressPercent}
          strokeColor={getProgressColor()}
          format={(percent) => `${percent.toFixed(0)}%`}
          strokeWidth={12}
        />

        {/* Balance Breakdown */}
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Total Accrued"
              value={totalAccrued}
              precision={2}
              suffix="days"
              valueStyle={{ fontSize: '18px' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Total Used"
              value={totalConsumed}
              precision={2}
              suffix="days"
              valueStyle={{ fontSize: '18px' }}
            />
          </Col>
        </Row>

        {/* Expiring Soon Warning */}
        {expiringSoon.length > 0 && expiringBalance > 0 && (
          <Alert
            message="TOIL Expiring Soon"
            description={
              <Space direction="vertical" size={4}>
                <Text>
                  {expiringBalance.toFixed(2)} days expiring within 30 days
                </Text>
                {expiringSoon.slice(0, 3).map((alloc, idx) => (
                  <Text key={idx} type="secondary" style={{ fontSize: '12px' }}>
                    <CalendarOutlined /> {alloc.balance.toFixed(2)} days expires on{' '}
                    {dayjs(alloc.to_date).format('MMM DD, YYYY')}{' '}
                    ({dayjs(alloc.to_date).diff(dayjs(), 'days')} days left)
                  </Text>
                ))}
              </Space>
            }
            type="warning"
            icon={<WarningOutlined />}
            showIcon
          />
        )}

        {/* No Balance Message */}
        {balance === 0 && totalAccrued === 0 && (
          <Alert
            message="No TOIL Balance"
            description="You currently have no TOIL accrued. Submit timesheets with non-billable overtime hours to start earning TOIL."
            type="info"
            showIcon
          />
        )}

        {/* Balance Available After Expiry */}
        {expiringBalance > 0 && balance > expiringBalance && (
          <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
            <Text type="secondary">
              {(balance - expiringBalance).toFixed(2)} days available after expiry
            </Text>
          </div>
        )}

        {/* Action Button */}
        {onViewRecords && (
          <Button
            type="primary"
            size="large"
            block
            onClick={onViewRecords}
            icon={<CalendarOutlined />}
          >
            View My TOIL Records
          </Button>
        )}
      </Space>
    </Card>
  )
}

export default TOILSummaryCard
