import React from 'react'
import { Breadcrumb, Space } from 'antd'
import { HomeOutlined, FolderOutlined, FileTextOutlined } from '@ant-design/icons'

/**
 * WikiBreadcrumb - Navigation breadcrumb for Wiki platform
 * Provides clear hierarchical navigation following Gestalt continuity principle
 *
 * Usage:
 * - <WikiBreadcrumb /> // Just "Wiki"
 * - <WikiBreadcrumb spaceName="DevOps Guides" spaceSlug="devops-guides" /> // Wiki > DevOps Guides
 * - <WikiBreadcrumb spaceName="DevOps Guides" spaceSlug="devops-guides" pageName="Getting Started" /> // Wiki > DevOps Guides > Getting Started
 */
const WikiBreadcrumb = ({ spaceName, spaceSlug, pageName, navigateToRoute }) => {
  const items = []

  // Home item (always present)
  items.push({
    title: (
      <a
        onClick={() => navigateToRoute && navigateToRoute('wiki')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <HomeOutlined />
        <span>Wiki</span>
      </a>
    )
  })

  // Space item (if present)
  if (spaceName && spaceSlug) {
    items.push({
      title: (
        <a
          onClick={() => navigateToRoute && navigateToRoute('wiki-space', spaceSlug)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FolderOutlined />
          <span>{spaceName}</span>
        </a>
      )
    })
  }

  // Page item (if present) - not clickable, final destination
  if (pageName) {
    items.push({
      title: (
        <Space size={6} style={{ color: '#595959' }}>
          <FileTextOutlined />
          <span>{pageName}</span>
        </Space>
      )
    })
  }

  return (
    <Breadcrumb
      separator="›"
      items={items}
      style={{
        marginBottom: '16px',
        fontSize: '13px',
        padding: '8px 0'
      }}
    />
  )
}

export default WikiBreadcrumb
