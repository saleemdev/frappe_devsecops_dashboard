import { useState, useEffect, useMemo } from 'react'
import {
  Card, Form, Input, Select, Button, Space, Typography, theme, message,
  Row, Col, Breadcrumb, Table, Tag, Tooltip, Popconfirm, Avatar, Badge,
  Alert, Empty, Switch, Divider, List, Modal
} from 'antd'
import {
  SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined,
  ArrowLeftOutlined, TeamOutlined, UserOutlined, CrownOutlined,
  CheckCircleOutlined, WarningOutlined, InfoCircleOutlined,
  SafetyOutlined, BgColorsOutlined, UsergroupAddOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import useChangeManagementTeamStore from '../stores/changeManagementTeamStore'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

function ChangeManagementTeamForm({ teamId, navigateToRoute, mode }) {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [teamData, setTeamData] = useState(null)
  const [members, setMembers] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(true)
  const [otherActiveTeams, setOtherActiveTeams] = useState([])
  const [otherDefaultTeams, setOtherDefaultTeams] = useState([])
  const [showActiveConfirm, setShowActiveConfirm] = useState(false)
  const [showDefaultConfirm, setShowDefaultConfirm] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [pendingIsDefault, setPendingIsDefault] = useState(null)

  const { fetchTeam, createTeam, updateTeam } = useChangeManagementTeamStore()

  // Determine mode
  const formMode = mode || (teamId ? 'edit' : 'create')
  const isReadOnly = formMode === 'view'

  // Computed values
  const hasLead = useMemo(() => members.some(m => m.role === 'Lead'), [members])
  const hasReviewer = useMemo(() => members.some(m => m.role === 'Reviewer'), [members])
  const memberCount = members.length

  // Check for other active teams
  const checkOtherActiveTeams = async (excludeTeamId = null) => {
    try {
      const filters = [['status', '=', 'Active']]
      if (excludeTeamId) {
        filters.push(['name', '!=', excludeTeamId])
      }

      const response = await fetch(
        `/api/resource/Change Management Team?${new URLSearchParams({
          fields: JSON.stringify(['name', 'team_name']),
          filters: JSON.stringify(filters),
          limit_page_length: 100
        })}`,
        {
          method: 'GET',
          headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
          credentials: 'include'
        }
      )

      if (response.ok) {
        const result = await response.json()
        const teams = result.data || []
        if (teamId) {
          // Filter out current team in edit mode
          setOtherActiveTeams(teams.filter(t => t.name !== teamId))
        } else {
          setOtherActiveTeams(teams)
        }
      }
    } catch (error) {
      console.warn('[ChangeManagementTeamForm] Could not check active teams:', error)
    }
  }

  // Handle status change with confirmation
  const handleStatusChange = (newStatus) => {
    if (newStatus === 'Active') {
      checkOtherActiveTeams(teamId).then(() => {
        if (otherActiveTeams.length > 0) {
          setPendingStatus('Active')
          setShowActiveConfirm(true)
        } else {
          form.setFieldValue('status', 'Active')
        }
      })
    } else {
      form.setFieldValue('status', 'Inactive')
    }
  }

  // Confirm activation (deactivate others)
  const confirmActivate = async () => {
    try {
      // Deactivate all other active teams
      for (const team of otherActiveTeams) {
        await fetch(`/api/resource/Change Management Team/${team.name}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include',
          body: JSON.stringify({ status: 'Inactive' })
        })
      }
      form.setFieldValue('status', 'Active')
      message.success(`Activated team. ${otherActiveTeams.length} other team(s) have been deactivated.`)
      setShowActiveConfirm(false)
      setOtherActiveTeams([])
    } catch (error) {
      message.error('Failed to deactivate other teams')
    }
  }

  // Check for other default teams
  const checkOtherDefaultTeams = async (excludeTeamId = null) => {
    try {
      const filters = [['is_default', '=', 1]]
      if (excludeTeamId) {
        filters.push(['name', '!=', excludeTeamId])
      }

      const response = await fetch(
        `/api/resource/Change Management Team?${new URLSearchParams({
          fields: JSON.stringify(['name', 'team_name']),
          filters: JSON.stringify(filters),
          limit_page_length: 100
        })}`,
        {
          method: 'GET',
          headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
          credentials: 'include'
        }
      )

      if (response.ok) {
        const result = await response.json()
        const teams = result.data || []
        if (teamId) {
          setOtherDefaultTeams(teams.filter(t => t.name !== teamId))
        } else {
          setOtherDefaultTeams(teams)
        }
      }
    } catch (error) {
      console.warn('[ChangeManagementTeamForm] Could not check default teams:', error)
    }
  }

  // Handle default team toggle with confirmation
  const handleDefaultToggle = async (checked) => {
    const newValue = checked ? 1 : 0
    if (newValue === 1) {
      await checkOtherDefaultTeams(teamId)
      if (otherDefaultTeams.length > 0) {
        setPendingIsDefault(1)
        setShowDefaultConfirm(true)
      } else {
        form.setFieldValue('is_default', 1)
      }
    } else {
      form.setFieldValue('is_default', 0)
    }
  }

  // Confirm setting as default (remove default from others)
  const confirmSetDefault = async () => {
    try {
      // Remove default from all other teams
      for (const team of otherDefaultTeams) {
        await fetch(`/api/resource/Change Management Team/${team.name}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include',
          body: JSON.stringify({ is_default: 0 })
        })
      }
      form.setFieldValue('is_default', 1)
      message.success(`This team is now the default. ${otherDefaultTeams.length} other team(s) are no longer default.`)
      setShowDefaultConfirm(false)
      setOtherDefaultTeams([])
    } catch (error) {
      message.error('Failed to update default teams')
    }
  }

  useEffect(() => {
    fetchUsers()
    checkOtherActiveTeams(teamId)
    checkOtherDefaultTeams(teamId)
    if (teamId) {
      loadTeamData()
    }
  }, [teamId])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      // First, get all employees with their user_id and designation
      // This is more efficient than making N+1 requests
      const empResponse = await fetch('/api/resource/Employee?fields=["name","user_id","designation","employee_name"]&limit_page_length=500', {
        headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
        credentials: 'include'
      })

      const employeeMap = {}
      if (empResponse.ok) {
        const empResult = await empResponse.json()
        ;(empResult.data || []).forEach(emp => {
          if (emp.user_id) {
            employeeMap[emp.user_id] = {
              designation: emp.designation || null,
              employee_name: emp.employee_name || null
            }
          }
        })
      }

      // Then fetch users
      const response = await fetch('/api/resource/User?fields=["name","full_name","email","user_image"]&limit_page_length=500', {
        headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()

        // Map employee data to users
        const usersWithEmployeeData = (result.data || []).map(user => {
          const empData = employeeMap[user.name] || {}
          return {
            ...user,
            designation: empData.designation || null,
            employee_name: empData.employee_name || user.full_name
          }
        })

        setAvailableUsers(usersWithEmployeeData)
      }
    } catch (error) {
      console.error('[ChangeManagementTeamForm] Error fetching users:', error)
      message.warning('Failed to load users. Please refresh the page.')
    } finally {
      setUsersLoading(false)
    }
  }

  const loadTeamData = async () => {
    setLoading(true)
    try {
      const data = await fetchTeam(teamId)
      if (data) {
        setTeamData(data)
        form.setFieldsValue({
          team_name: data.team_name,
          status: data.status || 'Active',
          description: data.description,
          is_default: data.is_default
        })

        // Map designations to existing members
        const membersWithDesignations = await Promise.all(
          (data.members || []).map(async (member) => {
            // Try to get designation from availableUsers first
            const user = availableUsers.find(u => u.name === member.user)
            if (user?.designation) {
              return { ...member, designation: user.designation }
            }

            // Fallback: fetch employee data if not available
            try {
              const empResponse = await fetch(
                `/api/resource/Employee?fields=["designation"]&filters=[["user_id","=","${member.user}"]]&limit_page_length=1`,
                {
                  headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
                  credentials: 'include'
                }
              )
              if (empResponse.ok) {
                const empResult = await empResponse.json()
                return {
                  ...member,
                  designation: empResult.data?.[0]?.designation || null
                }
              }
            } catch (err) {
              console.warn('Could not fetch designation for:', member.user)
            }
            return member
          })
        )

        setMembers(membersWithDesignations)
      }
    } catch (error) {
      message.error('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = (user) => {
    if (!user) return
    const userObj = availableUsers.find(u => u.name === user)
    if (userObj && !members.find(m => m.user === user)) {
      // Automatically assign Lead role if this is the first member
      const isFirstMember = members.length === 0
      setMembers([...members, {
        user: user,
        full_name: userObj.full_name || userObj.employee_name,
        email: userObj.email,
        designation: userObj.designation || null,
        user_image: userObj.user_image || null,
        role: isFirstMember ? 'Lead' : 'Member'
      }])
      setSelectedUser(null)
      message.success(`${userObj.full_name || userObj.name} added to team`)
    }
  }

  const handleRemoveMember = (userName) => {
    setMembers(members.filter(m => m.user !== userName))
  }

  const handleChangeMemberRole = (userName, role) => {
    setMembers(members.map(m => m.user === userName ? { ...m, role } : m))
  }

  const handleSubmit = async (values) => {
    try {
      setLoading(true)

      const payload = {
        team_name: values.team_name,
        status: values.status,
        description: values.description,
        is_default: values.is_default || 0,
        members: members.map((m, idx) => ({
          ...m,
          idx: idx + 1
        }))
      }

      if (teamId) {
        await updateTeam(teamId, payload)
        message.success('Team updated successfully')
      } else {
        await createTeam(payload)
        message.success('Team created successfully')
      }

      if (navigateToRoute) {
        navigateToRoute('change-management-teams')
      }
    } catch (error) {
      message.error(`Failed to save team: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (navigateToRoute) {
      navigateToRoute('change-management-teams')
    }
  }

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'lead': return { color: '#faad14', bg: '#fffbe6', border: '#ffe58f' }
      case 'reviewer': return { color: '#722ed1', bg: '#f9f0ff', border: '#d3adf7' }
      case 'member': return { color: '#1677ff', bg: '#e6f4ff', border: '#91caff' }
      case 'risk manager': return { color: '#d9534f', bg: '#fdf8f7', border: '#f5a9a3' }
      case 'product design': return { color: '#ff7a45', bg: '#fff7f1', border: '#ffb89a' }
      case 'stakeholder': return { color: '#13c2c2', bg: '#f0fffe', border: '#87e8de' }
      default: return { color: '#8c8c8c', bg: '#f5f5f5', border: '#d9d9d9' }
    }
  }

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'lead': return <CrownOutlined />
      case 'reviewer': return <CheckCircleOutlined />
      case 'risk manager': return <SafetyOutlined />
      case 'product design': return <BgColorsOutlined />
      case 'stakeholder': return <UsergroupAddOutlined />
      default: return <UserOutlined />
    }
  }

  const renderDesignationTag = (designation) => {
    if (!designation) {
      return (
        <Tag
          style={{
            backgroundColor: '#f5f5f5',
            borderColor: '#d9d9d9',
            color: '#8c8c8c',
            fontSize: '11px',
            padding: '0 8px',
            borderRadius: '4px'
          }}
        >
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          No designation
        </Tag>
      )
    }
    return (
      <Tag
        style={{
          backgroundColor: token.colorBgLayout,
          borderColor: token.colorBorderSecondary,
          color: token.colorTextSecondary,
          fontSize: '11px',
          padding: '0 8px',
          borderRadius: '4px'
        }}
      >
        {designation}
      </Tag>
    )
  }

  const memberColumns = [
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Team Member</Text>,
      dataIndex: 'full_name',
      key: 'full_name',
      width: 320,
      fixed: 'left',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge
            dot={record.role === 'Lead'}
            color={record.role === 'Lead' ? 'gold' : 'default'}
            offset={[-2, 2]}
          >
            <Avatar
              size={44}
              src={record.user_image}
              icon={!record.user_image && <UserOutlined />}
              style={{
                backgroundColor: !record.user_image ? token.colorPrimary : undefined,
                border: record.role === 'Lead' ? '2px solid #faad14' : '2px solid transparent'
              }}
            />
          </Badge>
          <div>
            <div style={{
              fontWeight: 600,
              fontSize: '14px',
              lineHeight: '20px',
              color: token.colorText,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {text || record.user}
              {record.role === 'Lead' && (
                <CrownOutlined style={{ color: '#faad14', fontSize: '14px' }} />
              )}
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextTertiary, lineHeight: '18px' }}>
              {record.email}
            </div>
            {renderDesignationTag(record.designation)}
          </div>
        </div>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Role</Text>,
      dataIndex: 'role',
      key: 'role',
      width: 160,
      align: 'center',
      render: (role, record) => {
        const roleStyle = getRoleColor(role)
        if (isReadOnly) {
          return (
            <Tag
              style={{
                color: roleStyle.color,
                backgroundColor: roleStyle.bg,
                borderColor: roleStyle.border,
                fontWeight: 500,
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {getRoleIcon(role)}
              {role}
            </Tag>
          )
        }
        return (
          <Select
            value={role}
            onChange={(newRole) => handleChangeMemberRole(record.user, newRole)}
            options={[
              { label: <><CrownOutlined /> Lead</>, value: 'Lead' },
              { label: <><CheckCircleOutlined /> Reviewer</>, value: 'Reviewer' },
              { label: <><UserOutlined /> Member</>, value: 'Member' },
              { label: <><SafetyOutlined /> Risk Manager</>, value: 'Risk Manager' },
              { label: <><BgColorsOutlined /> Product Design</>, value: 'Product Design' },
              { label: <><UsergroupAddOutlined /> Stakeholder</>, value: 'Stakeholder' }
            ]}
            size="small"
            style={{ width: '100%', minWidth: 120 }}
          />
        )
      }
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Actions</Text>,
      key: 'action',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record) =>
        !isReadOnly && (
          <Popconfirm
            title="Remove Member"
            description={
              <div>
                <div>Remove <strong>{record.full_name || record.user}</strong> from this team?</div>
                {record.role === 'Lead' && (
                  <div style={{ color: '#faad14', marginTop: 4, fontSize: '12px' }}>
                    <WarningOutlined /> This will remove the team lead
                  </div>
                )}
              </div>
            }
            onConfirm={() => handleRemoveMember(record.user)}
            okText="Remove"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Remove Member">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                style={{ padding: 4 }}
              />
            </Tooltip>
          </Popconfirm>
        )
    }
  ]

  return (
    <div>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        borderRadius: '12px',
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBack}
                  type="text"
                  size="small"
                  style={{ padding: 0, color: getHeaderIconColor(token) }}
                >
                  Back
                </Button>
                <Breadcrumb
                  separator=">"
                  items={[
                    { title: 'Configuration' },
                    { title: 'Change Management' },
                    { title: <a onClick={handleBack} style={{ color: getHeaderIconColor(token) }}>Teams</a> },
                    { title: teamId || 'New Team' }
                  ]}
                  style={{ fontSize: '12px', color: token.colorTextTertiary }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: getHeaderIconColor(token),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TeamOutlined style={{ fontSize: '24px', color: '#fff' }} />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0, color: getHeaderIconColor(token) }}>
                    {isReadOnly ? 'View Team' : teamId ? 'Edit Team' : 'Create New Team'}
                  </Title>
                  <Text style={{ color: token.colorTextTertiary, fontSize: '13px' }}>
                    {formMode === 'create' ? 'Set up a new change management team' : `Manage team members and settings`}
                  </Text>
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Badge status={teamData?.status === 'Active' ? 'success' : 'default'} text={
                  <Text strong style={{ color: teamData?.status === 'Active' ? '#52c41a' : token.colorTextTertiary }}>
                    {teamData?.status || 'Active'}
                  </Text>
                } />
                {teamData?.is_default && (
                  <Tag color="gold" icon={<CrownOutlined />}>Default Team</Tag>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {memberCount} member{memberCount !== 1 ? 's' : ''} • {hasLead ? 'Has Lead' : 'No Lead'}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'Active',
          is_default: 0
        }}
        disabled={isReadOnly}
        scrollToFirstError
      >
        {/* Team Information Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TeamOutlined style={{ color: token.colorPrimary }} />
              <span>Team Information</span>
            </div>
          }
          style={{ marginBottom: 16, borderRadius: '12px' }}
          bordered={false}
          bodyStyle={{ padding: '16px 24px 8px' }}
        >
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="team_name"
                label={<Text strong style={{ fontSize: '13px' }}>Team Name</Text>}
                rules={[
                  { required: true, message: 'Please enter team name' },
                  { min: 3, message: 'Team name must be at least 3 characters' }
                ]}
              >
                <Input
                  placeholder="e.g., Change Advisory Board"
                  size="large"
                  prefix={<TeamOutlined style={{ color: token.colorTextQuaternary }} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="status"
                label={<Text strong style={{ fontSize: '13px' }}>Status</Text>}
                rules={[{ required: true }]}
                tooltip="Only one team can be Active at a time. Setting this team as Active will deactivate all other Active teams."
              >
                <Select
                  onChange={handleStatusChange}
                  options={[
                    {
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge status="success" />
                          <span>Active</span>
                        </div>
                      ),
                      value: 'Active'
                    },
                    {
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge status="default" />
                          <span>Inactive</span>
                        </div>
                      ),
                      value: 'Inactive'
                    }
                  ]}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label={<Text strong style={{ fontSize: '13px' }}>Description</Text>}
          >
            <TextArea
              placeholder="Describe the purpose and scope of this change management team..."
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="is_default"
            label={<Text strong style={{ fontSize: '13px' }}>Default Team</Text>}
            tooltip="The default team will be automatically assigned to new change requests"
          >
            <div style={{ marginTop: 8 }}>
              <Switch
                checkedChildren="Yes"
                unCheckedChildren="No"
                onChange={handleDefaultToggle}
              />
              <Text style={{ marginLeft: 12, color: token.colorTextSecondary }}>
                Set this as the default team for new change requests
              </Text>
            </div>
          </Form.Item>
        </Card>

        {/* Team Members Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: token.colorPrimary }} />
              <span>Team Members</span>
              <Badge
                count={memberCount}
                style={{ backgroundColor: token.colorPrimary, marginLeft: 8 }}
                showZero
              />
            </div>
          }
          extra={
            !isReadOnly && (
              <div style={{ display: 'flex', gap: 8 }}>
                {!hasLead && members.length > 0 && (
                  <Alert
                    message="Assign a Lead"
                    description="Consider designating a team lead for proper governance."
                    type="warning"
                    showIcon
                    style={{ padding: '8px 12px', borderRadius: 6 }}
                    banner
                  />
                )}
              </div>
            )
          }
          style={{ marginBottom: 16, borderRadius: '12px' }}
          bordered={false}
          bodyStyle={{ padding: '16px 24px 8px' }}
        >
          {!isReadOnly && (
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: '13px' }}>
                Add Team Members
              </Text>
              <Select
                showSearch
                placeholder="Search by name, email, or designation..."
                value={selectedUser}
                onChange={handleAddMember}
                loading={usersLoading}
                notFoundContent={usersLoading ? 'Loading users...' : 'No users found'}
                filterOption={(input, option) =>
                  (option?.searchtext ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={availableUsers
                  .filter(u => !members.find(m => m.user === u.name))
                  .map(u => ({
                    label: (
                      <div style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar
                          size={36}
                          src={u.user_image}
                          icon={!u.user_image && <UserOutlined />}
                          style={{ backgroundColor: !u.user_image ? token.colorPrimary : undefined }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {u.full_name || u.employee_name || u.name}
                            {u.designation && (
                              <Tag style={{ margin: 0, fontSize: '10px', padding: '0 6px' }}>{u.designation}</Tag>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: token.colorTextTertiary }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    ),
                    value: u.name,
                    searchtext: `${u.full_name} ${u.email} ${u.designation || ''} ${u.employee_name || ''}`.toLowerCase()
                  }))}
                style={{ width: '100%' }}
                size="large"
                optionLabelProp="value"
              />
            </div>
          )}

          <Table
            columns={memberColumns}
            dataSource={members}
            rowKey="user"
            pagination={false}
            size="middle"
            scroll={{ x: 600 }}
            bordered={false}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: 4 }}>
                        No team members yet
                      </div>
                      <div style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                        {isReadOnly ? 'This team has no members assigned.' : 'Add members using the search box above to build your team.'}
                      </div>
                    </div>
                  }
                />
              )
            }}
          />
        </Card>

        {/* Action Buttons */}
        <Card
          style={{ borderRadius: '12px', marginBottom: 16 }}
          bordered={false}
          bodyStyle={{ padding: '16px 24px' }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Button onClick={handleBack} size="large">
                {isReadOnly ? 'Back to Teams' : 'Cancel'}
              </Button>
            </Col>
            <Col>
              {!isReadOnly && (
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={loading}
                    size="large"
                  >
                    {teamId ? 'Update Team' : 'Create Team'}
                  </Button>
                </Space>
              )}
            </Col>
          </Row>
        </Card>
      </Form>

      {/* Confirmation Modal for activating team */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />
            <span>Activate This Team?</span>
          </div>
        }
        open={showActiveConfirm}
        onCancel={() => {
          setShowActiveConfirm(false)
          form.setFieldValue('status', 'Inactive')
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowActiveConfirm(false)
              form.setFieldValue('status', 'Inactive')
            }}
          >
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            onClick={confirmActivate}
          >
            Activate (Deactivate {otherActiveTeams.length} Other{otherActiveTeams.length !== 1 ? 's' : ''})
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            There {otherActiveTeams.length === 1 ? 'is' : 'are'} currently{' '}
            <Text strong>{otherActiveTeams.length}</Text>{' '}
            other {otherActiveTeams.length === 1 ? 'team' : 'teams'} marked as Active.
          </Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ color: '#faad14' }}>
            Only one team can be Active at a time.
          </Text>
        </div>
        {otherActiveTeams.length > 0 && (
          <Card
            size="small"
            title="The following teams will be deactivated:"
            style={{ backgroundColor: token.colorBgContainer, marginBottom: 16 }}
          >
            <List
              size="small"
              dataSource={otherActiveTeams}
              renderItem={(team) => (
                <List.Item>
                  <Text>{team.team_name}</Text>
                  <Tag color="default">{team.name}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
        <Text type="secondary">
          Do you want to proceed with activating this team and deactivating all others?
        </Text>
      </Modal>

      {/* Confirmation Modal for setting default team */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CrownOutlined style={{ color: '#faad14', fontSize: 24 }} />
            <span>Set as Default Team?</span>
          </div>
        }
        open={showDefaultConfirm}
        onCancel={() => {
          setShowDefaultConfirm(false)
          form.setFieldValue('is_default', 0)
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowDefaultConfirm(false)
              form.setFieldValue('is_default', 0)
            }}
          >
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={confirmSetDefault}
            icon={<CrownOutlined />}
          >
            Set Default (Remove {otherDefaultTeams.length} Other{otherDefaultTeams.length !== 1 ? 's' : ''})
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            There {otherDefaultTeams.length === 1 ? 'is' : 'are'} currently{' '}
            <Text strong>{otherDefaultTeams.length}</Text>{' '}
            other {otherDefaultTeams.length === 1 ? 'team' : 'teams'} marked as Default.
          </Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ color: '#faad14' }}>
            Only one team can be the default at a time.
          </Text>
        </div>
        {otherDefaultTeams.length > 0 && (
          <Card
            size="small"
            title="The following teams will no longer be default:"
            style={{ backgroundColor: token.colorBgContainer, marginBottom: 16 }}
          >
            <List
              size="small"
              dataSource={otherDefaultTeams}
              renderItem={(team) => (
                <List.Item>
                  <Text>{team.team_name}</Text>
                  <Tag color="default">{team.name}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
        <Text type="secondary">
          Do you want to proceed with setting this team as the default?
        </Text>
      </Modal>
    </div>
  )
}

export default ChangeManagementTeamForm
