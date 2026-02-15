/**
 * TOIL Navigation Hook
 * Provides reliable TOIL navigation and operations
 */

import { useCallback } from 'react'
import useNavigationStore from '../stores/navigationStore'

export const useTOILNavigation = () => {
  const { navigateToRoute } = useNavigationStore()

  // Navigate to TOIL list
  const navigateToTOILList = useCallback(() => {
    navigateToRoute('timesheet-toil')
  }, [navigateToRoute])

  // Navigate to view timesheet detail
  const viewTimesheetDetail = useCallback((timesheetId) => {
    if (!timesheetId) {
      console.error('[TOILNav] viewTimesheetDetail: timesheetId is required')
      return
    }
    console.log('[TOILNav] Navigating to view timesheet:', timesheetId)
    navigateToRoute('timesheet-toil-detail', null, null, null, null, timesheetId)
  }, [navigateToRoute])

  // Navigate to create timesheet (Frappe form)
  const createTimesheet = useCallback(() => {
    console.log('[TOILNav] Navigating to create timesheet')
    window.location.href = '/app/timesheet/new'
  }, [])

  // Navigate to edit timesheet (Frappe form)
  const editTimesheet = useCallback((timesheetId) => {
    if (!timesheetId) {
      console.error('[TOILNav] editTimesheet: timesheetId is required')
      return
    }
    console.log('[TOILNav] Navigating to edit timesheet:', timesheetId)
    window.location.href = `/app/timesheet/${timesheetId}`
  }, [])

  return {
    navigateToTOILList,
    viewTimesheetDetail,
    createTimesheet,
    editTimesheet
  }
}

export default useTOILNavigation
