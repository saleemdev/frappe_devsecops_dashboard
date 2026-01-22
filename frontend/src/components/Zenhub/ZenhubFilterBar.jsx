/**
 * ZenhubFilterBar Component
 *
 * Provides filtering and search controls:
 * - Product selector
 * - Project selector
 * - Epic selector (conditional)
 * - Issue search input
 * - Refresh button
 *
 * @component
 * @param {Object} props
 * @param {Array} props.products - Available products
 * @param {string} props.selectedProductName - Selected product name
 * @param {Array} props.projects - Available projects
 * @param {string} props.selectedProjectId - Selected project ID
 * @param {Array} props.epics - Available epics
 * @param {string} props.selectedEpicId - Selected epic ID
 * @param {string} props.searchText - Current search text
 * @param {Function} props.onProductChange - Callback when product changes
 * @param {Function} props.onProjectChange - Callback when project changes
 * @param {Function} props.onEpicChange - Callback when epic changes
 * @param {Function} props.onSearch - Callback when search text changes
 * @param {Function} props.onRefresh - Callback when refresh button clicked
 * @param {boolean} [props.loading] - Loading state
 * @returns {JSX.Element}
 */

import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { Select, Input, Button, Space, Row, Col, Tooltip } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import styles from './ZenhubDashboard.module.css'

const ZenhubFilterBar = React.memo(({
  products,
  selectedProductName,
  projects,
  selectedProjectId,
  epics,
  selectedEpicId,
  searchText,
  onProductChange,
  onProjectChange,
  onEpicChange,
  onSearch,
  onRefresh,
  loading
}) => {
  const handleProductChange = useCallback((value) => {
    onProductChange?.(value)
  }, [onProductChange])

  const handleProjectChange = useCallback((value) => {
    onProjectChange?.(value)
  }, [onProjectChange])

  const handleEpicChange = useCallback((value) => {
    onEpicChange?.(value)
  }, [onEpicChange])

  const handleSearchChange = useCallback((e) => {
    onSearch?.(e.target.value)
  }, [onSearch])

  return (
    <div className={styles.filterBar}>
      <Row gutter={[16, 16]} align="middle">
        {/* Product Selector */}
        <Col xs={24} sm={12} md={6}>
          <Select
            aria-label="Select software product"
            placeholder="Select Product"
            value={selectedProductName}
            onChange={handleProductChange}
            loading={loading}
            disabled={loading || products.length === 0}
            style={{ width: '100%' }}
          >
            {products.map((product) => (
              <Select.Option key={product.name} value={product.name}>
                {product.name}
              </Select.Option>
            ))}
          </Select>
        </Col>

        {/* Project Selector */}
        {selectedProductName && (
          <Col xs={24} sm={12} md={6}>
            <Select
              aria-label="Select project"
              placeholder="Select Project"
              value={selectedProjectId}
              onChange={handleProjectChange}
              loading={loading}
              disabled={loading || projects.length === 0}
              style={{ width: '100%' }}
              allowClear
            >
              {projects.map((project) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.title}
                </Select.Option>
              ))}
            </Select>
          </Col>
        )}

        {/* Epic Selector */}
        {selectedProjectId && epics.length > 0 && (
          <Col xs={24} sm={12} md={6}>
            <Select
              aria-label="Select epic"
              placeholder="Select Epic"
              value={selectedEpicId}
              onChange={handleEpicChange}
              loading={loading}
              disabled={loading || epics.length === 0}
              style={{ width: '100%' }}
              allowClear
            >
              {epics.map((epic) => (
                <Select.Option key={epic.id} value={epic.id}>
                  {epic.title}
                </Select.Option>
              ))}
            </Select>
          </Col>
        )}

        {/* Search Input */}
        <Col xs={24} sm={24} md={selectedProjectId ? 6 : 12}>
          <Input.Search
            aria-label="Search issues"
            placeholder="Search issues..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={handleSearchChange}
            disabled={loading}
            allowClear
            size="middle"
          />
        </Col>

        {/* Refresh Button */}
        <Col xs={24} sm={4} md={2}>
          <Tooltip title="Refresh data">
            <Button
              aria-label="Refresh dashboard data"
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              loading={loading}
              disabled={loading}
              block
            />
          </Tooltip>
        </Col>
      </Row>
    </div>
  )
})

ZenhubFilterBar.displayName = 'ZenhubFilterBar'

ZenhubFilterBar.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      zenhub_workspace_id: PropTypes.string
    })
  ).isRequired,
  selectedProductName: PropTypes.string,
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired
    })
  ),
  selectedProjectId: PropTypes.string,
  epics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired
    })
  ),
  selectedEpicId: PropTypes.string,
  searchText: PropTypes.string,
  onProductChange: PropTypes.func,
  onProjectChange: PropTypes.func,
  onEpicChange: PropTypes.func,
  onSearch: PropTypes.func,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool
}

ZenhubFilterBar.defaultProps = {
  selectedProductName: null,
  projects: [],
  selectedProjectId: null,
  epics: [],
  selectedEpicId: null,
  searchText: '',
  onProductChange: null,
  onProjectChange: null,
  onEpicChange: null,
  onSearch: null,
  loading: false
}

export default ZenhubFilterBar
