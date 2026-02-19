import React from 'react'
import { Modal } from 'antd'
import './GlassModal.css'

/**
 * GlassModal Component
 * Wrapper for Ant Design Modal with glassmorphism styling
 * 
 * @param {string} glassVariant - Glass variant for modal content: 'subtle' | 'default' | 'prominent'
 * @param {boolean} glassBackdrop - Apply glass effect to backdrop
 * @param {string} className - Additional CSS classes
 * @param {object} modalProps - All standard Ant Design Modal props
 */
const GlassModal = ({
  glassVariant = 'default',
  glassBackdrop = true,
  className = '',
  wrapClassName,
  ...modalProps
}) => {
  // Build class names
  const modalClass = `glass-modal glass-modal-${glassVariant}`
  const classes = [modalClass, className].filter(Boolean).join(' ')

  // Backdrop class
  const backdropClass = glassBackdrop
    ? `glass-modal-mask ${wrapClassName || ''}`.trim()
    : wrapClassName

  return (
    <Modal
      className={classes}
      wrapClassName={backdropClass}
      {...modalProps}
    />
  )
}

export default GlassModal
