/**
 * useZenhubMetrics Hook
 *
 * Calculates and memoizes metrics from issues data.
 * Provides:
 * - Completion rate
 * - Story point summaries
 * - Blocker count
 * - Status distribution
 */

import { useMemo } from 'react'

export function useZenhubMetrics(issues = []) {
  return useMemo(() => {
    const totalIssues = issues.length
    const closedIssues = issues.filter(i => i.state === 'CLOSED').length
    const inProgressIssues = issues.filter(i => i.state === 'IN_PROGRESS').length
    const openIssues = issues.filter(i => i.state === 'OPEN').length

    // Calculate story points
    const totalStoryPoints = issues.reduce(
      (sum, issue) => sum + (issue.estimate?.value || 0),
      0
    )

    const completedPoints = issues
      .filter(i => i.state === 'CLOSED')
      .reduce((sum, issue) => sum + (issue.estimate?.value || 0), 0)

    const inProgressPoints = issues
      .filter(i => i.state === 'IN_PROGRESS')
      .reduce((sum, issue) => sum + (issue.estimate?.value || 0), 0)

    // Calculate completion rates
    const issueCompletionRate = totalIssues > 0
      ? parseFloat(((closedIssues / totalIssues) * 100).toFixed(1))
      : 0

    const pointCompletionRate = totalStoryPoints > 0
      ? parseFloat(((completedPoints / totalStoryPoints) * 100).toFixed(1))
      : 0

    // Count blockers
    const blockedIssues = issues.filter(
      issue => issue.blockingItems?.nodes && issue.blockingItems.nodes.length > 0
    ).length

    // Count by status
    const statusDistribution = {
      OPEN: openIssues,
      IN_PROGRESS: inProgressIssues,
      CLOSED: closedIssues
    }

    // Identify high-risk items (no estimate, blocked)
    const unestimatedIssues = issues.filter(i => !i.estimate?.value).length

    return {
      // Counts
      totalIssues,
      closedIssues,
      inProgressIssues,
      openIssues,
      blockedIssues,
      unestimatedIssues,

      // Story points
      totalStoryPoints,
      completedPoints,
      inProgressPoints,
      remainingPoints: totalStoryPoints - completedPoints - inProgressPoints,

      // Rates
      issueCompletionRate,
      pointCompletionRate,

      // Distribution
      statusDistribution,

      // Status summary text
      statusText: `${closedIssues}/${totalIssues} completed`,
      pointsText: `${completedPoints}/${totalStoryPoints} points`
    }
  }, [issues])
}
