/**
 * API Diagnostics Component
 * Helps diagnose API configuration and service availability issues
 */

import React, { useState, useEffect } from 'react'
import { Card, Button, Typography, Space, Alert, Descriptions, Tag, Divider } from 'antd'
import { BugOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../services/api'
import { API_CONFIG, isMockEnabled } from '../services/api/config'

const { Title, Text, Paragraph } = Typography

export default function ApiDiagnostics() {
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    const results = {}

    // 1. Check API service availability
    console.log('[ApiDiagnostics] Checking API service availability...')
    results.apiServiceExists = !!api
    results.projectsServiceExists = !!(api && api.projects)
    results.getTaskTypeSummaryExists = !!(api && api.projects && typeof api.projects.getTaskTypeSummary === 'function')
    results.getTasksByTypeExists = !!(api && api.projects && typeof api.projects.getTasksByType === 'function')

    console.log('[ApiDiagnostics] API service:', api)
    console.log('[ApiDiagnostics] Projects service:', api?.projects)

    // 2. Check configuration
    results.mockDataConfig = API_CONFIG.features?.useMockData
    results.projectsMockEnabled = isMockEnabled('projects')

    // 3. Test API call
    try {
      console.log('[ApiDiagnostics] Testing getTaskTypeSummary with proj-001...')
      const response = await api.projects.getTaskTypeSummary('proj-001')
      console.log('[ApiDiagnostics] Response:', response)
      results.apiCallSuccess = response?.success === true
      results.apiCallData = response?.data
      results.apiCallDataLength = response?.data?.length || 0
      results.apiCallError = null
    } catch (error) {
      console.error('[ApiDiagnostics] API call failed:', error)
      results.apiCallSuccess = false
      results.apiCallData = null
      results.apiCallDataLength = 0
      results.apiCallError = error.message
    }

    // 4. Test getTasksByType
    try {
      console.log('[ApiDiagnostics] Testing getTasksByType with proj-001, Development...')
      const response = await api.projects.getTasksByType('proj-001', 'Development')
      console.log('[ApiDiagnostics] Response:', response)
      results.getTasksByTypeSuccess = response?.success === true
      results.getTasksByTypeData = response?.data
      results.getTasksByTypeDataLength = response?.data?.length || 0
      results.getTasksByTypeError = null
    } catch (error) {
      console.error('[ApiDiagnostics] getTasksByType call failed:', error)
      results.getTasksByTypeSuccess = false
      results.getTasksByTypeData = null
      results.getTasksByTypeDataLength = 0
      results.getTasksByTypeError = error.message
    }

    // 5. Check mock data availability
    try {
      const { mockTaskTypes, mockTasksByProject } = await import('../services/api/mockData.js')
      results.mockTaskTypesExists = !!mockTaskTypes
      results.mockTaskTypesLength = mockTaskTypes?.length || 0
      results.mockTasksByProjectExists = !!mockTasksByProject
      results.mockTasksByProjectKeys = Object.keys(mockTasksByProject || {})
      results.mockProj001TasksLength = mockTasksByProject?.['proj-001']?.length || 0
    } catch (error) {
      console.error('[ApiDiagnostics] Failed to load mock data:', error)
      results.mockDataLoadError = error.message
    }

    console.log('[ApiDiagnostics] Final results:', results)
    setDiagnostics(results)
    setLoading(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const renderStatus = (value) => {
    return value ? (
      <Tag icon={<CheckCircleOutlined />} color="success">
        OK
      </Tag>
    ) : (
      <Tag icon={<CloseCircleOutlined />} color="error">
        FAIL
      </Tag>
    )
  }

  return (
    <Card
      title={
        <Space>
          <BugOutlined />
          <span>API Diagnostics</span>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={runDiagnostics} loading={loading}>
          Re-run Diagnostics
        </Button>
      }
      style={{ margin: '20px' }}
    >
      {!diagnostics ? (
        <Alert message="Running diagnostics..." type="info" showIcon />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Service Availability */}
          <div>
            <Title level={4}>1. Service Availability</Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="API Service">
                {renderStatus(diagnostics.apiServiceExists)}
              </Descriptions.Item>
              <Descriptions.Item label="Projects Service">
                {renderStatus(diagnostics.projectsServiceExists)}
              </Descriptions.Item>
              <Descriptions.Item label="getTaskTypeSummary Method">
                {renderStatus(diagnostics.getTaskTypeSummaryExists)}
              </Descriptions.Item>
              <Descriptions.Item label="getTasksByType Method">
                {renderStatus(diagnostics.getTasksByTypeExists)}
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* Configuration */}
          <div>
            <Title level={4}>2. Configuration</Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Mock Data Config">
                <pre style={{ margin: 0, fontSize: '12px' }}>
                  {JSON.stringify(diagnostics.mockDataConfig, null, 2)}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="Projects Mock Enabled">
                {renderStatus(diagnostics.projectsMockEnabled)}
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {diagnostics.projectsMockEnabled ? 'Using mock data' : 'Using real API'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* API Call Test */}
          <div>
            <Title level={4}>3. API Call Test (getTaskTypeSummary)</Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Call Success">
                {renderStatus(diagnostics.apiCallSuccess)}
              </Descriptions.Item>
              {diagnostics.apiCallError && (
                <Descriptions.Item label="Error">
                  <Text type="danger">{diagnostics.apiCallError}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Data Returned">
                {diagnostics.apiCallDataLength} groups
              </Descriptions.Item>
              {diagnostics.apiCallData && (
                <Descriptions.Item label="Response Data">
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      maxHeight: '300px',
                      overflow: 'auto',
                      backgroundColor: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px'
                    }}
                  >
                    {JSON.stringify(diagnostics.apiCallData, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          <Divider />

          {/* getTasksByType Test */}
          <div>
            <Title level={4}>4. API Call Test (getTasksByType)</Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Call Success">
                {renderStatus(diagnostics.getTasksByTypeSuccess)}
              </Descriptions.Item>
              {diagnostics.getTasksByTypeError && (
                <Descriptions.Item label="Error">
                  <Text type="danger">{diagnostics.getTasksByTypeError}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Tasks Returned">
                {diagnostics.getTasksByTypeDataLength} tasks
              </Descriptions.Item>
              {diagnostics.getTasksByTypeData && (
                <Descriptions.Item label="Response Data">
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      maxHeight: '200px',
                      overflow: 'auto',
                      backgroundColor: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px'
                    }}
                  >
                    {JSON.stringify(diagnostics.getTasksByTypeData, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          <Divider />

          {/* Mock Data Availability */}
          <div>
            <Title level={4}>5. Mock Data Availability</Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="mockTaskTypes">
                {renderStatus(diagnostics.mockTaskTypesExists)}
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {diagnostics.mockTaskTypesLength} types
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="mockTasksByProject">
                {renderStatus(diagnostics.mockTasksByProjectExists)}
              </Descriptions.Item>
              <Descriptions.Item label="Project Keys">
                {diagnostics.mockTasksByProjectKeys?.join(', ') || 'None'}
              </Descriptions.Item>
              <Descriptions.Item label="proj-001 Tasks">
                {diagnostics.mockProj001TasksLength} tasks
              </Descriptions.Item>
              {diagnostics.mockDataLoadError && (
                <Descriptions.Item label="Load Error">
                  <Text type="danger">{diagnostics.mockDataLoadError}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          {/* Summary */}
          <Alert
            message="Diagnostic Summary"
            description={
              <div>
                {diagnostics.apiCallSuccess && diagnostics.getTasksByTypeSuccess ? (
                  <Text type="success">
                    ✓ All API calls are working correctly. The Projects API service is properly
                    configured and returning data.
                  </Text>
                ) : (
                  <Text type="danger">
                    ✗ Some API calls failed. Check the error messages above and the browser console
                    for more details.
                  </Text>
                )}
              </div>
            }
            type={
              diagnostics.apiCallSuccess && diagnostics.getTasksByTypeSuccess ? 'success' : 'error'
            }
            showIcon
          />
        </Space>
      )}
    </Card>
  )
}

