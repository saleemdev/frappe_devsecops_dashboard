import projectsService from '../../src/services/api/projects.js'
import { mockTaskTypes, mockTasksByProject } from '../../src/services/api/mockData.js'

describe('Projects API (browser bundling)', () => {
  it('getTaskTypeSummary returns grouped, ordered, and color-coded data', () => {
    cy.then(async () => {
      const res = await projectsService.getTaskTypeSummary('proj-001')
      expect(res.success).to.eq(true)
      const groups = res.data
      expect(groups).to.have.length.greaterThan(0)

      // Ordered by custom_priority asc
      const priorities = groups.map(g => g.custom_priority)
      const sorted = [...priorities].sort((a,b)=>a-b)
      expect(priorities).to.deep.eq(sorted)

      // Validate percent and color
      groups.forEach(g => {
        const [c, t] = g.completionRate.split('/').map(Number)
        const percent = t ? Math.round((c / t) * 100) : 0
        expect(g.percent).to.eq(percent)
        const expectedColor = percent <= 33 ? 'red' : percent <= 66 ? 'gold' : 'green'
        expect(g.color).to.eq(expectedColor)
      })
    })
  })

  it('getTasksByType returns filtered list', () => {
    cy.then(async () => {
      const type = mockTaskTypes[0].name
      const res = await projectsService.getTasksByType('proj-001', type)
      expect(res.success).to.eq(true)
      const expected = (mockTasksByProject['proj-001'] || []).filter(t => String(t.task_type) === String(type))
      expect(res.data.length).to.eq(expected.length)
    })
  })

  it('handles non-existent project gracefully (zero totals)', () => {
    cy.then(async () => {
      const res = await projectsService.getTaskTypeSummary('non-existent')
      expect(res.success).to.eq(true)
      const allZero = res.data.every(g => g.total === 0 && g.completed === 0)
      expect(allZero).to.eq(true)
    })
  })
})

