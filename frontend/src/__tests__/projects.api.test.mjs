import projectsService from '../services/api/projects.js'
import mockPkg from '../services/api/mockData.js'
const { mockTaskTypes, mockTasksByProject } = mockPkg

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function run() {
  const results = { passed: 0, failed: 0, details: [] }

  try {
    // 1) Summary grouping and order
    const res1 = await projectsService.getTaskTypeSummary('proj-001')
    assert(res1.success, 'getTaskTypeSummary did not succeed')
    const groups = res1.data
    assert(Array.isArray(groups) && groups.length > 0, 'groups should be non-empty array')

    // order check by custom_priority
    const sorted = [...groups].map(g => g.custom_priority)
    const isNonDecreasing = sorted.every((v, i, a) => i === 0 || v >= a[i-1])
    assert(isNonDecreasing, 'groups are not ordered by custom_priority ascending')

    // 2) Completion rate and color coding
    for (const g of groups) {
      const [c, t] = g.completionRate.split('/').map(Number)
      const percent = t ? Math.round((c / t) * 100) : 0
      assert(g.percent === percent, `percent mismatch for ${g.name}: expected ${percent}, got ${g.percent}`)
      const expectedColor = percent <= 33 ? 'red' : percent <= 66 ? 'gold' : 'green'
      assert(g.color === expectedColor, `color mismatch for ${g.name}: expected ${expectedColor}, got ${g.color}`)
    }

    results.passed++
    results.details.push('getTaskTypeSummary grouping/order/color tests passed')
  } catch (e) {
    results.failed++
    results.details.push(`getTaskTypeSummary tests FAILED: ${e.message}`)
  }

  try {
    // 3) getTasksByType filtering
    const type = mockTaskTypes[0].name
    const res2 = await projectsService.getTasksByType('proj-001', type)
    assert(res2.success, 'getTasksByType did not succeed')
    const allInProject = mockTasksByProject['proj-001']
    const expected = allInProject.filter(t => String(t.task_type) === String(type))
    assert(res2.data.length === expected.length, `getTasksByType returned ${res2.data.length}, expected ${expected.length}`)
    results.passed++
    results.details.push('getTasksByType filter test passed')
  } catch (e) {
    results.failed++
    results.details.push(`getTasksByType tests FAILED: ${e.message}`)
  }

  try {
    // 4) Error handling (non-existent project)
    const res3 = await projectsService.getTaskTypeSummary('non-existent')
    // with mock data, this should still succeed but with zero totals
    const groups = res3.data
    const allZero = groups.every(g => g.total === 0 && g.completed === 0)
    assert(allZero, 'expected zero totals for non-existent project')
    results.passed++
    results.details.push('Error handling for non-existent project passed')
  } catch (e) {
    results.failed++
    results.details.push(`Error handling tests FAILED: ${e.message}`)
  }

  // Print summary and exit code
  console.log(JSON.stringify(results, null, 2))
  if (results.failed > 0) process.exit(1)
}

run().catch(err => { console.error(err); process.exit(1) })

