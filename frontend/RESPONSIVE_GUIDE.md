# Mobile Responsive Design Guide

This guide outlines the responsive design system implemented for the Frappe Avaza dashboard and provides guidelines for adding new components.

## Breakpoint System

We use Ant Design's standard breakpoints:

- **xs**: 0px - 575px (Mobile phones)
- **sm**: 576px - 767px (Large phones, small tablets)
- **md**: 768px - 991px (Tablets)
- **lg**: 992px - 1199px (Small desktops)
- **xl**: 1200px - 1599px (Large desktops)
- **xxl**: 1600px+ (Extra large screens)

## Responsive Hook

Use the `useResponsive` hook for dynamic responsive behavior:

```jsx
import { useResponsive, getResponsiveGrid } from '../hooks/useResponsive'

function MyComponent() {
  const { isMobile, isTablet, isDesktop, currentBreakpoint } = useResponsive()
  const gridConfig = getResponsiveGrid(currentBreakpoint)
  
  return (
    <Row gutter={gridConfig.gutter}>
      {/* Your content */}
    </Row>
  )
}
```

## CSS Classes for Responsive Design

### Mobile-First Utilities

- `.mobile-stack`: Stacks items vertically on mobile, horizontally on larger screens
- `.mobile-center`: Centers content on mobile, left-aligns on larger screens
- `.mobile-full-width`: Full width on mobile, auto width on larger screens

### Usage Example

```jsx
<div className="mobile-stack">
  <Icon />
  <div className="mobile-center">
    <div className="metric-value">42</div>
    <div className="metric-label">Active Projects</div>
  </div>
</div>
```

## Grid System Guidelines

### Column Spans

Use responsive column spans for different screen sizes:

```jsx
// Metrics cards: Full width on mobile, half on tablet, third on desktop
<Col xs={24} sm={12} lg={8}>
  <Card>...</Card>
</Col>

// Main content: Full width on mobile/tablet, 2/3 on desktop
<Col xs={24} lg={16}>
  <MainContent />
</Col>

// Sidebar: Full width on mobile/tablet, 1/3 on desktop
<Col xs={24} lg={8}>
  <Sidebar />
</Col>
```

### Lifecycle Phases

For lifecycle phase indicators:

```jsx
// Responsive grid for lifecycle phases
<Col xs={6} sm={4} md={3}>
  <div className="lifecycle-step">
    <Icon />
    <span>PHASE</span>
  </div>
</Col>
```

## Typography Scaling

Font sizes automatically scale based on screen size:

- **Metric Values**: 24px (mobile) → 28px (tablet) → 32px (desktop)
- **Metric Labels**: 12px (mobile) → 14px (tablet+)
- **Card Titles**: 16px (consistent)
- **Body Text**: 11px-13px (responsive)

## Component Sizing

### Cards

- **Padding**: Responsive via CSS classes and grid config
- **Margins**: Reduced on mobile (8px vs 16px)
- **Size**: Use `size="small"` prop on mobile

### Icons

- **Metric Icons**: 24px (mobile) → 28px (desktop)
- **Lifecycle Icons**: 12px (consistent)
- **UI Icons**: Standard Ant Design sizes

## Adding New Responsive Components

### 1. Use the Responsive Hook

```jsx
import { useResponsive, getResponsiveGrid } from '../hooks/useResponsive'

function NewComponent() {
  const { isMobile, currentBreakpoint } = useResponsive()
  const gridConfig = getResponsiveGrid(currentBreakpoint)
  
  // Component logic
}
```

### 2. Implement Responsive Grid

```jsx
<Row gutter={gridConfig.gutter}>
  <Col xs={24} sm={12} md={8} lg={6}>
    {/* Responsive column */}
  </Col>
</Row>
```

### 3. Add Mobile-Specific Styling

```jsx
<Card 
  size={isMobile ? "small" : "default"}
  style={{ 
    marginBottom: isMobile ? 8 : 16 
  }}
>
  {/* Card content */}
</Card>
```

### 4. Use CSS Classes

```jsx
<div className="mobile-stack">
  <Icon style={{ fontSize: isMobile ? 20 : 24 }} />
  <div className="mobile-center">
    <Text>Content</Text>
  </div>
</div>
```

## Best Practices

### 1. Mobile-First Approach
- Design for mobile first, then enhance for larger screens
- Use progressive enhancement for features

### 2. Touch-Friendly Design
- Minimum 44px touch targets on mobile
- Adequate spacing between interactive elements

### 3. Content Priority
- Show most important content first on mobile
- Use collapsible sections for secondary content

### 4. Performance
- Optimize images and assets for mobile
- Use lazy loading for non-critical content

### 5. Testing
- Test on actual devices when possible
- Use browser dev tools for responsive testing
- Test both portrait and landscape orientations

## Common Patterns

### Metric Cards
```jsx
<Col xs={24} sm={12} lg={8}>
  <Card className="metric-card">
    <div className="mobile-stack">
      <Icon style={{ fontSize: isMobile ? 24 : 28 }} />
      <div className="mobile-center">
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
      </div>
    </div>
  </Card>
</Col>
```

### Data Lists
```jsx
<Card 
  title={<ResponsiveTitle />}
  size={isMobile ? "small" : "default"}
>
  {items.map(item => (
    <div style={{ 
      fontSize: isMobile ? 11 : 13,
      marginBottom: isMobile ? 8 : 12 
    }}>
      {item.content}
    </div>
  ))}
</Card>
```

### Action Buttons
```jsx
<Button 
  size={isMobile ? "small" : "default"}
  style={{ 
    width: isMobile ? '100%' : 'auto' 
  }}
>
  Action
</Button>
```

This responsive system ensures consistent behavior across all screen sizes and provides a solid foundation for future component development.
