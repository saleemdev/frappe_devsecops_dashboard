import React from 'react'
import { Form } from 'antd'
import './GlassForm.css'

/**
 * GlassForm Component
 * Wrapper for Ant Design Form with glassmorphism styling
 * 
 * @param {string} variant - Glass variant: 'subtle' | 'default' | 'prominent'
 * @param {boolean} sectioned - Whether to apply section styling
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Form content
 * @param {object} formProps - All standard Ant Design Form props
 */
const GlassForm = ({
  variant = 'default',
  sectioned = false,
  className = '',
  children,
  ...formProps
}) => {
  // Build class names
  const glassClass = `glass-form glass-form-${variant}`
  const sectionedClass = sectioned ? 'glass-form-sectioned' : ''
  const classes = [glassClass, sectionedClass, className].filter(Boolean).join(' ')

  return (
    <Form
      className={classes}
      {...formProps}
    >
      {children}
    </Form>
  )
}


/**
 * GlassFormSection Component
 * Section wrapper for forms with glassmorphism styling
 */
export const GlassFormSection = ({
  title,
  icon,
  description,
  className = '',
  children
}) => {
  return (
    <div className={`glass-form-section ${className}`}>
      {(title || icon) && (
        <div className="glass-form-section-header">
          {icon && <span className="glass-form-section-icon">{icon}</span>}
          {title && <h3 className="glass-form-section-title">{title}</h3>}
        </div>
      )}
      {description && (
        <p className="glass-form-section-description">{description}</p>
      )}
      <div className="glass-form-section-content">
        {children}
      </div>
    </div>
  )
}


/**
 * GlassFormFieldGroup Component
 * Field group wrapper for forms with glassmorphism styling
 */
export const GlassFormFieldGroup = ({
  title,
  className = '',
  children
}) => {
  return (
    <div className={`glass-form-field-group ${className}`}>
      {title && (
        <div className="glass-form-field-group-title">{title}</div>
      )}
      <div className="glass-form-field-group-content">
        {children}
      </div>
    </div>
  )
}


export default GlassForm
