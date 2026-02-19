import React from 'react'
import './GlassContainer.css'

/**
 * GlassContainer Component
 * General-purpose glassmorphic container wrapper
 * 
 * @param {string} variant - Glass variant: 'subtle' | 'default' | 'prominent'
 * @param {string|number} padding - Custom padding value
 * @param {number} elevation - Shadow elevation level (0-5)
 * @param {boolean} hoverable - Enable hover effects
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Container content
 * @param {object} style - Custom inline styles
 */
const GlassContainer = ({
  variant = 'default',
  padding,
  elevation = 2,
  hoverable = false,
  className = '',
  children,
  style = {},
  ...props
}) => {
  // Build class names
  const glassClass = `glass-container glass-container-${variant}`
  const elevationClass = `glass-elevation-${Math.min(Math.max(elevation, 0), 5)}`
  const hoverClass = hoverable ? 'glass-hover' : ''
  const classes = [glassClass, elevationClass, hoverClass, className].filter(Boolean).join(' ')

  // Custom style
  const customStyle = {
    ...style,
    ...(padding && { padding: typeof padding === 'number' ? `${padding}px` : padding })
  }

  return (
    <div
      className={classes}
      style={customStyle}
      {...props}
    >
      {children}
    </div>
  )
}

export default GlassContainer
