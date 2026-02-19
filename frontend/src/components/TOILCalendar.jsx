/**
 * TOIL Calendar View Component
 * Displays timesheets with TOIL in a monthly calendar format with color coding by status
 * Pattern: IncidentsCalendar.jsx
 */

import { useMemo } from 'react'
import { Calendar, Badge, Button, Card, Typography, Space, theme } from 'antd'
import dayjs from 'dayjs'
import { useResponsive } from '../hooks/useResponsive'
import {
  groupTimesheetsByDate,
  getDateTimesheets,
  getStatusColor,
  truncateEmployeeName,
  formatTOILDays,
  TOIL_STATUS_COLORS
} from '../utils/toilCalendarUtils'
import { normalizeToilStatus } from '../utils/toilStatusUtils'

const { Text } = Typography

/**
 * TOILCalendar Component
 * Transforms timesheet data into a calendar view with visual hierarchy
 *
 * @param {Array} timesheets - Array of timesheet objects with TOIL data
 * @param {Function} onTimesheetClick - Callback function when timesheet is clicked
 * @param {Boolean} loading - Loading state indicator
 */
const TOILCalendar = ({ timesheets = [], onTimesheetClick, loading = false }) => {
  const { token } = theme.useToken()
  const { isMobile, isTablet } = useResponsive()

  // Group timesheets by date for efficient lookup
  // Memoized to prevent recomputation on every render
  const groupedTimesheets = useMemo(() => {
    return groupTimesheetsByDate(timesheets)
  }, [timesheets])

  /**
   * Render date cell content with timesheets
   * Responsive rendering: mobile shows badge only, desktop shows full timesheet cards
   *
   * @param {Date} date - Date for the cell
   * @returns {React.ReactNode} Cell content
   */
  const dateCellRender = (date) => {
    const dateTimesheets = getDateTimesheets(groupedTimesheets, date)

    if (dateTimesheets.length === 0) {
      return null
    }

    // Mobile: Just show badge count
    if (isMobile) {
      return (
        <div style={{ textAlign: 'center', padding: '2px 0' }}>
          <Badge
            count={dateTimesheets.length}
            style={{ backgroundColor: token.colorPrimary }}
          />
        </div>
      )
    }

    // Tablet/Desktop: Show timesheets with colors
    const maxDisplay = isTablet ? 2 : 3
    const displayTimesheets = dateTimesheets.slice(0, maxDisplay)
    const remainingCount = dateTimesheets.length - maxDisplay

    return (
      <div style={{ padding: '4px 2px' }}>
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          {/* Timesheet count badge - visual hierarchy indicator */}
          <div style={{ textAlign: 'right', marginBottom: '2px' }}>
            <Badge
              count={dateTimesheets.length}
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

          {/* Individual timesheets - color coded by status */}
          {displayTimesheets.map((timesheet, idx) => {
            const statusColor = getStatusColor(normalizeToilStatus(timesheet))

            return (
              <TimesheetCard
                key={timesheet.name || idx}
                timesheet={timesheet}
                statusColor={statusColor}
                isTablet={isTablet}
                onTimesheetClick={onTimesheetClick}
              />
            )
          })}

          {/* Show "+X more" if there are remaining timesheets */}
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
              <Button
                aria-label="Go to previous month"
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
                Previous
              </Button>
              <Button
                aria-label="Go to current month"
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
              </Button>
              <Button
                aria-label="Go to next month"
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
                Next
              </Button>
            </Space>
          </div>

          {/* Color legend - visual guide for TOIL status */}
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
              {/* Status legend */}
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: TOIL_STATUS_COLORS['Pending Accrual'].hex,
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Pending</Text>
              </Space>
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: TOIL_STATUS_COLORS['Accrued'].hex,
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Accrued</Text>
              </Space>
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: TOIL_STATUS_COLORS['Partially Used'].hex,
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Partially Used</Text>
              </Space>
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: TOIL_STATUS_COLORS['Fully Used'].hex,
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Fully Used</Text>
              </Space>
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: TOIL_STATUS_COLORS.Rejected.hex,
                    borderRadius: 2
                  }}
                />
                <Text type="secondary">Rejected</Text>
              </Space>
            </div>
          )}
          {isMobile && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Calendar badges show number of TOIL timesheets per day.
            </Text>
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
 * TimesheetCard Component
 * Individual timesheet card displayed in calendar cell
 * Shows employee name and TOIL days, colored background by status
 */
function TimesheetCard({
  timesheet,
  statusColor,
  isTablet,
  onTimesheetClick
}) {
  const maxNameLength = isTablet ? 15 : 20
  const employeeName = timesheet.employee_name || timesheet.employeeName || 'Unknown'
  const toilDays = timesheet.toil_days || timesheet.toilDays || 0

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onTimesheetClick && onTimesheetClick(timesheet.name)
      }}
      title={`${employeeName} - ${formatTOILDays(toilDays)}`}
      style={{
        backgroundColor: statusColor,
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
      {truncateEmployeeName(employeeName, maxNameLength)} ({parseFloat(toilDays).toFixed(1)}d)
    </div>
  )
}

export default TOILCalendar
