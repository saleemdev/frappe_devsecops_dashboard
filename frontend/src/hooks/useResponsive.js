import { useState, useEffect } from 'react'

// Ant Design breakpoints
const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600
}

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })

  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({ width, height })

      // Determine current breakpoint
      if (width >= breakpoints.xxl) {
        setCurrentBreakpoint('xxl')
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl')
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg')
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md')
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm')
      } else {
        setCurrentBreakpoint('xs')
      }
    }

    // Set initial values
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = currentBreakpoint === 'xs'
  const isTablet = currentBreakpoint === 'sm' || currentBreakpoint === 'md'
  const isDesktop = currentBreakpoint === 'lg' || currentBreakpoint === 'xl' || currentBreakpoint === 'xxl'
  const isSmallScreen = isMobile || isTablet

  return {
    screenSize,
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    breakpoints
  }
}

// Utility function for responsive values
export const getResponsiveValue = (values, breakpoint) => {
  const orderedBreakpoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
  const currentIndex = orderedBreakpoints.indexOf(breakpoint)
  
  // Find the appropriate value for current breakpoint or closest smaller one
  for (let i = currentIndex; i >= 0; i--) {
    const bp = orderedBreakpoints[i]
    if (values[bp] !== undefined) {
      return values[bp]
    }
  }
  
  // Fallback to the first available value
  return Object.values(values)[0]
}

// Responsive grid configurations
export const getResponsiveGrid = (breakpoint) => {
  const configs = {
    xs: { gutter: [8, 8], cardPadding: 12 },
    sm: { gutter: [12, 12], cardPadding: 16 },
    md: { gutter: [16, 16], cardPadding: 20 },
    lg: { gutter: [20, 20], cardPadding: 24 },
    xl: { gutter: [24, 24], cardPadding: 24 },
    xxl: { gutter: [24, 24], cardPadding: 24 }
  }
  
  return configs[breakpoint] || configs.lg
}
