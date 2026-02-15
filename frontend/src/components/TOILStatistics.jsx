/**
 * TOIL Statistics Component
 * Dashboard widget displaying TOIL balance, accrued, and used statistics
 * Uses React Query for data fetching with caching
 */

import React from 'react'
import { Card, Row, Col, Statistic, Alert, Spin } from 'antd'
import { ClockCircleOutlined, PlusOutlined, MinusOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery } from 'react-query'
import api from '../services/api'

/**
 * TOILStatistics Component
 * Displays TOIL summary statistics with expiry warnings
 *
 * @param {string} employee - Employee ID (optional, defaults to current user)
 * @param {boolean} showExpiry - Whether to show expiry warnings (default: true)
 */
const TOILStatistics = ({ employee, showExpiry = true }) => {
  // Fetch TOIL summary data with React Query
  const { data, isLoading, error } = useQuery(
    ['toil-summary', employee],
    async () => {
      const response = await api.toil.getTOILSummary(employee)
      return response.data
    },
    {
      staleTime: 60000, // Cache for 1 minute
      cacheTime: 300000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: false,
      retry: 2
    }
  )

  // Loading state
  if (isLoading) {
    return (
      <Card title="TOIL Overview">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card title="TOIL Overview">
        <Alert
          message="Error Loading TOIL Data"
          description={error.message || 'Failed to load TOIL statistics. Please try again later.'}
          type="error"
          showIcon
        />
      </Card>
    )
  }

  // Extract data with defaults
  const currentBalance = data?.balance || data?.current_balance || 0
  const totalAccrued = data?.total_accrued || 0
  const totalUsed = data?.total_consumed || data?.total_used || 0
  const expiringSoon = data?.expiring_soon || 0
  const expiryDays = data?.expiry_days || null

  return (
    <Card title="TOIL Overview">
      <Row gutter={16}>
        {/* Current Balance */}
        <Col xs={24} sm={8}>
          <Statistic
            title="Current Balance"
            value={currentBalance}
            precision={2}
            suffix="days"
            valueStyle={{ color: '#3f8600' }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>

        {/* Total Accrued */}
        <Col xs={24} sm={8}>
          <Statistic
            title="Total Accrued"
            value={totalAccrued}
            precision={2}
            suffix="days"
            prefix={<PlusOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>

        {/* Total Used */}
        <Col xs={24} sm={8}>
          <Statistic
            title="Total Used"
            value={totalUsed}
            precision={2}
            suffix="days"
            prefix={<MinusOutlined />}
            valueStyle={{ color: '#8c8c8c' }}
          />
        </Col>
      </Row>

      {/* Expiry Warning Alert */}
      {showExpiry && expiringSoon > 0 && (
        <Alert
          message="TOIL Expiring Soon"
          description={
            expiryDays
              ? `${expiringSoon.toFixed(2)} days expiring in ${expiryDays} days`
              : `${expiringSoon.toFixed(2)} days expiring within 30 days`
          }
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {/* No balance message */}
      {currentBalance === 0 && totalAccrued === 0 && (
        <Alert
          message="No TOIL Balance"
          description="You currently have no TOIL accrued. Submit timesheets with non-billable hours to earn TOIL."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  )
}

export default TOILStatistics
