import React, { useState, useEffect } from 'react'
import { Dropdown, Avatar, Space, Spin, Empty, theme } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { searchUsers } from '../utils/projectAttachmentsApi'
import './MentionDropdown.css'

/**
 * MentionDropdown Component
 * Displays user search results for @ mention functionality
 */
const MentionDropdown = ({
  visible,
  position,
  onSelect,
  searchQuery,
  loading = false
}) => {
  const { token } = theme.useToken()
  const [users, setUsers] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (visible && searchQuery && searchQuery.length > 0) {
      searchForUsers(searchQuery)
    } else {
      setUsers([])
    }
  }, [searchQuery, visible])

  const searchForUsers = async (query) => {
    setSearching(true)
    try {
      const result = await searchUsers(query)
      if (result.success) {
        setUsers(result.users || [])
      }
    } catch (error) {

      setUsers([])
    } finally {
      setSearching(false)
    }
  }

  if (!visible) return null

  const items = users.map((user) => ({
    key: user.name,
    label: (
      <div className="mention-item">
        <Avatar
          size={24}
          icon={<UserOutlined />}
          src={user.user_image}
          style={{ backgroundColor: token.colorPrimary }}
        />
        <div className="mention-item-content">
          <div className="mention-item-name">{user.full_name || user.name}</div>
          <div className="mention-item-email">{user.email}</div>
        </div>
      </div>
    ),
    onClick: () => {
      onSelect({
        name: user.name,
        full_name: user.full_name || user.name,
        email: user.email,
        user_image: user.user_image
      })
    }
  }))

  return (
    <div
      className="mention-dropdown"
      style={{
        position: 'fixed',
        top: position?.top || 0,
        left: position?.left || 0,
        zIndex: 1000,
        backgroundColor: token.colorBgElevated,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: '6px',
        boxShadow: token.boxShadow,
        maxWidth: '300px',
        maxHeight: '300px',
        overflow: 'auto'
      }}
    >
      {searching ? (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : items.length > 0 ? (
        <div className="mention-dropdown-items">
          {items.map((item) => (
            <div
              key={item.key}
              className="mention-dropdown-item"
              onClick={item.onClick}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: `1px solid ${token.colorBorder}`,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = token.colorBgTextHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '16px' }}>
          <Empty description="No users found" style={{ margin: 0 }} />
        </div>
      )}
    </div>
  )
}

export default MentionDropdown

