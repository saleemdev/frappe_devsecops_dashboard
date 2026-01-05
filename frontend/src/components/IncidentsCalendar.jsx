/**
 * Incidents Calendar View Component
 * Displays incidents in a monthly calendar format with color coding by severity and status
 * Follows Gestalt design principles for visual hierarchy and organization
 */

import React, { useMemo } from 'react'
import { Calendar, Badge, Card, Typography, Space, theme } from 'antd'
import dayjs from 'dayjs'
import { useResponsive } from '../hooks/useResponsive'
import {
  groupIncidentsByDate,
  getDateIncidents,
  getSeverityColor,
  getStatusBorderColor,
  truncateTitle,
  getIncidentCount
} from '../utils/calendarUtils'

const { Text } = Typography

/**
 * IncidentsCalendar Component
 * Transforms incident data into a calendar view with visual hierarchy
 *
 * @param {Array} incidents - Array of incident objects
 * @param {Function} onIncidentClick - Callback function when incident is clicked
 * @param {Boolean} loading - Loading state indicator
 */
const IncidentsCalendar = ({ incidents = [], onIncidentClick, loading = false }) => {
  const { token } = theme.useToken()
  const { isMobile, isTablet } = useResponsive()

  // Group incidents by date for efficient lookup
  // Memoized to prevent recomputation on every render
  const groupedIncidents = useMemo(() => {
    return groupIncidentsByDate(incidents)
  }, [incidents])

  /**
   * Render date cell content with incidents
   * Responsive rendering: mobile shows badge only, desktop shows full incident cards
   *
   * @param {Date} date - Date for the cell
   * @returns {React.ReactNode} Cell content
   */
  const dateCellRender = (date) => {
    const dateIncidents = getDateIncidents(groupedIncidents, date)

    if (dateIncidents.length === 0) {
      return null
    }

    // Mobile: Just show badge count
    if (isMobile) {
      return (
        <div style={{ textAlign: 'center', padding: '2px 0' }}>
          <Badge
            count={dateIncidents.length}
            style={{ backgroundColor: token.colorPrimary }}
          />
        </div>
      )
    }

    // Tablet/Desktop: Show incidents with colors
    const maxDisplay = isTablet ? 2 : 3
    const displayIncidents = dateIncidents.slice(0, maxDisplay)
    const remainingCount = dateIncidents.length - maxDisplay

    return (
      <div style={{ padding: '4px 2px' }}>
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          {/* Incident count badge - visual hierarchy indicator */}
          <div style={{ textAlign: 'right', marginBottom: '2px' }}>
            <Badge
              count={dateIncidents.length}
              style={{
                backgroundColor: token.colorPrimary,
                fontSize: '10px',
                height: '16px',
                lineHeight: '16px',
                minWidth: '16px',
                padding: '0 4px'
              }}
            />
          </div>

          {/* Individual incidents - color coded by severity and status */}
          {displayIncidents.map((incident, idx) => {
            const severityColor = getSeverityColor(incident.severity)
            const borderColor = getStatusBorderColor(incident.status)

            return (
              <IncidentCard
                key={incident.name || idx}
                incident={incident}
                severityColor={severityColor}
                borderColor={borderColor}
                isTablet={isTablet}
                onIncidentClick={onIncidentClick}
              />
            )
          })}

          {/* Show "+X more" if there are remaining incidents */}
          {remainingCount > 0 && (
            <div
              style={{
                fontSize: '10px',
                color: token.colorTextSecondary,
                textAlign: 'center',
                padding: '2px',
                fontStyle: 'italic'
              }}
            >
              +{remainingCount} more
            </div>
          )}
        </Space>
      </div>
    )
  }

  /**
   * Custom header render for additional controls
   * Provides month navigation and legend
   */
  const headerRender = ({ value, onChange }) => {
    const month = value.format('MMMM YYYY')

    return (
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {/* Month navigation controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography.Title level={4} style={{ margin: 0 }}>
              {month}
            </Typography.Title>
            <Space>
              <button
                onClick={() => onChange(value.subtract(1, 'month'))}
                style={{
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  backgroundColor: token.colorBgContainer,
                  transition: 'all 0.2s ease',
                  fontSize: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = token.colorPrimary
                  e.currentTarget.style.color = token.colorPrimary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = token.colorBorder
                  e.currentTarget.style.color = 'inherit'
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => onChange(dayjs())}
                style={{
                  border: `1px solid ${token.colorPrimary}`,
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  backgroundColor: token.colorBgContainer,
                  color: token.colorPrimary,
                  transition: 'all 0.2s ease',
                  fontSize: '12px',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorPrimaryBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorBgContainer
                }}
              >
                Today
              </button>
              <button
                onClick={() => onChange(value.add(1, 'month'))}
                style={{
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  backgroundColor: token.colorBgContainer,
                  transition: 'all 0.2s ease',
                  fontSize: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = token.colorPrimary
                  e.currentTarget.style.color = token.colorPrimary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = token.colorBorder
                  e.currentTarget.style.color = 'inherit'
                }}
              >
                Next →
              </button>
            </Space>
          </div>

          {/* Color legend - visual guide for severity and status */}
          {!isMobile && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '12px',
                paddingTop: '8px',
                borderTop: `1px solid ${token.colorBorder}`
              }}
            >
              {/* Severity legend */}
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: '#ff4d4f',
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Critical</Text>
              </Space>
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: '#ff7a45',
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">High</Text>
              </Space>
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: '#ffc53d',
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Medium</Text>
              </Space>
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: '#52c41a',
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Low</Text>
              </Space>

              {/* Status legend */}
              <div
                style={{
                  marginLeft: '16px',
                  paddingLeft: '16px',
                  borderLeft: `1px solid ${token.colorBorder}`,
                  color: token.colorTextSecondary
                }}
              >
                <Text type="secondary">
                  Border: Status (Red=Open, Blue=In Progress, Green=Closed)
                </Text>
              </div>
            </div>
          )}
        </Space>
      </div>
    )
  }

  return (
    <Card
      loading={loading}
      bodyStyle={{
        padding: 0
      }}
      style={{
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      <Calendar
        dateCellRender={dateCellRender}
        headerRender={headerRender}
        mode="month"
        style={{
          padding: isMobile ? '8px' : '16px'
        }}
      />
    </Card>
  )
}

/**
 * IncidentCard Component
 * Individual incident card displayed in calendar cell
 * Shows title with tooltip, colored background by severity, border by status
 */
function IncidentCard({
  incident,
  severityColor,
  borderColor,
  isTablet,
  onIncidentClick
}) {
  const maxTitleLength = isTablet ? 20 : 30

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onIncidentClick && onIncidentClick(incident.name)
      }}
      title={incident.title}
      style={{
        backgroundColor: severityColor,
        borderLeft: `3px solid ${borderColor}`,
        padding: '4px 6px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
        lineHeight: '1.2',
        color: '#fff',
        fontWeight: 500,
        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {truncateTitle(incident.title, maxTitleLength)}
    </div>
  )
}

export default IncidentsCalendar
