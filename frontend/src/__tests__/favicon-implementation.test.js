/**
 * Favicon Implementation Tests for DevSecOps Dashboard
 * Tests favicon files, HTML meta tags, and PWA manifest
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const publicDir = join(__dirname, '../../public')
const indexHtmlPath = join(__dirname, '../../index.html')

describe('Favicon Implementation Tests', () => {
  test('favicon files exist in public directory', () => {
    const faviconFiles = [
      'favicon.svg',
      'favicon-16x16.svg',
      'favicon-32x32.svg',
      'apple-touch-icon.svg',
      'manifest.json'
    ]

    faviconFiles.forEach(file => {
      const filePath = join(publicDir, file)
      expect(existsSync(filePath)).toBe(true)
    })
  })

  test('favicon SVG files contain proper DOD DevSecOps branding', () => {
    const faviconPath = join(publicDir, 'favicon.svg')
    const faviconContent = readFileSync(faviconPath, 'utf8')

    // Check for security/military themed elements
    expect(faviconContent).toContain('shield')
    expect(faviconContent).toContain('#1890ff') // Primary blue color
    expect(faviconContent).toContain('circle') // Security elements
    expect(faviconContent).toContain('fill="white"') // Contrast elements
  })

  test('apple touch icon has appropriate size and branding', () => {
    const appleTouchIconPath = join(publicDir, 'apple-touch-icon.svg')
    const iconContent = readFileSync(appleTouchIconPath, 'utf8')

    // Check dimensions
    expect(iconContent).toContain('width="180"')
    expect(iconContent).toContain('height="180"')
    
    // Check for rounded corners (iOS style)
    expect(iconContent).toContain('rx="40"')
    
    // Check for branding elements
    expect(iconContent).toContain('#1890ff')
    expect(iconContent).toContain('shield')
  })

  test('manifest.json contains correct PWA configuration', () => {
    const manifestPath = join(publicDir, 'manifest.json')
    const manifestContent = readFileSync(manifestPath, 'utf8')
    const manifest = JSON.parse(manifestContent)

    // Check basic PWA properties
    expect(manifest.name).toBe('DOD DevSecOps Dashboard')
    expect(manifest.short_name).toBe('DevSecOps')
    expect(manifest.description).toContain('Department of Defense DevSecOps')
    expect(manifest.start_url).toBe('/devsecops-ui')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#1890ff')
    expect(manifest.background_color).toBe('#ffffff')

    // Check icons array
    expect(manifest.icons).toHaveLength(4)
    expect(manifest.icons[0].src).toBe('/favicon-16x16.svg')
    expect(manifest.icons[1].src).toBe('/favicon-32x32.svg')
    expect(manifest.icons[2].src).toBe('/favicon.svg')
    expect(manifest.icons[3].src).toBe('/apple-touch-icon.svg')

    // Check categories
    expect(manifest.categories).toContain('productivity')
    expect(manifest.categories).toContain('business')
    expect(manifest.categories).toContain('utilities')
  })

  test('index.html contains proper favicon references', () => {
    const htmlContent = readFileSync(indexHtmlPath, 'utf8')

    // Check favicon links
    expect(htmlContent).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />')
    expect(htmlContent).toContain('<link rel="icon" type="image/svg+xml" sizes="16x16" href="/favicon-16x16.svg" />')
    expect(htmlContent).toContain('<link rel="icon" type="image/svg+xml" sizes="32x32" href="/favicon-32x32.svg" />')
    expect(htmlContent).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.svg" />')

    // Check manifest link
    expect(htmlContent).toContain('<link rel="manifest" href="/manifest.json" />')
  })

  test('index.html has correct title and metadata', () => {
    const htmlContent = readFileSync(indexHtmlPath, 'utf8')

    // Check title
    expect(htmlContent).toContain('<title>DOD DevSecOps Dashboard</title>')

    // Check meta description
    expect(htmlContent).toContain('DOD DevSecOps Dashboard - Comprehensive project management')
    expect(htmlContent).toContain('Department of Defense DevSecOps initiatives')

    // Check theme color
    expect(htmlContent).toContain('<meta name="theme-color" content="#1890ff" />')

    // Check viewport for mobile responsiveness
    expect(htmlContent).toContain('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')

    // Check Open Graph metadata
    expect(htmlContent).toContain('<meta property="og:title" content="DOD DevSecOps Dashboard" />')
    expect(htmlContent).toContain('<meta property="og:description" content="Comprehensive project management and security monitoring for Department of Defense DevSecOps initiatives" />')
    expect(htmlContent).toContain('<meta property="og:type" content="website" />')
    expect(htmlContent).toContain('<meta property="og:image" content="/apple-touch-icon.svg" />')

    // Check Twitter Card metadata
    expect(htmlContent).toContain('<meta name="twitter:card" content="summary" />')
    expect(htmlContent).toContain('<meta name="twitter:title" content="DOD DevSecOps Dashboard" />')
    expect(htmlContent).toContain('<meta name="twitter:description" content="Comprehensive project management and security monitoring for Department of Defense DevSecOps initiatives" />')
    expect(htmlContent).toContain('<meta name="twitter:image" content="/apple-touch-icon.svg" />')
  })

  test('no references to old Avaza branding remain', () => {
    const htmlContent = readFileSync(indexHtmlPath, 'utf8')

    // Ensure no Avaza references
    expect(htmlContent).not.toContain('Avaza')
    expect(htmlContent).not.toContain('avaza')
    expect(htmlContent).not.toContain('Frappe Avaza')
  })

  test('favicon SVG files are valid SVG format', () => {
    const svgFiles = [
      'favicon.svg',
      'favicon-16x16.svg',
      'favicon-32x32.svg',
      'apple-touch-icon.svg'
    ]

    svgFiles.forEach(file => {
      const filePath = join(publicDir, file)
      const content = readFileSync(filePath, 'utf8')

      // Check basic SVG structure
      expect(content).toMatch(/^<svg[^>]*>/)
      expect(content).toContain('</svg>')
      expect(content).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(content).toContain('viewBox=')
    })
  })

  test('favicon colors match DOD DevSecOps theme', () => {
    const faviconPath = join(publicDir, 'favicon.svg')
    const faviconContent = readFileSync(faviconPath, 'utf8')

    // Check for primary theme colors
    expect(faviconContent).toContain('#1890ff') // Primary blue
    expect(faviconContent).toContain('#0050b3') // Darker blue for borders
    expect(faviconContent).toContain('#52c41a') // Green for DevOps elements
    expect(faviconContent).toContain('fill="white"') // White for contrast
  })

  test('apple touch icon has iOS-appropriate design', () => {
    const appleTouchIconPath = join(publicDir, 'apple-touch-icon.svg')
    const iconContent = readFileSync(appleTouchIconPath, 'utf8')

    // Check for iOS-specific design elements
    expect(iconContent).toContain('rx="40"') // Rounded corners
    expect(iconContent).toContain('width="180"') // Standard iOS size
    expect(iconContent).toContain('height="180"')
    
    // Should have larger, more visible elements for mobile
    expect(iconContent).toContain('r="12"') // Larger security elements
    expect(iconContent).toContain('r="8"') // Larger DevOps indicators
  })

  test('manifest.json is valid JSON', () => {
    const manifestPath = join(publicDir, 'manifest.json')
    const manifestContent = readFileSync(manifestPath, 'utf8')

    // Should parse without errors
    expect(() => JSON.parse(manifestContent)).not.toThrow()

    const manifest = JSON.parse(manifestContent)
    
    // Check required PWA fields
    expect(typeof manifest.name).toBe('string')
    expect(typeof manifest.short_name).toBe('string')
    expect(typeof manifest.start_url).toBe('string')
    expect(typeof manifest.display).toBe('string')
    expect(Array.isArray(manifest.icons)).toBe(true)
  })

  test('favicon sizes are appropriate for different use cases', () => {
    const sizeTests = [
      { file: 'favicon-16x16.svg', expectedSize: '16' },
      { file: 'favicon-32x32.svg', expectedSize: '32' },
      { file: 'apple-touch-icon.svg', expectedSize: '180' }
    ]

    sizeTests.forEach(({ file, expectedSize }) => {
      const filePath = join(publicDir, file)
      const content = readFileSync(filePath, 'utf8')

      expect(content).toContain(`width="${expectedSize}"`)
      expect(content).toContain(`height="${expectedSize}"`)
    })
  })

  test('all favicon files contain security-themed imagery', () => {
    const faviconFiles = [
      'favicon.svg',
      'favicon-16x16.svg',
      'favicon-32x32.svg',
      'apple-touch-icon.svg'
    ]

    faviconFiles.forEach(file => {
      const filePath = join(publicDir, file)
      const content = readFileSync(filePath, 'utf8')

      // All should contain shield (security) elements
      expect(content).toContain('shield')
      
      // All should use the primary brand color
      expect(content).toContain('#1890ff')
    })
  })
})
