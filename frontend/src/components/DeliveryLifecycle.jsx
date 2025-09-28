import React from 'react'
import { Card, Typography, theme } from 'antd'
import { DashboardOutlined } from '@ant-design/icons'

const { Text } = Typography

/**
 * DeliveryLifecycle Component
 * 
 * Displays the delivery lifecycle steps in a structured format.
 * Designed to be easily integrated with API data.
 * 
 * Props:
 * - steps: Array of lifecycle step objects or strings
 * - title: Custom title for the card (default: "Delivery Lifecycle")
 * - loading: Boolean to show loading state
 * - size: Card size ('default' | 'small')
 * - style: Additional styles for the card
 */
function DeliveryLifecycle({ 
  steps = [], 
  title = "Delivery Lifecycle",
  loading = false,
  size = "small",
  style = {}
}) {
  const { token } = theme.useToken()

  // Normalize steps to handle both string arrays and object arrays
  const normalizedSteps = steps.map((step, index) => {
    if (typeof step === 'string') {
      return {
        id: index + 1,
        name: step,
        description: null,
        status: 'pending', // pending, active, completed
        order: index + 1
      }
    }
    return {
      id: step.id || index + 1,
      name: step.name || step.title || `Step ${index + 1}`,
      description: step.description || null,
      status: step.status || 'pending',
      order: step.order || index + 1,
      ...step
    }
  })

  const getStepStyle = (step) => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 8,
      fontSize: 12,
      padding: '6px 10px',
      borderRadius: 6,
      border: `1px solid ${token.colorBorder}`,
      transition: 'all 0.2s ease'
    }

    // Status-based styling
    switch (step.status) {
      case 'completed':
        return {
          ...baseStyle,
          backgroundColor: token.colorSuccessBg,
          borderColor: token.colorSuccess,
        }
      case 'active':
        return {
          ...baseStyle,
          backgroundColor: token.colorPrimaryBg,
          borderColor: token.colorPrimary,
        }
      case 'pending':
      default:
        return {
          ...baseStyle,
          backgroundColor: token.colorFillTertiary,
        }
    }
  }

  const getStepNumberStyle = (step) => {
    const baseStyle = {
      width: 20,
      height: 20,
      borderRadius: '50%',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      fontWeight: 'bold',
      marginRight: 10,
      flexShrink: 0
    }

    // Status-based number styling
    switch (step.status) {
      case 'completed':
        return {
          ...baseStyle,
          backgroundColor: token.colorSuccess,
        }
      case 'active':
        return {
          ...baseStyle,
          backgroundColor: token.colorPrimary,
        }
      case 'pending':
      default:
        return {
          ...baseStyle,
          backgroundColor: token.colorTextTertiary,
        }
    }
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DashboardOutlined style={{ color: token.colorPrimary }} />
          <span style={{ fontSize: '16px' }}>{title}</span>
        </div>
      }
      size={size}
      loading={loading}
      style={style}
    >
      <div style={{ margin: 0 }}>
        {normalizedSteps.length === 0 ? (
          <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
            No lifecycle steps available
          </Text>
        ) : (
          normalizedSteps.map((step) => (
            <div key={step.id} style={getStepStyle(step)}>
              <div style={getStepNumberStyle(step)}>
                {step.order}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ 
                  fontSize: '11px', 
                  lineHeight: '1.3',
                  fontWeight: step.status === 'active' ? 'bold' : 'normal'
                }}>
                  {step.name}
                </span>
                {step.description && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: token.colorTextTertiary,
                    marginTop: 2,
                    lineHeight: '1.2'
                  }}>
                    {step.description}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

export default DeliveryLifecycle

/**
 * Example usage:
 * 
 * // With string array (current format)
 * <DeliveryLifecycle steps={[
 *   'Business Development',
 *   'Product Design Documentation',
 *   'Secure Architecture'
 * ]} />
 * 
 * // With object array (API-ready format)
 * <DeliveryLifecycle steps={[
 *   {
 *     id: 1,
 *     name: 'Business Development',
 *     description: 'Initial business requirements gathering',
 *     status: 'completed',
 *     order: 1
 *   },
 *   {
 *     id: 2,
 *     name: 'Product Design Documentation',
 *     description: 'Detailed product design and specifications',
 *     status: 'active',
 *     order: 2
 *   }
 * ]} />
 * 
 * // With loading state
 * <DeliveryLifecycle loading={true} />
 * 
 * // With custom title
 * <DeliveryLifecycle 
 *   steps={steps} 
 *   title="Project Lifecycle" 
 * />
 */
