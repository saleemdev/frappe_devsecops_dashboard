// This file contains the enhanced UX design for Change Request Form
// To be merged into the main ChangeRequestForm.jsx after review

/*
ENHANCED UX DESIGN PRINCIPLES APPLIED:

1. GESTALT PRINCIPLES:
   - Proximity: Related fields grouped in visual containers
   - Similarity: Consistent styling for similar elements
   - Closure: Clear visual boundaries with cards and sections
   - Figure/Ground: Clear separation between sections
   - Continuity: Natural flow from top to bottom

2. VISUAL HIERARCHY:
   - Primary: Status indicators and CTA buttons
   - Secondary: Section headings and important fields
   - Tertiary: Supporting text and optional fields

3. FLAT DESIGN:
   - Minimal shadows and gradients
   - Clean borders and spacing
   - Consistent color palette
   - Clear typography hierarchy
*/

// ENHANCED STYLES TO ADD TO THE COMPONENT:

const enhancedStyles = {
  // Main container with better spacing
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px'
  },

  // Header section with visual hierarchy
  header: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
    padding: '24px 32px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e8ecf1'
  },

  // Status banner (replaces old status indicator)
  statusBanner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },

  statusCard: {
    background: '#ffffff',
    padding: '20px 24px',
    borderRadius: '8px',
    border: '2px solid #e8ecf1',
    transition: 'all 0.2s ease',
    cursor: 'default'
  },

  // Section container (replaces tabs)
  section: {
    background: '#ffffff',
    padding: '28px 32px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #e8ecf1',
    transition: 'all 0.2s ease'
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e8ecf1'
  },

  sectionIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '20px'
  },

  sectionTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#262626',
    flex: 1
  },

  sectionDescription: {
    fontSize: '13px',
    color: '#8c8c8c',
    marginTop: '4px'
  },

  // Field groups within sections
  fieldGroup: {
    background: '#fafbfc',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e8ecf1'
  },

  fieldGroupTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#262626',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  // Action buttons
  actionBar: {
    background: '#ffffff',
    padding: '20px 32px',
    borderRadius: '12px',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #e8ecf1',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    bottom: 0,
    zIndex: 10
  },

  primaryButton: {
    height: '44px',
    padding: '0 32px',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(24, 144, 255, 0.3)'
  },

  secondaryButton: {
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    borderRadius: '8px'
  }
}

// ENHANCED JSX STRUCTURE (to replace the current tabs):

const EnhancedFormStructure = () => {
  return (
    <div style={enhancedStyles.container}>
      {/* Enhanced Header */}
      <div style={enhancedStyles.header}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigateToRoute('change-requests')}
              style={{ marginRight: 16 }}
            >
              Back
            </Button>
            <Title level={3} style={{ display: 'inline-block', margin: 0 }}>
              {mode === 'edit' ? `Change Request: ${id}` : 'New Change Request'}
            </Title>
          </div>
          {mode === 'edit' && (
            <Space>
              <Tag color="blue" style={{ fontSize: '13px', padding: '4px 12px' }}>
                {id}
              </Tag>
              <Badge status="processing" text={`Modified ${dayjs(modified).fromNow()}`} />
            </Space>
          )}
        </Space>
      </div>

      {/* Status Banner (for edit mode) */}
      {mode === 'edit' && (
        <div style={enhancedStyles.statusBanner}>
          <div style={{
            ...enhancedStyles.statusCard,
            borderColor: getStatusConfig(approvalStatus).color,
            borderLeftWidth: '4px'
          }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space>
                {getStatusConfig(approvalStatus).icon}
                <Text type="secondary" style={{ fontSize: '12px' }}>Approval Status</Text>
              </Space>
              <Text strong style={{ fontSize: '16px', color: getStatusConfig(approvalStatus).color }}>
                {getStatusConfig(approvalStatus).label}
              </Text>
            </Space>
          </div>

          <div style={{
            ...enhancedStyles.statusCard,
            borderColor: getWorkflowStateConfig(workflowState).color,
            borderLeftWidth: '4px'
          }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space>
                {getWorkflowStateConfig(workflowState).icon}
                <Text type="secondary" style={{ fontSize: '12px' }}>Implementation Status</Text>
              </Space>
              <Text strong style={{ fontSize: '16px', color: getWorkflowStateConfig(workflowState).color }}>
                {getWorkflowStateConfig(workflowState).label}
              </Text>
            </Space>
          </div>

          <div style={enhancedStyles.statusCard}>
            <Button
              type="primary"
              size="large"
              icon={<ToolOutlined />}
              onClick={handleDevopsResolutionClick}
              disabled={approvalStatus !== 'Approved for Implementation'}
              style={{ width: '100%', height: '100%', minHeight: '80px' }}
            >
              DevOps Resolution
            </Button>
          </div>
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        {/* Section 1: Basic Information */}
        <div style={enhancedStyles.section}>
          <div style={enhancedStyles.sectionHeader}>
            <div style={enhancedStyles.sectionIcon}>
              <FileTextOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={enhancedStyles.sectionTitle}>Basic Information</h3>
              <p style={enhancedStyles.sectionDescription}>
                Core details about the change request and its context
              </p>
            </div>
          </div>

          <div style={enhancedStyles.fieldGroup}>
            <div style={enhancedStyles.fieldGroupTitle}>
              <DashboardOutlined style={{ color: '#1890ff' }} />
              Primary Details
            </div>
            <Row gutter={[24, 16]}>
              <Col xs={24} md={12}>
                <Form.Item name="title" label="Change Request Title" rules={[{ required: true }]}>
                  <Input size="large" placeholder="Enter descriptive title" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="project" label="Project" rules={[{ required: true }]}>
                  <Select size="large" placeholder="Select project" showSearch>
                    {projects.map(p => (
                      <Option key={p.name} value={p.name}>{p.project_name || p.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div style={enhancedStyles.fieldGroup}>
            <div style={enhancedStyles.fieldGroupTitle}>
              <CalendarOutlined style={{ color: '#52c41a' }} />
              Timeline & Organization
            </div>
            <Row gutter={[24, 16]}>
              <Col xs={24} md={8}>
                <Form.Item name="submission_date" label="Submission Date" initialValue={dayjs()}>
                  <DatePicker size="large" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="prepared_for" label="Prepared For">
                  <Input size="large" placeholder="Department or team" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="system_affected" label="System Affected">
                  <Input size="large" placeholder="System or application" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </div>

        {/* Section 2: Change Details */}
        <div style={enhancedStyles.section}>
          <div style={enhancedStyles.sectionHeader}>
            <div style={enhancedStyles.sectionIcon}>
              <EditOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={enhancedStyles.sectionTitle}>Change Details</h3>
              <p style={enhancedStyles.sectionDescription}>
                Detailed description and categorization of the proposed change
              </p>
            </div>
          </div>

          <div style={enhancedStyles.fieldGroup}>
            <div style={enhancedStyles.fieldGroupTitle}>
              <TagsOutlined style={{ color: '#722ed1' }} />
              Classification
            </div>
            <Row gutter={[24, 16]}>
              <Col xs={24} md={12}>
                <Form.Item name="change_category" label="Change Category">
                  <Select size="large" placeholder="Select category">
                    <Option value="Major">Major</Option>
                    <Option value="Minor">Minor</Option>
                    <Option value="Emergency">Emergency</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="downtime_expected" label="Downtime Expected">
                  <Select size="large" placeholder="Select">
                    <Option value="Yes">Yes</Option>
                    <Option value="No">No</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div style={enhancedStyles.fieldGroup}>
            <div style={enhancedStyles.fieldGroupTitle}>
              <FileTextOutlined style={{ color: '#fa8c16' }} />
              Description & Documentation
            </div>
            <Form.Item name="detailed_description" label="Detailed Description">
              <RichTextEditor placeholder="Provide comprehensive description of the change..." />
            </Form.Item>
            <Form.Item name="release_notes" label="Release Notes">
              <RichTextEditor placeholder="Document user-facing changes and updates..." />
            </Form.Item>
          </div>
        </div>

        {/* Continue with other sections... */}
        {/* Implementation Section, Approvers Section, etc. */}

        {/* Enhanced Action Bar */}
        <div style={enhancedStyles.actionBar}>
          <Space>
            <Button
              size="large"
              onClick={() => navigateToRoute('change-requests')}
              style={enhancedStyles.secondaryButton}
            >
              Cancel
            </Button>
            {mode === 'edit' && (
              <Button
                danger
                size="large"
                style={enhancedStyles.secondaryButton}
              >
                Delete
              </Button>
            )}
          </Space>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            style={enhancedStyles.primaryButton}
          >
            {mode === 'edit' ? 'Update Change Request' : 'Create Change Request'}
          </Button>
        </div>
      </Form>
    </div>
  )
}

export { enhancedStyles, EnhancedFormStructure }
