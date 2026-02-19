import React from 'react'
import { Card } from 'antd'
import './GlassCard.css'

/**
 * GlassCard Component
 * Wrapper for Ant Design Card with glassmorphism styling
 * 
 * @param {string} variant - Glass variant: 'subtle' | 'default' | 'prominent' | 'strong'
 * @param {number} elevation - Shadow elevation level (0-5)
 * @param {string|number} blur - Custom blur amount (optional)
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Card content
 * @param {object} cardProps - All standard Ant Design Card props
 */
const GlassCard = ({
  variant = 'default',
  elevation = 2,
  blur,
  className = '',
  children,
  ...cardProps
}) => {
  // Build class names
  const glassClass = `glass-card glass-card-${variant}`
  const elevationClass = `glass-elevation-${Math.min(Math.max(elevation, 0), 5)}`
  const classes = [glassClass, elevationClass, className].filter(Boolean).join(' ')

  // Custom style for blur override
  const customStyle = blur ? {
    backdropFilter: `blur(${blur})`,
    WebkitBackdropFilter: `blur(${blur})`
  } : {}

  return (
    <Card
      className={classes}
      style={customStyle}
      {...cardProps}
    >
      {children}
    </Card>
  )
}

export default GlassCard
