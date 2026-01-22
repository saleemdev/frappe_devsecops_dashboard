/**
 * ZenhubMetricsCards Component
 *
 * Displays key metrics as glassmorphic cards:
 * - Total Issues
 * - Completed Issues
 * - Completion Rate
 * - Story Points Progress
 *
 * @component
 * @param {Object} props
 * @param {Object} props.metrics - Metrics object from useZenhubMetrics
 * @param {boolean} [props.loading] - Loading state
 * @returns {JSX.Element}
 */

import React from 'react'
import PropTypes from 'prop-types'
import { Card, Row, Col, Statistic, Progress, Skeleton } from 'antd'
import {
  CheckCircleOutlined,
  FileTextOutlined,
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import styles from './ZenhubDashboard.module.css'

const ZenhubMetricsCards = React.memo(({ metrics, loading }) => {
  if (loading) {
    return (
      <Row gutter={[16, 16]} className={styles.metricsRow}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} md={6} key={i}>
            <Card className={styles.metricCard}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <Row gutter={[16, 16]} className={styles.metricsRow}>
      {/* Total Issues Card */}
      <Col xs={24} sm={12} md={6}>
        <Card className={styles.metricCard} data-testid="total-issues-metric">
          <Statistic
            title="Total Issues"
            value={metrics.totalIssues}
            prefix={<FileTextOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>

      {/* Completed Issues Card */}
      <Col xs={24} sm={12} md={6}>
        <Card className={styles.metricCard} data-testid="completed-issues-metric">
          <Statistic
            title="Completed"
            value={metrics.closedIssues}
            suffix={`/ ${metrics.totalIssues}`}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>

      {/* Completion Rate Card */}
      <Col xs={24} sm={12} md={6}>
        <Card className={styles.metricCard} data-testid="completion-rate-metric">
          <div style={{ textAlign: 'center' }}>
            <p className={styles.metricLabel}>Completion Rate</p>
            <Progress
              type="circle"
              percent={metrics.issueCompletionRate}
              format={(percent) => `${percent}%`}
              strokeColor={{
                '0%': '#ff7a45',
                '50%': '#faad14',
                '100%': '#52c41a'
              }}
              size={80}
            />
          </div>
        </Card>
      </Col>

      {/* Story Points Card */}
      <Col xs={24} sm={12} md={6}>
        <Card className={styles.metricCard} data-testid="story-points-metric">
          <Statistic
            title="Story Points"
            value={metrics.completedPoints}
            suffix={`/ ${metrics.totalStoryPoints}`}
            prefix={<RiseOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>

      {/* Progress Bar Row */}
      <Col span={24}>
        <Card className={styles.metricCard} style={{ marginTop: 0 }}>
          <p className={styles.metricLabel}>Points Progress</p>
          <Progress
            percent={metrics.pointCompletionRate}
            status={metrics.pointCompletionRate === 100 ? 'success' : 'active'}
            format={(percent) => `${percent}% (${metrics.completedPoints}/${metrics.totalStoryPoints})`}
          />
          {metrics.blockedIssues > 0 && (
            <p style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
              ⚠️ {metrics.blockedIssues} blocked issue(s)
            </p>
          )}
          {metrics.unestimatedIssues > 0 && (
            <p style={{ marginTop: 4, color: '#faad14', fontSize: 12 }}>
              ℹ️ {metrics.unestimatedIssues} unestimated issue(s)
            </p>
          )}
        </Card>
      </Col>
    </Row>
  )
})

ZenhubMetricsCards.displayName = 'ZenhubMetricsCards'

ZenhubMetricsCards.propTypes = {
  metrics: PropTypes.shape({
    totalIssues: PropTypes.number.isRequired,
    closedIssues: PropTypes.number.isRequired,
    inProgressIssues: PropTypes.number.isRequired,
    openIssues: PropTypes.number.isRequired,
    issueCompletionRate: PropTypes.number.isRequired,
    pointCompletionRate: PropTypes.number.isRequired,
    totalStoryPoints: PropTypes.number.isRequired,
    completedPoints: PropTypes.number.isRequired,
    blockedIssues: PropTypes.number,
    unestimatedIssues: PropTypes.number
  }),
  loading: PropTypes.bool
}

ZenhubMetricsCards.defaultProps = {
  metrics: null,
  loading: false
}

export default ZenhubMetricsCards
