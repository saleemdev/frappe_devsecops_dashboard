/**
 * API Test Runner Component
 * Provides a UI to run API tests and view results
 */

import React, { useState } from 'react'
import { Card, Button, Typography, Space, Alert, Collapse, Tag, Spin } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { runAllTests } from '../services/api/__tests__/projects.test.js'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

export default function ApiTestRunner() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [logs, setLogs] = useState([])

  const captureConsole = () => {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const captured = []

    console.log = (...args) => {
      captured.push({ type: 'log', message: args.join(' ') })
      originalLog(...args)
    }

    console.error = (...args) => {
      captured.push({ type: 'error', message: args.join(' ') })
      originalError(...args)
    }

    console.warn = (...args) => {
      captured.push({ type: 'warn', message: args.join(' ') })
      originalWarn(...args)
    }

    return {
      captured,
      restore: () => {
        console.log = originalLog
        console.error = originalError
        console.warn = originalWarn
      }
    }
  }

  const handleRunTests = async () => {
    setRunning(true)
    setResults(null)
    setLogs([])

    const capture = captureConsole()

    try {
      const success = await runAllTests()
      setResults({ success, timestamp: new Date().toISOString() })
    } catch (error) {
      setResults({ success: false, error: error.message, timestamp: new Date().toISOString() })
    } finally {
      capture.restore()
      setLogs(capture.captured)
      setRunning(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <PlayCircleOutlined />
          <span>Projects API Test Runner</span>
        </Space>
      }
      style={{ margin: '20px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Paragraph>
          This test runner verifies the Projects API service functionality including:
        </Paragraph>
        <ul>
          <li>Task Type summary grouping and ordering</li>
          <li>Task filtering by Task Type</li>
          <li>Color coding logic (red 0-33%, yellow 34-66%, green 67-100%)</li>
          <li>Mock data integration</li>
          <li>Error handling</li>
        </ul>

        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleRunTests}
          loading={running}
          size="large"
        >
          {running ? 'Running Tests...' : 'Run All Tests'}
        </Button>

        {results && (
          <Alert
            message={results.success ? 'All Tests Passed!' : 'Some Tests Failed'}
            description={
              results.error
                ? `Error: ${results.error}`
                : `Test run completed at ${new Date(results.timestamp).toLocaleTimeString()}`
            }
            type={results.success ? 'success' : 'error'}
            icon={results.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            showIcon
          />
        )}

        {logs.length > 0 && (
          <Collapse defaultActiveKey={['logs']}>
            <Panel header={`Test Logs (${logs.length} entries)`} key="logs">
              <div
                style={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              >
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '4px',
                      color:
                        log.type === 'error'
                          ? '#ff4d4f'
                          : log.type === 'warn'
                          ? '#faad14'
                          : '#000000'
                    }}
                  >
                    <Tag
                      color={
                        log.type === 'error'
                          ? 'red'
                          : log.type === 'warn'
                          ? 'orange'
                          : 'blue'
                      }
                      style={{ marginRight: '8px' }}
                    >
                      {log.type.toUpperCase()}
                    </Tag>
                    {log.message}
                  </div>
                ))}
              </div>
            </Panel>
          </Collapse>
        )}

        <Alert
          message="How to Use"
          description={
            <div>
              <p>Click "Run All Tests" to execute the test suite.</p>
              <p>
                You can also run tests from the browser console by typing:
                <code style={{ display: 'block', margin: '8px 0', padding: '8px', backgroundColor: '#f5f5f5' }}>
                  window.runProjectsApiTests()
                </code>
              </p>
            </div>
          }
          type="info"
        />
      </Space>
    </Card>
  )
}

