/**
 * Projects API Service Tests
 * Tests for Task Type grouping functionality
 */

import projectsService from '../projects.js'
import { mockTaskTypes, mockTasksByProject } from '../mockData.js'

// Test helper to verify color coding
const verifyColorCoding = (percent, expectedColor) => {
  if (percent <= 33) return expectedColor === 'red'
  if (percent <= 66) return expectedColor === 'gold'
  return expectedColor === 'green'
}

// Test 1: getTaskTypeSummary returns correctly grouped and ordered data
async function testGetTaskTypeSummary() {
  console.log('\n=== Test 1: getTaskTypeSummary ===')
  
  try {
    const result = await projectsService.getTaskTypeSummary('proj-001')
    
    console.log('✓ API call successful')
    console.log('Response:', JSON.stringify(result, null, 2))
    
    // Verify structure
    if (!result.success) {
      console.error('✗ Expected success: true')
      return false
    }
    console.log('✓ Response has success: true')
    
    if (!Array.isArray(result.data)) {
      console.error('✗ Expected data to be an array')
      return false
    }
    console.log('✓ Data is an array')
    
    // Verify ordering by custom_priority
    const priorities = result.data.map(g => g.custom_priority)
    const sortedPriorities = [...priorities].sort((a, b) => a - b)
    if (JSON.stringify(priorities) !== JSON.stringify(sortedPriorities)) {
      console.error('✗ Data is not sorted by custom_priority')
      console.error('  Got:', priorities)
      console.error('  Expected:', sortedPriorities)
      return false
    }
    console.log('✓ Data is sorted by custom_priority:', priorities)
    
    // Verify each group has required fields
    for (const group of result.data) {
      if (!group.taskType || !group.name || group.custom_priority === undefined) {
        console.error('✗ Group missing required fields:', group)
        return false
      }
      if (typeof group.total !== 'number' || typeof group.completed !== 'number') {
        console.error('✗ Group has invalid total/completed:', group)
        return false
      }
      if (!group.completionRate || !group.color) {
        console.error('✗ Group missing completionRate or color:', group)
        return false
      }
      
      // Verify color coding
      if (!verifyColorCoding(group.percent, group.color)) {
        console.error('✗ Invalid color for percent:', group.percent, group.color)
        return false
      }
    }
    console.log('✓ All groups have required fields and correct color coding')
    
    // Verify task counts
    const planningGroup = result.data.find(g => g.name === 'Planning')
    if (planningGroup) {
      console.log('✓ Planning group found:', planningGroup)
      // From mockData, proj-001 has 1 Planning task (T-001, Completed)
      if (planningGroup.total !== 1 || planningGroup.completed !== 1) {
        console.error('✗ Planning group has incorrect counts')
        console.error('  Expected: total=1, completed=1')
        console.error('  Got:', planningGroup)
        return false
      }
      console.log('✓ Planning group has correct counts')
    }
    
    return true
  } catch (error) {
    console.error('✗ Test failed with error:', error)
    return false
  }
}

// Test 2: getTasksByType returns correct filtered list
async function testGetTasksByType() {
  console.log('\n=== Test 2: getTasksByType ===')
  
  try {
    const result = await projectsService.getTasksByType('proj-001', 'Development')
    
    console.log('✓ API call successful')
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (!result.success) {
      console.error('✗ Expected success: true')
      return false
    }
    console.log('✓ Response has success: true')
    
    if (!Array.isArray(result.data)) {
      console.error('✗ Expected data to be an array')
      return false
    }
    console.log('✓ Data is an array')
    
    // Verify all tasks are of type 'Development'
    for (const task of result.data) {
      if (task.task_type !== 'Development') {
        console.error('✗ Task has wrong task_type:', task)
        return false
      }
    }
    console.log('✓ All tasks have task_type: Development')
    
    // From mockData, proj-001 has 1 Development task (T-004)
    if (result.data.length !== 1) {
      console.error('✗ Expected 1 Development task, got:', result.data.length)
      return false
    }
    console.log('✓ Correct number of Development tasks')
    
    const task = result.data[0]
    if (task.id !== 'T-004' || task.subject !== 'API endpoints v1') {
      console.error('✗ Wrong task returned:', task)
      return false
    }
    console.log('✓ Correct task returned:', task.subject)
    
    return true
  } catch (error) {
    console.error('✗ Test failed with error:', error)
    return false
  }
}

// Test 3: Color coding logic
async function testColorCoding() {
  console.log('\n=== Test 3: Color Coding Logic ===')
  
  try {
    const result = await projectsService.getTaskTypeSummary('proj-001')
    
    const testCases = [
      { percent: 0, expected: 'red' },
      { percent: 33, expected: 'red' },
      { percent: 34, expected: 'gold' },
      { percent: 50, expected: 'gold' },
      { percent: 66, expected: 'gold' },
      { percent: 67, expected: 'green' },
      { percent: 100, expected: 'green' }
    ]
    
    for (const tc of testCases) {
      if (!verifyColorCoding(tc.percent, tc.expected)) {
        console.error(`✗ Color coding failed for ${tc.percent}%: expected ${tc.expected}`)
        return false
      }
    }
    console.log('✓ Color coding logic is correct')
    
    // Verify actual groups have correct colors
    for (const group of result.data) {
      if (!verifyColorCoding(group.percent, group.color)) {
        console.error('✗ Group has incorrect color:', group)
        return false
      }
    }
    console.log('✓ All groups have correct colors based on their percentages')
    
    return true
  } catch (error) {
    console.error('✗ Test failed with error:', error)
    return false
  }
}

// Test 4: Mock data integration
async function testMockDataIntegration() {
  console.log('\n=== Test 4: Mock Data Integration ===')
  
  try {
    // Verify mockTaskTypes exists
    if (!mockTaskTypes || !Array.isArray(mockTaskTypes)) {
      console.error('✗ mockTaskTypes is not defined or not an array')
      return false
    }
    console.log('✓ mockTaskTypes exists:', mockTaskTypes.length, 'types')
    
    // Verify mockTasksByProject exists
    if (!mockTasksByProject || typeof mockTasksByProject !== 'object') {
      console.error('✗ mockTasksByProject is not defined or not an object')
      return false
    }
    console.log('✓ mockTasksByProject exists')
    
    // Verify proj-001 has tasks
    if (!mockTasksByProject['proj-001'] || !Array.isArray(mockTasksByProject['proj-001'])) {
      console.error('✗ mockTasksByProject[proj-001] is not defined or not an array')
      return false
    }
    console.log('✓ proj-001 has', mockTasksByProject['proj-001'].length, 'tasks')
    
    // Verify all tasks have task_type field
    for (const task of mockTasksByProject['proj-001']) {
      if (!task.task_type) {
        console.error('✗ Task missing task_type field:', task)
        return false
      }
    }
    console.log('✓ All tasks have task_type field')
    
    return true
  } catch (error) {
    console.error('✗ Test failed with error:', error)
    return false
  }
}

// Test 5: Error handling
async function testErrorHandling() {
  console.log('\n=== Test 5: Error Handling ===')
  
  try {
    // Test with non-existent project
    const result = await projectsService.getTaskTypeSummary('non-existent-project')
    
    console.log('✓ API call completed for non-existent project')
    console.log('Response:', JSON.stringify(result, null, 2))
    
    // Should still return success with empty groups
    if (!result.success) {
      console.error('✗ Expected success: true even for non-existent project')
      return false
    }
    console.log('✓ Returns success: true for non-existent project')
    
    // Should return all task types with 0 tasks
    if (!Array.isArray(result.data)) {
      console.error('✗ Expected data to be an array')
      return false
    }
    console.log('✓ Returns array of task types')
    
    // All groups should have total: 0
    for (const group of result.data) {
      if (group.total !== 0) {
        console.error('✗ Expected total: 0 for non-existent project, got:', group)
        return false
      }
    }
    console.log('✓ All groups have total: 0 for non-existent project')
    
    return true
  } catch (error) {
    console.error('✗ Test failed with error:', error)
    return false
  }
}

// Run all tests
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║         Projects API Service Test Suite                   ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  
  const tests = [
    { name: 'getTaskTypeSummary', fn: testGetTaskTypeSummary },
    { name: 'getTasksByType', fn: testGetTasksByType },
    { name: 'Color Coding Logic', fn: testColorCoding },
    { name: 'Mock Data Integration', fn: testMockDataIntegration },
    { name: 'Error Handling', fn: testErrorHandling }
  ]
  
  const results = []
  
  for (const test of tests) {
    const passed = await test.fn()
    results.push({ name: test.name, passed })
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                    Test Results                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  
  let passCount = 0
  let failCount = 0
  
  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL'
    console.log(`${status}: ${result.name}`)
    if (result.passed) passCount++
    else failCount++
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`)
  console.log('='.repeat(60))
  
  return failCount === 0
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  window.runProjectsApiTests = runAllTests
}

export { runAllTests }

