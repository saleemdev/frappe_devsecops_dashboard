import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Typography, Space, Tag, Row, Col, Card, Statistic, Progress, Descriptions, Table, List, Alert, Empty, Spin, Button, Badge, Avatar, Tooltip, Segmented, message, Input, Tabs } from 'antd'
import { DashboardOutlined, CheckCircleOutlined, ExclamationCircleOutlined, PauseCircleOutlined, ReloadOutlined, SyncOutlined, EyeOutlined, StopOutlined, UserOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Text, Title } = Typography

// Local storage cache configuration
const CACHE_KEY_PREFIX = 'zenhub_sprint_cache_'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const statusTag = (state) => {
  const s = (state || '').toLowerCase()
  if (s === 'active' || s === 'open') return <Tag color="processing">Active</Tag>
  if (s === 'closed' || s === 'done' || s === 'completed') return <Tag color="success">Closed</Tag>
  if (s === 'future' || s === 'upcoming') return <Tag color="default">Upcoming</Tag>
  return <Tag>Unknown</Tag>
}

function SprintReportDialog({ open, onClose, projectId, projectName }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(null)

  const load = async (forceRefresh = false) => {
    if (!projectId) return

    // Try to load from localStorage first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cacheKey = `${CACHE_KEY_PREFIX}${projectId}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_TTL) {
            setData(cachedData)
            setLastFetchTime(timestamp)
            setLoading(false)
            return
          }
        }
      } catch (e) {
        // Cache error, continue to fetch
      }
    }

    setLoading(true)
    setError(null)
    try {
      const res = await api.zenhub.getSprintData(projectId, forceRefresh)
      setData(res)
      const fetchTime = Date.now()
      setLastFetchTime(fetchTime)

      // Cache in localStorage
      try {
        const cacheKey = `${CACHE_KEY_PREFIX}${projectId}`
        localStorage.setItem(cacheKey, JSON.stringify({
          data: res,
          timestamp: fetchTime
        }))
      } catch (e) {
        // Cache failure is non-critical
      }

      if (forceRefresh) {
        message.success('Sprint data refreshed successfully')
      }
    } catch (e) {
      setError(e?.message || 'Failed to load sprint data')
      message.error('Failed to load sprint data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && projectId) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId])

  const sprints = useMemo(() => data?.sprints || [], [data])
  const [activeSprintKey, setActiveSprintKey] = useState('0')
  useEffect(() => { setActiveSprintKey('0') }, [data])
  const sprint = useMemo(() => sprints[Number(activeSprintKey)] || null, [sprints, activeSprintKey])

  const pipelinesFromApi = useMemo(() => {
    const arr = Array.isArray(data?.pipelines) ? data.pipelines.slice() : []
    arr.sort((a, b) => ((a?.position ?? 0) - (b?.position ?? 0)))
    return arr
  }, [data])
  const pipelineNames = useMemo(() => (pipelinesFromApi || []).map(p => p?.name).filter(Boolean), [pipelinesFromApi])

  const [viewMode, setViewMode] = useState('table') // 'table' | 'kanban'
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const derived = useMemo(() => {
    if (!sprint) return { issuesSummary: { total: 0, completed: 0, in_progress: 0, blocked: 0 }, issuesArray: [], grouped: {} }
    const issuesArray = Array.isArray(sprint.issues)
      ? sprint.issues
      : (Array.isArray(sprint?.issues?.nodes) ? sprint.issues.nodes : [])

    const existingSummary = sprint.issues_summary || (!Array.isArray(sprint.issues) ? sprint.issues : null)

    let issuesSummary
    if (existingSummary) issuesSummary = existingSummary
    else {
      // Compute from array
      const counts = { total: issuesArray.length, completed: 0, in_progress: 0, blocked: 0 }
      issuesArray.forEach((it) => {
        const state = String(it.state || it.status || '').toLowerCase()
        const status = String(it.status || '').toLowerCase()
        if (status === 'blocked') counts.blocked += 1
        else if (status === 'in progress' || state === 'in_progress' || state === 'in progress') counts.in_progress += 1
        else if (state === 'closed' || state === 'done' || state === 'completed' || status === 'done') counts.completed += 1
      })
      issuesSummary = counts
    }

    const grouped = issuesArray.reduce((acc, it) => {
      const key = (it.status || 'To Do')
      acc[key] = acc[key] || []
      acc[key].push(it)
      return acc
    }, {})

    return { issuesSummary, issuesArray, grouped }
  }, [sprint])
  const filtered = useMemo(() => {
    const base = derived.issuesArray || []
    // Filter by pipeline name when API pipelines are available; else by legacy status
    const matchFilter = (it) => {
      if (statusFilter === 'All') return true
      const pName = it.pipeline_name || ''
      if (pipelineNames.length && pName) return pName === statusFilter
      return (it.status || 'To Do') === statusFilter
    }
    const byFilter = base.filter(matchFilter)

    const q = String(searchQuery || '').trim().toLowerCase()
    const bySearch = !q ? byFilter : byFilter.filter(it => {
      const id = String(it.issue_id || '').toLowerCase()
      const title = String(it.title || '').toLowerCase()
      const assignees = (it.assignees || []).map(a => String(a.name || a.id || '').toLowerCase())
      return id.includes(q) || title.includes(q) || assignees.some(n => n.includes(q))
    })

    // Group for Kanban: prefer pipeline_name when available, else status
    const grouped = bySearch.reduce((acc, it) => {
      const key = (pipelineNames.length ? (it.pipeline_name || 'Uncategorized') : (it.status || 'To Do'))
      acc[key] = acc[key] || []
      acc[key].push(it)
      return acc
    }, {})
    return { array: bySearch, grouped }
  }, [derived, statusFilter, searchQuery, pipelineNames])

  // Dev-only debug to inspect issue shape and assignees/epic presence
  useEffect(() => {
    try {
      // Debug inspection removed for security
    } catch (e) {}
  }, [derived])

  // Export to CSV function
  const exportToCSV = () => {
    if (!sprint || !derived.issuesArray.length) {
      message.warning('No data to export')
      return
    }

    try {
      const issues = derived.issuesArray
      const csvRows = []

      // Header row
      csvRows.push([
        'Issue ID',
        'Title',
        'Status',
        'Story Points',
        'Assignees',
        'Pipeline',
        'Sprint'
      ].join(','))

      // Data rows
      issues.forEach(issue => {
        const assignees = (issue.assignees || [])
          .map(a => a.name || a.username || a.id)
          .join('; ')

        csvRows.push([
          `"${issue.issue_id || ''}"`,
          `"${(issue.title || '').replace(/"/g, '""')}"`,
          `"${issue.status || ''}"`,
          issue.story_points || 0,
          `"${assignees}"`,
          `"${issue.pipeline_name || ''}"`,
          `"${sprint.sprint_name || ''}"`
        ].join(','))
      })

      const csv = csvRows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sprint-${sprint.sprint_name || 'report'}-${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(url)

      message.success('Sprint data exported successfully')
    } catch (e) {
      message.error('Failed to export data')
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DashboardOutlined />
          <span>Sprint Report{projectName ? ` - ${projectName}` : ''}</span>

        </div>
      }
      width="90%"
      footer={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => load(true)}
          disabled={loading}
        >
          Refresh
        </Button>,
        <Button
          key="export"
          icon={<DownloadOutlined />}
          onClick={exportToCSV}
          disabled={loading || !sprint}
        >
          Export CSV
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>
      ]}
      bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
      destroyOnClose
      maskClosable={false}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message="Failed to load sprint data" description={String(error)} showIcon />
      ) : !data ? null : (data?.sprints || []).length === 0 ? (
        <Empty description="No active or closed sprints found for this project" />
      ) : (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>{data.workspace_name}</Title>
              <Text type="secondary">Workspace ID: {data.workspace_id}</Text>
            </div>
            <div>
              {statusTag(sprint?.state)}
            </div>
          </div>

          {/* Sprint name and dates */}
          <Descriptions bordered column={3} size="small">
            <Descriptions.Item label="Sprint Name" span={1}>{sprint?.sprint_name || sprint?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Start Date" span={1}>{sprint?.start_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="End Date" span={1}>{sprint?.end_date || '-'}</Descriptions.Item>
          </Descriptions>

          {/* Story Points Summary */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Card>
                <Statistic title="Total Story Points" value={sprint?.total_story_points || 0} valueStyle={{ color: '#1677ff' }} />
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card>
                <Statistic title="Completed Story Points" value={sprint?.completed_story_points || 0} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card>
                <Statistic title="Remaining Story Points" value={sprint?.remaining_story_points || 0} valueStyle={{ color: '#faad14' }} />
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card>
                <Statistic title="Utilization" value={sprint?.utilization_percentage || 0} suffix="%" />
                <Progress percent={Math.round(sprint?.utilization_percentage || 0)} status="active" style={{ marginTop: 8 }} />
              </Card>
            </Col>
          </Row>

          {/* Team Member Story Points */}
          <Card title="Team Member Story Points">
            <Table
              rowKey={(r) => r.id}
              dataSource={sprint?.team_member_story_points || []}
              pagination={false}
              size="small"
              columns={[
                { title: 'Member', dataIndex: 'name', key: 'name', render: (v, r) => <Space><Text strong>{v}</Text><Text type="secondary">{r.username ? `(${r.username})` : ''}</Text></Space> },
                { title: 'Total Points', dataIndex: 'total_story_points', key: 'total_story_points' },
                { title: 'Completed Points', dataIndex: 'completed_story_points', key: 'completed_story_points', render: (v) => <Text style={{ color: '#52c41a' }}>{v}</Text> },
                { title: 'Utilization', dataIndex: 'utilization_percentage', key: 'utilization_percentage', render: (v) => (
                  <Space>
                    <Text>{v?.toFixed ? v.toFixed(2) : v}%</Text>
                    <Progress percent={Math.round(v || 0)} size="small" style={{ width: 120 }} />
                  </Space>
                ) },
              ]}
            />
          </Card>

          {/* Issues Summary */}
          <Card title="Issues Summary">
            <Space size="large" wrap>
              <Statistic title="Total" value={derived.issuesSummary?.total || 0} />
              <Statistic title="Completed" value={derived.issuesSummary?.completed || 0} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
              <Statistic title="In Progress" value={derived.issuesSummary?.in_progress || 0} valueStyle={{ color: '#1677ff' }} prefix={<PauseCircleOutlined />} />
              <Statistic title="Blocked" value={derived.issuesSummary?.blocked || 0} valueStyle={{ color: '#ff4d4f' }} prefix={<ExclamationCircleOutlined />} />
            </Space>
          </Card>

          {/* Sprint tabs (when multiple sprints) */}
          {(sprints?.length || 0) > 1 && (
            <div style={{ marginBottom: 8 }}>
              <Tabs
                size="small"
                activeKey={activeSprintKey}
                onChange={setActiveSprintKey}
                items={(sprints || []).map((s, i) => ({
                  key: String(i),
                  label: s?.sprint_name || s?.name || `Sprint ${i + 1}`
                }))}
              />
            </div>
          )}

          {/* View, Filter & Search controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Space size={8} wrap>
              <Text type="secondary">Filter:</Text>
              <Segmented
                options={[
                  { label: 'All', value: 'All' },
                  ...((pipelineNames.length ? pipelineNames : ['To Do','In Progress','In Review','Blocked','Done']).map(n => ({ label: n, value: n })))
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Input.Search
                allowClear
                placeholder="Search by ID, title, assignee..."
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={(v) => setSearchQuery(v)}
                style={{ width: 320 }}
              />
              <Tag color="blue">Showing {filtered.array.length} of {derived.issuesSummary?.total || 0}</Tag>
            </Space>
            <Segmented
              options={[{ label: 'Table View', value: 'table' }, { label: 'Kanban View', value: 'kanban' }]}
              value={viewMode}
              onChange={setViewMode}
            />
          </div>

          {/* Issues (Detailed) */}
          {viewMode === 'table' ? (
            <Card title="Issues">
              <Table
                rowKey={(r) => r.issue_id}
                dataSource={filtered.array}
                size="small"
                scroll={{ x: 'max-content', y: '50vh' }}
                pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ['10','20','50','100'] }}
                columns={[
                  { title: 'ID', dataIndex: 'issue_id', key: 'issue_id', width: 220, render: (v, r) => (
                    <Space>
                      <Tooltip title={v}>
                        <Tag style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</Tag>
                      </Tooltip>
                      {(r.blocked_by || []).length > 0 && <Tooltip title={`Blocked by: ${(r.blocked_by||[]).join(', ')}`}><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /></Tooltip>}
                    </Space>
                  ) },
                  { title: 'Title', dataIndex: 'title', key: 'title', width: 320, ellipsis: true, render: (v) => (
                    <Tooltip title={v}><Text ellipsis style={{ maxWidth: 300, display: 'inline-block' }}>{v}</Text></Tooltip>
                  ) },
                  { title: 'Epic', dataIndex: 'epic', key: 'epic', width: 220, render: (_, r) => {
                    const t = r?.epic?.title
                    return t ? <Tooltip title={t}><Tag color="purple" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</Tag></Tooltip> : '-'
                  } },
                  { title: 'Status', dataIndex: 'status', key: 'status', width: 130, render: (v) => {
                    const s = String(v || 'To Do')
                    const l = s.toLowerCase()
                    if (l === 'done') return <Tag icon={<CheckCircleOutlined />} color="success">Done</Tag>
                    if (l === 'in progress') return <Tag icon={<SyncOutlined spin />} color="blue">In Progress</Tag>
                    if (l === 'in review') return <Tag icon={<EyeOutlined />} color="orange">In Review</Tag>
                    if (l === 'blocked') return <Tag icon={<StopOutlined />} color="error">Blocked</Tag>
                    return <Tag color="default">To Do</Tag>
                  } },
                  { title: 'State', dataIndex: 'state', key: 'state', width: 100 },
                  { title: 'Story Points', dataIndex: 'story_points', key: 'story_points', width: 120, render: (v) => (
                    <Tag color={v > 0 ? 'geekblue' : 'default'} style={{ fontWeight: 600 }}>{v || 0}</Tag>
                  ) },
                  { title: 'Assignees', key: 'assignees', width: 220, render: (_, r) => {
                    const list = r.assignees || []
                    if (!list.length) return <Tag icon={<WarningOutlined />} color="default">Unassigned</Tag>
                    return (
                      <Space wrap>
                        {list.map(a => <Tag key={a.id}>{a.name || a.id}</Tag>)}
                        <Text type="secondary">({list.length})</Text>
                      </Space>
                    )
                  } },
                  { title: 'Blocked By', dataIndex: 'blocked_by', key: 'blocked_by', width: 180, render: (v = []) => (
                    v && v.length ? (
                      <Space wrap>
                        <Badge status="error" />
                        <Space wrap>
                          {v.map(id => (
                            <Tooltip key={id} title={`Click to copy ${id}`}>
                              <Tag
                                color="error"
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigator?.clipboard?.writeText?.(id)?.then(() => message.success('Copied'))}
                              >
                                {id}
                              </Tag>
                            </Tooltip>
                          ))}
                        </Space>
                      </Space>
                    ) : '-'
                  ) }
                ]}
              />
            </Card>
          ) : (
            <Card title="Issues - Kanban View">
              <Row gutter={[12, 12]}>
                {(() => {
                  const cols = (pipelineNames.length ? pipelineNames : ['To Do','In Progress','In Review','Blocked','Done']).slice()
                  // Append 'Uncategorized' if present in grouped but not in known columns
                  const groupedKeys = Object.keys(filtered.grouped || {})
                  if (groupedKeys.includes('Uncategorized') && !cols.includes('Uncategorized')) cols.push('Uncategorized')
                  return cols
                })().map((col) => (
                  <Col key={col} xs={24} sm={12} md={8} lg={6} xl={4} style={{ minWidth: 240 }}>
                    <Card size="small" title={<Space><Text strong>{col}</Text><Tag>{(filtered.grouped[col] || []).length}</Tag></Space>} bodyStyle={{ padding: 8, maxHeight: '60vh', overflowY: 'auto' }}>
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        {(filtered.grouped[col] || []).map((it) => (
                          <Card key={it.issue_id} size="small" hoverable>
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <Tag>{it.issue_id}</Tag>
                              {(it.blocked_by || []).length > 0 && <Badge status="error" text="Blocked" />}
                            </Space>
                            <div style={{ marginTop: 6, fontWeight: 500 }}>{it.title}</div>
                            {it?.epic?.title && (
                              <div style={{ marginTop: 4 }}>
                                <Tag color="purple">{it.epic.title}</Tag>
                              </div>
                            )}
                            <Space style={{ marginTop: 8 }} wrap>
                              <Tag color={it.story_points > 0 ? 'geekblue' : 'default'}>SP: {it.story_points || 0}</Tag>
                              {Array.isArray(it.assignees) && it.assignees.length > 0 ? (
                                <Avatar.Group maxCount={3} size="small">
                                  {it.assignees.map(a => (
                                    <Tooltip key={a.id} title={a.name || a.id}>
                                      <Avatar style={{ backgroundColor: '#1677ff' }}>
                                        {(a.name || a.id || '?').slice(0,2).toUpperCase()}
                                      </Avatar>
                                    </Tooltip>
                                  ))}
                                </Avatar.Group>
                              ) : (
                                <Tag icon={<UserOutlined />} color="default">Unassigned</Tag>
                              )}
                              {Array.isArray(it.assignees) && it.assignees.length > 1 && (
                                <Text type="secondary">({it.assignees.length} assignees)</Text>
                              )}
                            </Space>
                            {(it.blocked_by || []).length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                <Tooltip title={`Blocked by: ${(it.blocked_by||[]).join(', ')}`}>
                                  <Space wrap>
                                    {it.blocked_by.map(id => <Tag key={id} color="error">{id}</Tag>)}
                                  </Space>
                                </Tooltip>
                              </div>
                            )}
                          </Card>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* Blockers */}
          {(sprint?.blockers || []).length > 0 && (
            <Card title="Blockers">
              <List
                dataSource={sprint.blockers}
                renderItem={(b) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Text strong>{b.title || b.issue_id}</Text>}
                      description={(
                        <div>
                          <Text type="secondary">Blocked by: {(b.blocked_by || []).join(', ') || 'N/A'}</Text>
                        </div>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Space>
      )}
    </Modal>
  )
}

export default SprintReportDialog

