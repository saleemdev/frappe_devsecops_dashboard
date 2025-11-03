/**
 * Authentication Zustand Store
 * Manages user authentication state
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import apiService from '../services/api/index.js'

const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        // State
        isAuthenticated: null, // null = checking, true/false = result
        user: null,
        loading: false,
        error: null,
        permissions: {}, // Cached permissions by DocType
        permissionsLoading: false,

        // Actions
        setLoading: (loading) => set({ loading }),
        
        setError: (error) => set({ error }),
        
        clearError: () => set({ error: null }),

        /**
         * Check current authentication status
         */
        checkAuthentication: async () => {
          set({ loading: true, error: null })

          try {
            // Get current user info from API service
            const response = await apiService.auth.getCurrentUser()

            if (response.success && response.data) {
              // User is authenticated
              set({
                isAuthenticated: true,
                user: response.data,
                loading: false
              })
              return true
            } else {
              // User is not authenticated (Guest or no session)
              set({
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null
              })
              return false
            }
          } catch (error) {
            // Don't redirect on error, just set state to unauthenticated
            // This allows the app to show the UnauthorizedPage component
            set({
              isAuthenticated: false,
              user: null,
              error: error.message || 'Authentication failed',
              loading: false
            })
            return false
          }
        },

        /**
         * Login user (redirects to Frappe login)
         */
        login: () => {
          // Frappe handles login, so we redirect to the login page
          const currentUrl = window.location.href
          const loginUrl = `/login?redirect-to=${encodeURIComponent(currentUrl)}`
          window.location.href = loginUrl
        },

        /**
         * Logout user
         */
        logout: async () => {
          set({ loading: true })
          
          try {
            await apiService.auth.logout()
          } catch (error) {
            // Silently handle logout errors
          } finally {
            // Clear state regardless of API call result
            set({
              isAuthenticated: false,
              user: null,
              loading: false,
              error: null
            })
            
            // Clear all other stores
            const { useApplicationsStore } = await import('./applicationsStore.js')
            const { useIncidentsStore } = await import('./incidentsStore.js')
            const { useNavigationStore } = await import('./navigationStore.js')
            
            useApplicationsStore.getState().reset()
            useIncidentsStore.getState().reset()
            useNavigationStore.getState().reset()
          }
        },

        /**
         * Update user profile
         */
        updateUser: (userData) => set((state) => ({
          user: { ...state.user, ...userData }
        })),

        /**
         * Handle post-login redirect
         */
        handlePostLoginRedirect: () => {
          const urlParams = new URLSearchParams(window.location.search)
          const redirectTo = urlParams.get('redirect-to')
          
          if (redirectTo) {
            // Clean up URL and redirect
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash)
            window.location.href = redirectTo
          }
        },

        /**
         * Check if user has write permission for a DocType
         */
        hasWritePermission: async (doctype) => {
          try {
            const { permissions } = get()

            // Check cache first
            if (permissions[doctype]) {
              return permissions[doctype].write === true || permissions[doctype].write === 1
            }

            // Fetch from permissions service
            const { permissionsService } = await import('../services/api/index.js')
            const hasWrite = await permissionsService.hasWritePermission(doctype)

            // Cache the result
            set((state) => ({
              permissions: {
                ...state.permissions,
                [doctype]: {
                  ...state.permissions[doctype],
                  write: hasWrite
                }
              }
            }))

            return hasWrite
          } catch (error) {
            console.error(`Error checking write permission for ${doctype}:`, error)
            return false
          }
        },

        /**
         * Check if user has read permission for a DocType
         */
        hasReadPermission: async (doctype) => {
          try {
            const { permissions } = get()

            // Check cache first
            if (permissions[doctype]) {
              return permissions[doctype].read === true || permissions[doctype].read === 1
            }

            // Fetch from permissions service
            const { permissionsService } = await import('../services/api/index.js')
            const hasRead = await permissionsService.hasReadPermission(doctype)

            // Cache the result
            set((state) => ({
              permissions: {
                ...state.permissions,
                [doctype]: {
                  ...state.permissions[doctype],
                  read: hasRead
                }
              }
            }))

            return hasRead
          } catch (error) {
            console.error(`Error checking read permission for ${doctype}:`, error)
            return false
          }
        },

        /**
         * Get user permissions (legacy method for backward compatibility)
         */
        getUserPermissions: () => {
          const { user } = get()

          if (!user) return []

          // In a real implementation, this would come from the user object
          // For now, return mock permissions based on user role
          const mockPermissions = [
            'read:dashboard',
            'read:projects',
            'write:projects',
            'read:applications',
            'read:incidents',
            'write:incidents',
            'read:change-requests',
            'write:change-requests'
          ]

          return mockPermissions
        },

        /**
         * Check if user has specific permission (legacy method)
         */
        hasPermission: (permission) => {
          const permissions = get().getUserPermissions()
          return permissions.includes(permission)
        },

        /**
         * Check if user has any of the specified permissions (legacy method)
         */
        hasAnyPermission: (permissions) => {
          const userPermissions = get().getUserPermissions()
          return permissions.some(permission => userPermissions.includes(permission))
        },

        /**
         * Check if user has all of the specified permissions (legacy method)
         */
        hasAllPermissions: (permissions) => {
          const userPermissions = get().getUserPermissions()
          return permissions.every(permission => userPermissions.includes(permission))
        },

        /**
         * Reset auth state
         */
        reset: () => set({
          isAuthenticated: null,
          user: null,
          loading: false,
          error: null,
          permissions: {},
          permissionsLoading: false
        })
      }),
      {
        name: 'auth-store',
        // Only persist user data, not loading/error states
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user
        }),
        // Custom storage to handle session-based auth
        storage: {
          getItem: (name) => {
            const value = localStorage.getItem(name)
            if (value) {
              try {
                const parsed = JSON.parse(value)
                // Check if we still have valid session cookies
                const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                  const [key, val] = cookie.trim().split('=')
                  acc[key] = val
                  return acc
                }, {})
                
                // If no session cookies, clear stored auth state
                if (!cookies.sid && !cookies.user_id) {
                  localStorage.removeItem(name)
                  return null
                }
                
                return parsed
              } catch {
                return null
              }
            }
            return null
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value))
          },
          removeItem: (name) => {
            localStorage.removeItem(name)
          }
        }
      }
    ),
    {
      name: 'auth-store',
      serialize: {
        options: {
          map: {
            isAuthenticated: true,
            user: true,
            loading: true,
            error: true
          }
        }
      }
    }
  )
)

export default useAuthStore
