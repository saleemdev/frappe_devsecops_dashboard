"""
Test script to diagnose Zenhub assignees issue

Usage:
    bench --site desk.kns.co.ke execute frappe_devsecops_dashboard.test_assignees.test_assignees --args "['PROJECT_ID']"
"""

import frappe
import json


def test_assignees(project_id):
    """Test assignees fetching and display results"""
    from frappe_devsecops_dashboard.api.zenhub import get_sprint_data

    print(f"\n{'='*80}")
    print(f"Testing Zenhub Assignees for Project: {project_id}")
    print(f"{'='*80}\n")

    # Fetch sprint data with force refresh
    result = get_sprint_data(project_id, force_refresh=True)

    if not result.get("success"):
        print(f"❌ Error: {result.get('error')}")
        return

    print(f"✅ Successfully fetched data")
    print(f"Workspace ID: {result.get('workspace_id')}")
    print(f"Workspace Name: {result.get('workspace_name')}")
    print(f"Cached: {result.get('_cached', False)}")
    print(f"\nNumber of sprints: {len(result.get('sprints', []))}")

    for idx, sprint in enumerate(result.get('sprints', [])):
        print(f"\n{'-'*80}")
        print(f"Sprint {idx + 1}: {sprint.get('sprint_name')}")
        print(f"Sprint State: {sprint.get('state')}")

        issues = sprint.get('issues', [])
        print(f"Total Issues: {len(issues)}")

        # Sample first 3 issues
        for i, issue in enumerate(issues[:3]):
            print(f"\n  Issue {i + 1}:")
            print(f"    ID: {issue.get('issue_id')}")
            print(f"    Title: {issue.get('title')}")
            print(f"    Status: {issue.get('status')}")
            print(f"    Story Points: {issue.get('story_points')}")

            assignees = issue.get('assignees', [])
            print(f"    Assignees Count: {len(assignees)}")

            if assignees:
                for j, assignee in enumerate(assignees):
                    print(f"      Assignee {j + 1}:")
                    print(f"        ID: {assignee.get('id', 'N/A')}")
                    print(f"        Name: {assignee.get('name', 'N/A')}")
                    print(f"        Username: {assignee.get('username', 'N/A')}")
            else:
                print(f"      ⚠️  No assignees found for this issue")

        # Count issues with/without assignees
        with_assignees = sum(1 for issue in issues if issue.get('assignees'))
        without_assignees = len(issues) - with_assignees

        print(f"\n  Summary:")
        print(f"    Issues with assignees: {with_assignees}")
        print(f"    Issues without assignees: {without_assignees}")

        if without_assignees > 0:
            print(f"\n  ⚠️  {without_assignees} issues have null assignees!")
            print(f"  This could mean:")
            print(f"    1. Issues are unassigned in Zenhub")
            print(f"    2. GraphQL query is not fetching assignees correctly")
            print(f"    3. Assignees data structure has changed")

    print(f"\n{'='*80}")
    print(f"Test Complete")
    print(f"{'='*80}\n")

    # Check error log for diagnostics
    print("\nCheck the Error Log in Frappe for:")
    print("  - 'Zenhub Assignees Debug' - shows raw assignee data")
    print("  - 'Zenhub Empty Assignees' - shows issues with empty assignees")
    print("  - 'GitHub User Fetch Error' - shows GitHub API issues")


if __name__ == "__main__":
    # For manual testing
    import sys
    if len(sys.argv) > 1:
        test_assignees(sys.argv[1])
    else:
        print("Usage: python test_assignees.py PROJECT_ID")
