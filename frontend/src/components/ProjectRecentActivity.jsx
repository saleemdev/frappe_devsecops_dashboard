import { useState, useEffect } from 'react'
import { Card, Avatar, Typography, Spin, Empty, Tag, Button, message } from 'antd'
import {
  CommentOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  AlertOutlined,
  SwapOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Text } = Typography

const ProjectRecentActivity = ({ projectId }) => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const displayLimit = showAll ? activities.length : 5

  useEffect(() => {
    if (projectId) {
      loadActivities()
    }
  }, [projectId])

  const loadActivities = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.project_activity.get_project_recent_activity?project_name=${encodeURIComponent(projectId)}&limit=20`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setActivities(data.message?.data || [])
      } else {
        throw new Error('Failed to load activities')
      }
    } catch (error) {
      console.error('[ProjectRecentActivity] Error loading activities:', error)
      message.error('Failed to load recent activity')
    } finally {
      setLoading(false)
    }
  }

  const getDocTypeIcon = (doctype) => {
    switch (doctype) {
      case 'Project':
        return <FileTextOutlined style={{ fontSize: '14px', color: '#1890ff' }} />
      case 'Change Request':
        return <SwapOutlined style={{ fontSize: '14px', color: '#52c41a' }} />
      case 'Devsecops Dashboard Incident':
        return <AlertOutlined style={{ fontSize: '14px', color: '#ff4d4f' }} />
      default:
        return <CommentOutlined style={{ fontSize: '14px', color: '#8c8c8c' }} />
    }
  }

  const getDocTypeColor = (doctype) => {
    switch (doctype) {
      case 'Project':
        return 'blue'
      case 'Change Request':
        return 'green'
      case 'Devsecops Dashboard Incident':
        return 'red'
      default:
        return 'default'
    }
  }

  const stripHtml = (html) => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const truncateText = (text, maxLength = 120) => {
    const stripped = stripHtml(text)
    if (stripped.length <= maxLength) return stripped
    return stripped.substring(0, maxLength) + '...'
  }

  // Always show the card (don't hide when empty)
  const showEmpty = !loading && (!activities || activities.length === 0)

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CommentOutlined style={{ fontSize: '16px' }} />
          <Text strong style={{ fontSize: '15px' }}>Recent Activity</Text>
          {!loading && activities.length > 0 && (
            <Tag color="default" style={{ marginLeft: '8px', fontSize: '11px' }}>
              {activities.length}
            </Tag>
          )}
        </div>
      }
      size="small"
      style={{ marginTop: '24px' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin size="small" />
          <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
            Loading recent activity...
          </Text>
        </div>
      ) : showEmpty ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              No recent activity. Comments from Project, Change Requests, and Incidents will appear here.
            </Text>
          }
          style={{ padding: '24px 12px' }}
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activities.slice(0, displayLimit).map((activity, index) => (
          <div
            key={activity.name || index}
            style={{
              display: 'flex',
              gap: '10px',
              padding: '10px',
              background: index % 2 === 0 ? '#fafafa' : 'transparent',
              borderRadius: '6px',
              borderLeft: '2px solid #1890ff',
              transition: 'background 0.2s'
            }}
          >
            <Avatar
              size={32}
              icon={<UserOutlined />}
              style={{
                backgroundColor: '#1890ff',
                flexShrink: 0,
                fontSize: '14px'
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: '13px' }}>
                  {activity.comment_by || 'Unknown User'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  commented on
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getDocTypeIcon(activity.reference_doctype)}
                  <Tag color={getDocTypeColor(activity.reference_doctype)} style={{ margin: 0, fontSize: '11px' }}>
                    {activity.doctype_label}
                  </Tag>
                </div>
                <Text strong style={{ fontSize: '12px', color: '#595959' }}>
                  {activity.document_title}
                </Text>
              </div>
              <Text style={{ fontSize: '12px', color: '#595959', display: 'block', marginBottom: '4px' }}>
                {truncateText(activity.content)}
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ClockCircleOutlined style={{ fontSize: '11px', color: '#8c8c8c' }} />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {dayjs(activity.creation).fromNow()}
                </Text>
              </div>
            </div>
          </div>
        ))}
          </div>

          {activities.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
              <Button
                type="link"
                size="small"
                onClick={() => setShowAll(!showAll)}
                style={{ fontSize: '12px' }}
              >
                {showAll ? 'Show Less' : `Show All (${activities.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default ProjectRecentActivity
