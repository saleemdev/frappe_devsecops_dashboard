import React from 'react'
import { Result, Button } from 'antd'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    this.setState({ error, errorInfo })

    // Log to backend if needed
    if (window.frappe) {
      window.frappe.call({
        method: 'frappe.log_error',
        args: {
          title: 'TOIL Frontend Error',
          message: `${error.toString()}\n\n${errorInfo.componentStack}`
        }
      })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="The TOIL interface encountered an error. Please try refreshing the page."
          extra={
            <Button type="primary" onClick={this.handleReset}>
              Refresh Page
            </Button>
          }
        >
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '16px' }}>
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
        </Result>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
