import React, { useEffect, useRef, useState } from 'react'
import { Button, Space, Tooltip } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  ClearOutlined
} from '@ant-design/icons'
import './RichTextEditor.css'

/**
 * RichTextEditor component for Ant Design Form integration
 * Uses contentEditable div with custom toolbar
 * Compatible with React 19 (no external dependencies like React Quill)
 */
const RichTextEditor = React.forwardRef(({ value = '', onChange, placeholder = '', readOnly = false }, ref) => {
  const editorRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  // Set initial content
  useEffect(() => {
    if (editorRef.current && value) {
      editorRef.current.innerHTML = value
    }
  }, [])

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain')
    document.execCommand('insertHTML', false, text)
  }

  return (
    <div className="rich-text-editor-wrapper">
      <div className="rich-text-toolbar">
        <Space size="small" wrap>
          <Tooltip title="Bold (Ctrl+B)">
            <Button
              size="small"
              type="text"
              icon={<BoldOutlined />}
              onClick={() => execCommand('bold')}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
          <Tooltip title="Italic (Ctrl+I)">
            <Button
              size="small"
              type="text"
              icon={<ItalicOutlined />}
              onClick={() => execCommand('italic')}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
          <Tooltip title="Underline (Ctrl+U)">
            <Button
              size="small"
              type="text"
              icon={<UnderlineOutlined />}
              onClick={() => execCommand('underline')}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
          <Tooltip title="Strikethrough">
            <Button
              size="small"
              type="text"
              icon={<StrikethroughOutlined />}
              onClick={() => execCommand('strikethrough')}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
          <div className="toolbar-divider" />
          <Tooltip title="Bullet List">
            <Button
              size="small"
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => execCommand('insertUnorderedList')}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
          <Tooltip title="Numbered List">
            <Button
              size="small"
              type="text"
              icon={<OrderedListOutlined />}
              onClick={() => execCommand('insertOrderedList')}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
          <div className="toolbar-divider" />
          <Tooltip title="Insert Link">
            <Button
              size="small"
              type="text"
              icon={<LinkOutlined />}
              onClick={insertLink}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
          <Tooltip title="Clear Formatting">
            <Button
              size="small"
              type="text"
              icon={<ClearOutlined />}
              onClick={() => execCommand('removeFormat')}
              onMouseDown={(e) => e.preventDefault()}
            />
          </Tooltip>
        </Space>
      </div>
      <div
        ref={editorRef}
        className={`rich-text-editor ${isFocused ? 'focused' : ''}`}
        contentEditable={!readOnly}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={handlePaste}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />
    </div>
  )
})

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor

