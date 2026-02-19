import { test, expect } from '@playwright/test'

type AnyRow = Record<string, any>
const APP_ENTRY = '/assets/frappe_devsecops_dashboard/frontend/index.html'

const json = async (route: any, payload: any) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ message: payload })
  })
}

test.describe('TOIL Browser Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'sid',
        value: 'playwright-session',
        domain: 'devsecops.io',
        path: '/'
      }
    ])

    await page.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
      ;(window as any).csrf_token = 'playwright-csrf-token'
    })
  })

  test('approve team request sends stable API contract', async ({ page }) => {
    let lastApprovalPayload: AnyRow | null = null

    const myTimesheets: AnyRow[] = [
      {
        name: 'TS-TOIL-0001',
        employee: 'EMP-0001',
        employee_name: 'QA Engineer',
        start_date: '2026-02-10',
        end_date: '2026-02-10',
        total_hours: 10,
        total_toil_hours: 2,
        toil_days: 0.25,
        docstatus: 0,
        toil_status: 'Pending Accrual',
        creation: '2026-02-11 09:00:00'
      }
    ]

    const supervisorRows: AnyRow[] = [...myTimesheets]

    await page.route('**/api/method/**', async (route) => {
      const url = route.request().url()

      if (url.includes('frappe.auth.get_logged_user')) {
        await json(route, 'qa.supervisor@example.com')
        return
      }

      if (url.includes('toil.validation_api.validate_employee_setup')) {
        await json(route, {
          success: true,
          valid: true,
          employee: 'EMP-0001',
          employee_name: 'QA Engineer',
          supervisor: 'EMP-0002',
          supervisor_name: 'QA Supervisor',
          supervisor_user: 'qa.supervisor@example.com',
          issues: []
        })
        return
      }

      if (url.includes('toil.validation_api.get_user_role')) {
        await json(route, { success: true, role: 'supervisor', employee: 'EMP-0002', subordinates_count: 1 })
        return
      }

      if (url.includes('toil.balance_api.get_toil_balance_for_leave')) {
        await json(route, {
          success: true,
          data: {
            employee: 'EMP-0001',
            employee_name: 'QA Engineer',
            available: 1.5,
            total: 2.0,
            used: 0.5,
            expiring_soon: 0.0,
            allocations: []
          }
        })
        return
      }

      if (url.includes('toil.balance_api.get_leave_ledger')) {
        await json(route, { success: true, data: [], total: 0 })
        return
      }

      if (url.includes('toil.timesheet_api.get_my_timesheets')) {
        await json(route, { success: true, data: myTimesheets, total: myTimesheets.length })
        return
      }

      if (url.includes('toil.timesheet_api.get_timesheets_to_approve')) {
        await json(route, {
          success: true,
          data: supervisorRows,
          total: supervisorRows.length,
          pending_total: supervisorRows.length
        })
        return
      }

      if (url.includes('toil.timesheet_api.set_timesheet_approval')) {
        const body = route.request().postDataJSON() as AnyRow
        lastApprovalPayload = body

        const idx = supervisorRows.findIndex((row) => row.name === body.timesheet_name)
        if (idx >= 0) {
          supervisorRows.splice(idx, 1)
        }

        await json(route, {
          success: true,
          message: 'Timesheet submitted. TOIL accrual is processing.',
          data: {
            name: body.timesheet_name,
            toil_status: 'Pending Accrual',
            docstatus: 1
          }
        })
        return
      }

      await json(route, { success: true, data: [] })
    })

    await page.goto(`${APP_ENTRY}#timesheet-toil`)
    await expect(page.getByRole('heading', { name: 'Timesheet (TOIL Record)' })).toBeVisible()
    await expect(page.getByText('Pending Accrual').first()).toBeVisible()

    await page.getByRole('tab', { name: /Team Requests/i }).click()
    await expect(page.getByRole('button', { name: 'Approve / Reject' })).toBeVisible()
    await page.getByRole('button', { name: 'Approve / Reject' }).click()
    await page.getByRole('button', { name: 'Approve' }).click()

    await expect.poll(() => lastApprovalPayload?.status).toBe('approved')
    await expect.poll(() => lastApprovalPayload?.timesheet_name).toBe('TS-TOIL-0001')
  })

  test('reject team request uses reason and unified status semantics', async ({ page }) => {
    let lastApprovalPayload: AnyRow | null = null

    const supervisorRows: AnyRow[] = [
      {
        name: 'TS-TOIL-0002',
        employee: 'EMP-0003',
        employee_name: 'Backend Engineer',
        start_date: '2026-02-12',
        end_date: '2026-02-12',
        total_hours: 11,
        total_toil_hours: 3,
        toil_days: 0.375,
        docstatus: 0,
        toil_status: 'Pending Accrual',
        creation: '2026-02-13 11:00:00'
      }
    ]

    await page.route('**/api/method/**', async (route) => {
      const url = route.request().url()

      if (url.includes('frappe.auth.get_logged_user')) {
        await json(route, 'qa.supervisor@example.com')
        return
      }
      if (url.includes('toil.validation_api.validate_employee_setup')) {
        await json(route, { success: true, valid: true, issues: [] })
        return
      }
      if (url.includes('toil.validation_api.get_user_role')) {
        await json(route, { success: true, role: 'supervisor', subordinates_count: 1 })
        return
      }
      if (url.includes('toil.balance_api.get_toil_balance_for_leave')) {
        await json(route, { success: true, data: { available: 2.0, total: 2.0, used: 0 } })
        return
      }
      if (url.includes('toil.balance_api.get_leave_ledger')) {
        await json(route, { success: true, data: [], total: 0 })
        return
      }
      if (url.includes('toil.timesheet_api.get_my_timesheets')) {
        await json(route, { success: true, data: [], total: 0 })
        return
      }
      if (url.includes('toil.timesheet_api.get_timesheets_to_approve')) {
        await json(route, { success: true, data: supervisorRows, total: supervisorRows.length, pending_total: supervisorRows.length })
        return
      }
      if (url.includes('toil.timesheet_api.set_timesheet_approval')) {
        const body = route.request().postDataJSON() as AnyRow
        lastApprovalPayload = body
        await json(route, {
          success: true,
          message: 'Timesheet rejected',
          data: {
            name: body.timesheet_name,
            toil_status: 'Rejected',
            docstatus: 0
          }
        })
        return
      }

      await json(route, { success: true, data: [] })
    })

    await page.goto(`${APP_ENTRY}#timesheet-toil`)
    await page.getByRole('tab', { name: /Team Requests/i }).click()
    await page.getByRole('button', { name: 'Approve / Reject' }).click()
    await page.getByLabel(/Rejection Reason/i).fill('Timesheet entries overlap with existing records.')
    await page.getByRole('button', { name: 'Reject' }).click()

    await expect.poll(() => lastApprovalPayload?.status).toBe('rejected')
    await expect.poll(() => lastApprovalPayload?.reason).toContain('overlap')
  })

  test('reject requires reason before API submit', async ({ page }) => {
    let approvalCalls = 0
    const supervisorRows: AnyRow[] = [
      {
        name: 'TS-TOIL-0003',
        employee: 'EMP-0004',
        employee_name: 'QA Analyst',
        start_date: '2026-02-13',
        end_date: '2026-02-13',
        total_hours: 9,
        total_toil_hours: 1,
        toil_days: 0.125,
        docstatus: 0,
        toil_status: 'Pending Accrual',
        creation: '2026-02-14 10:00:00'
      }
    ]

    await page.route('**/api/method/**', async (route) => {
      const url = route.request().url()
      if (url.includes('frappe.auth.get_logged_user')) return json(route, 'qa.supervisor@example.com')
      if (url.includes('toil.validation_api.validate_employee_setup')) return json(route, { success: true, valid: true, issues: [] })
      if (url.includes('toil.validation_api.get_user_role')) return json(route, { success: true, role: 'supervisor', subordinates_count: 1 })
      if (url.includes('toil.balance_api.get_toil_balance_for_leave')) return json(route, { success: true, data: { available: 1.0, total: 1.0, used: 0 } })
      if (url.includes('toil.balance_api.get_leave_ledger')) return json(route, { success: true, data: [], total: 0 })
      if (url.includes('toil.timesheet_api.get_my_timesheets')) return json(route, { success: true, data: [], total: 0 })
      if (url.includes('toil.timesheet_api.get_timesheets_to_approve')) return json(route, { success: true, data: supervisorRows, total: 1, pending_total: 1 })
      if (url.includes('toil.timesheet_api.set_timesheet_approval')) {
        approvalCalls += 1
        return json(route, { success: true, message: 'Timesheet rejected', data: { name: 'TS-TOIL-0003', toil_status: 'Rejected' } })
      }
      return json(route, { success: true, data: [] })
    })

    await page.goto(`${APP_ENTRY}#timesheet-toil`)
    await page.getByRole('tab', { name: /Team Requests/i }).click()
    await page.getByRole('button', { name: 'Approve / Reject' }).click()
    await page.getByRole('button', { name: 'Reject' }).click()

    await expect.poll(() => approvalCalls).toBe(0)
    await expect(page.getByText('Rejection reason is required')).toBeVisible()
  })
})
