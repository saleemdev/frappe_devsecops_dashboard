# Glassmorphism Typography System

## Overview

The typography system has been integrated into the glassmorphism design system, using **Inter** font - a modern, highly legible typeface optimized for screens and glassmorphism effects.

---

## Font Choice: Inter

**Why Inter?**
- ✅ Designed specifically for computer screens
- ✅ Excellent readability at all sizes
- ✅ Works beautifully with transparency and blur effects
- ✅ Optimized for UI/UX applications
- ✅ Wide character set support
- ✅ Available via Google Fonts (fast loading)

---

## Typography Tokens

All typography values are centralized in CSS variables:

### Font Family
```css
--glass-font-family: 'Inter', -apple-system, BlinkMacSystemFont, ...
--glass-font-family-mono: 'SF Mono', 'Monaco', ...
```

### Font Weights
```css
--glass-font-weight-light: 300
--glass-font-weight-regular: 400
--glass-font-weight-medium: 500
--glass-font-weight-semibold: 600
--glass-font-weight-bold: 700
--glass-font-weight-extrabold: 800
```

### Font Sizes
```css
--glass-font-size-xs: 11px
--glass-font-size-sm: 12px
--glass-font-size-base: 14px
--glass-font-size-md: 16px
--glass-font-size-lg: 18px
--glass-font-size-xl: 20px
--glass-font-size-2xl: 24px
--glass-font-size-3xl: 30px
--glass-font-size-4xl: 36px
--glass-font-size-5xl: 48px
```

### Line Heights
```css
--glass-line-height-tight: 1.25
--glass-line-height-snug: 1.375
--glass-line-height-normal: 1.5
--glass-line-height-relaxed: 1.625
--glass-line-height-loose: 2
```

### Letter Spacing
```css
--glass-letter-spacing-tighter: -0.05em
--glass-letter-spacing-tight: -0.025em
--glass-letter-spacing-normal: 0
--glass-letter-spacing-wide: 0.025em
--glass-letter-spacing-wider: 0.05em
--glass-letter-spacing-widest: 0.1em
```

---

## Usage

### Automatic Application

The font is automatically applied to:
- ✅ All body text
- ✅ All headings (h1-h6)
- ✅ All Ant Design Typography components
- ✅ All components using the design system

### Using CSS Classes

```jsx
// Headings
<h1 className="glass-heading-1">Title</h1>
<h2 className="glass-heading-2">Section</h2>

// Text sizes
<p className="glass-text-lg">Large text</p>
<p className="glass-text-sm">Small text</p>
<p className="glass-text-xs">Extra small</p>

// Font weights
<span className="glass-font-medium">Medium weight</span>
<span className="glass-font-semibold">Semibold</span>
<span className="glass-font-bold">Bold</span>

// Text optimized for glass backgrounds
<div className="glass-text-on-glass">
  Text with shadow for better readability on glass
</div>
```

### Using CSS Variables

```css
.my-component {
  font-family: var(--glass-font-family);
  font-size: var(--glass-font-size-lg);
  font-weight: var(--glass-font-weight-semibold);
  line-height: var(--glass-line-height-relaxed);
}
```

---

## Features

### 1. Optimized for Glassmorphism
- Text shadows for better readability on transparent backgrounds
- Font smoothing for crisp rendering
- Optimized text rendering

### 2. Responsive
- Font sizes adjust automatically on mobile
- Maintains readability at all screen sizes

### 3. Accessibility
- High contrast mode support
- Sufficient contrast ratios
- Reduced motion support

### 4. Performance
- Font loaded from Google Fonts (CDN)
- System font fallbacks
- Optimized font loading

---

## File Structure

```
frontend/src/styles/design-system/
├── glassmorphism-tokens.css          # Typography tokens defined here
└── glassmorphism-typography.css      # Typography styles and utilities
```

---

## Integration Points

1. **Design Tokens** (`glassmorphism-tokens.css`)
   - Font family variables
   - Font size, weight, line-height, letter-spacing tokens

2. **Typography Styles** (`glassmorphism-typography.css`)
   - Global typography setup
   - Heading styles
   - Text utilities
   - Ant Design overrides

3. **Main Entry** (`design-system.css`)
   - Imports typography after tokens
   - Ensures proper cascade

4. **Global Styles** (`index.css`)
   - Body font family removed (handled by typography system)

5. **Ant Design Theme** (`App.jsx`)
   - Theme config uses `var(--glass-font-family)`

---

## Customization

### Change Font Family

Edit `glassmorphism-tokens.css`:

```css
/* Change to a different font */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

:root {
  --glass-font-family: 'Poppins', -apple-system, ...;
}
```

### Adjust Font Sizes

Edit `glassmorphism-tokens.css`:

```css
:root {
  --glass-font-size-base: 16px;  /* Change base size */
  --glass-font-size-lg: 20px;    /* Adjust large size */
}
```

### Adjust Font Weights

Edit `glassmorphism-tokens.css`:

```css
:root {
  --glass-font-weight-semibold: 600;  /* Adjust weight */
}
```

---

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Full support
- ✅ Fallback: System fonts if Inter fails to load

---

## Performance

- **Font Loading**: Google Fonts CDN (fast, cached)
- **Font Display**: `swap` (text visible immediately)
- **Font Subset**: Latin characters (smaller file size)
- **Fallback**: System fonts (no layout shift)

---

## Examples

### Headings
```jsx
<h1 className="glass-heading-1">Main Title</h1>
<h2 className="glass-heading-2">Section Header</h2>
<h3 className="glass-heading-3">Subsection</h3>
```

### Body Text
```jsx
<p className="glass-text">Regular paragraph text</p>
<p className="glass-text-lg">Large body text</p>
<p className="glass-text-sm">Small body text</p>
```

### Glass Background Text
```jsx
<div className="glass-card">
  <p className="glass-text-on-glass">
    Text optimized for glass backgrounds
  </p>
</div>
```

### Weight Variations
```jsx
<span className="glass-font-light">Light</span>
<span className="glass-font-regular">Regular</span>
<span className="glass-font-medium">Medium</span>
<span className="glass-font-semibold">Semibold</span>
<span className="glass-font-bold">Bold</span>
```

---

## Migration Notes

- ✅ All existing text automatically uses Inter font
- ✅ No breaking changes
- ✅ Ant Design Typography components use Inter
- ✅ System font fallbacks ensure compatibility

---

**Status**: Complete ✅  
**Font**: Inter  
**Integration**: Centralized in design system  
**Date**: 2026-02-19
