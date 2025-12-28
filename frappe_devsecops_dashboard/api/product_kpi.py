"""
Product KPI Dashboard API
Provides comprehensive KPI data for Software Products including linked projects,
team members, risks, change requests, and incidents.
"""

import frappe
from frappe.utils import flt
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta


@frappe.whitelist()
def get_product_kpi_data(product_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch comprehensive KPI data for a Software Product.

    Args:
        product_name: Optional name of the Software Product to filter by.
                     If None, returns data for all products.

    Returns:
        Dictionary containing:
        - success: Boolean indicating success/failure
        - data: Dictionary with projects, metrics, and chart data
        - error: Error message if failed
    """
    try:
        # 1. Get Projects linked to Software Product
        project_filters = []
        if product_name:
            project_filters.append(['custom_software_product', '=', product_name])

        projects = frappe.get_all(
            'Project',
            filters=project_filters,
            fields=[
                'name', 'project_name', 'status', 'expected_start_date',
                'expected_end_date', 'custom_software_product', 'percent_complete'
            ],
            order_by='modified desc'
        )

        # 2. Enrich each project with related data
        enriched_projects = []
        total_risks = 0
        total_change_requests = 0
        total_incidents = 0
        task_type_counts = {}
        # Enhanced: Track task status breakdown per type for bottleneck analysis
        task_type_status_breakdown = {}  # {task_type: {'total': count, 'completed': count, 'in_progress': count, 'overdue': count}}

        for project in projects:
            # Get team members from Project User child table
            team_members = frappe.get_all(
                'Project User',
                filters={'parent': project.name},
                fields=['user', 'full_name', 'email', 'custom_business_function']
            )

            # Get risks from Risk Item (child table of Risk Register)
            # First check if a Risk Register exists for this project
            risk_registers = frappe.get_all(
                'Risk Register',
                filters={'project': project.name},
                fields=['name']
            )

            risks = []
            if risk_registers:
                # Get risks from Risk Item child table
                risks = frappe.get_all(
                    'Risk Item',
                    filters={'parent': risk_registers[0].name},
                    fields=[
                        'name', 'risk_title', 'risk_category', 'probability',
                        'impact', 'risk_score', 'priority', 'status'
                    ],
                    order_by='risk_score desc'
                )

            # Get change requests
            change_requests = frappe.get_all(
                'Change Request',
                filters={'project': project.name},
                fields=[
                    'name', 'title', 'change_category', 'approval_status',
                    'submission_date', 'workflow_state'
                ],
                order_by='submission_date desc'
            )

            # Get incidents
            incidents = frappe.get_all(
                'Devsecops Dashboard Incident',
                filters={'project': project.name},
                fields=[
                    'name', 'title', 'severity', 'status',
                    'reported_date', 'assigned_to'
                ],
                order_by='reported_date desc'
            )

            # Get tasks by task type with more fields for metrics
            tasks = frappe.get_all(
                'Task',
                filters={'project': project.name},
                fields=['type', 'status', 'progress', 'exp_end_date'],
            )

            # Count tasks by type and calculate task metrics
            project_task_types = {}
            total_tasks = len(tasks)
            completed_tasks = 0
            in_progress_tasks = 0
            overdue_tasks = 0
            today = frappe.utils.today()

            for task in tasks:
                task_type = task.get('type') or 'Unclassified'
                if task_type not in project_task_types:
                    project_task_types[task_type] = 0
                project_task_types[task_type] += 1

                # Aggregate for overall chart
                if task_type not in task_type_counts:
                    task_type_counts[task_type] = 0
                task_type_counts[task_type] += 1

                # Enhanced: Track status breakdown per task type
                if task_type not in task_type_status_breakdown:
                    task_type_status_breakdown[task_type] = {
                        'total': 0,
                        'completed': 0,
                        'in_progress': 0,
                        'overdue': 0,
                        'open': 0
                    }
                task_type_status_breakdown[task_type]['total'] += 1

                # Count task statuses
                task_status = task.get('status', '')
                is_overdue = False
                exp_end_date = task.get('exp_end_date')
                if exp_end_date and task_status not in ['Completed', 'Cancelled']:
                    if frappe.utils.getdate(exp_end_date) < frappe.utils.getdate(today):
                        is_overdue = True
                        overdue_tasks += 1
                        task_type_status_breakdown[task_type]['overdue'] += 1

                if task_status == 'Completed':
                    completed_tasks += 1
                    task_type_status_breakdown[task_type]['completed'] += 1
                elif task_status in ['Open', 'Working', 'In Progress']:
                    in_progress_tasks += 1
                    if task_status == 'In Progress' or task_status == 'Working':
                        task_type_status_breakdown[task_type]['in_progress'] += 1
                    else:
                        task_type_status_breakdown[task_type]['open'] += 1

            # Calculate task completion rate
            task_completion_rate = flt((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0

            # Get project progress from project data
            project_progress = project.get('percent_complete') or 0

            # Get project manager from team members (look for business function containing 'Project Manager')
            project_manager = None
            for member in team_members:
                business_function = member.get('custom_business_function', '')
                if business_function and 'Project Manager' in business_function:
                    project_manager = member.get('full_name') or member.get('user')
                    break

            # Enrich project object
            enriched_project = {
                'name': project.get('name'),
                'project_name': project.get('project_name'),
                'status': project.get('status'),
                'project_manager': project_manager,
                'software_product': project.get('custom_software_product'),
                'expected_start_date': project.get('expected_start_date'),
                'expected_end_date': project.get('expected_end_date'),
                'team_members': team_members,
                'team_size': len(team_members),
                'risks': risks,
                'risk_count': len(risks),
                'change_requests': change_requests,
                'change_request_count': len(change_requests),
                'incidents': incidents,
                'incident_count': len(incidents),
                'task_types': project_task_types,
                # New metrics
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'overdue_tasks': overdue_tasks,
                'task_completion_rate': task_completion_rate,
                'project_progress': project_progress
            }

            enriched_projects.append(enriched_project)
            total_risks += len(risks)
            total_change_requests += len(change_requests)
            total_incidents += len(incidents)

        # 3. Calculate metrics
        active_projects_count = sum(1 for p in enriched_projects if p.get('status') == 'Active')
        completed_projects_count = sum(1 for p in enriched_projects if p.get('status') == 'Completed')

        active_risks_count = 0
        critical_risks_count = 0
        for p in enriched_projects:
            for r in p.get('risks', []):
                # Active risks are those not in 'Closed' or 'Mitigated' status
                if r.get('status') not in ['Closed', 'Mitigated']:
                    active_risks_count += 1
                    if r.get('priority') == 'Critical' or (r.get('risk_score', 0) >= 15):
                        critical_risks_count += 1

        pending_change_requests_count = 0
        approved_change_requests_count = 0
        for p in enriched_projects:
            for cr in p.get('change_requests', []):
                if cr.get('approval_status') == 'Pending':
                    pending_change_requests_count += 1
                elif cr.get('approval_status') == 'Approved':
                    approved_change_requests_count += 1

        open_incidents_count = 0
        critical_incidents_count = 0
        for p in enriched_projects:
            for inc in p.get('incidents', []):
                if inc.get('status') in ['Open', 'In Progress']:
                    open_incidents_count += 1
                    if inc.get('severity') in ['Critical', 'S1 - Critical']:
                        critical_incidents_count += 1

        # Calculate task metrics
        total_tasks_all = sum(p.get('total_tasks', 0) for p in enriched_projects)
        completed_tasks_all = sum(p.get('completed_tasks', 0) for p in enriched_projects)
        in_progress_tasks_all = sum(p.get('in_progress_tasks', 0) for p in enriched_projects)
        overdue_tasks_all = sum(p.get('overdue_tasks', 0) for p in enriched_projects)
        overall_task_completion_rate = flt((completed_tasks_all / total_tasks_all * 100), 2) if total_tasks_all > 0 else 0

        # Calculate average project progress
        project_progresses = [p.get('project_progress', 0) for p in enriched_projects if p.get('project_progress', 0) > 0]
        average_project_progress = flt(sum(project_progresses) / len(project_progresses), 2) if project_progresses else 0

        # Calculate team metrics
        total_team_members = sum(p.get('team_size', 0) for p in enriched_projects)
        unique_team_members = set()
        for p in enriched_projects:
            for member in p.get('team_members', []):
                unique_team_members.add(member.get('user'))
        unique_team_count = len(unique_team_members)

        # Calculate stakeholder metrics
        # Delivery timeline metrics
        today_date = frappe.utils.getdate(frappe.utils.today())
        on_time_projects = 0
        delayed_projects = 0
        total_project_duration_days = 0
        completed_project_duration_days = 0
        
        for project in enriched_projects:
            expected_end = project.get('expected_end_date')
            if expected_end:
                expected_end_date = frappe.utils.getdate(expected_end)
                if project.get('status') == 'Completed':
                    actual_end = project.get('actual_end_date')
                    if actual_end:
                        actual_end_date = frappe.utils.getdate(actual_end)
                        if actual_end_date <= expected_end_date:
                            on_time_projects += 1
                        else:
                            delayed_projects += 1
                        # Calculate duration
                        start_date = project.get('expected_start_date') or project.get('actual_start_date')
                        if start_date:
                            start = frappe.utils.getdate(start_date)
                            duration = (actual_end_date - start).days
                            completed_project_duration_days += duration
                    else:
                        # Completed but no actual end date, use expected
                        start_date = project.get('expected_start_date')
                        if start_date:
                            start = frappe.utils.getdate(start_date)
                            duration = (expected_end_date - start).days
                            completed_project_duration_days += duration
                elif project.get('status') == 'Active':
                    # Check if overdue
                    if expected_end_date < today_date:
                        delayed_projects += 1
                    else:
                        on_time_projects += 1
                    # Calculate planned duration
                    start_date = project.get('expected_start_date') or project.get('actual_start_date')
                    if start_date:
                        start = frappe.utils.getdate(start_date)
                        duration = (expected_end_date - start).days
                        total_project_duration_days += duration

        total_tracked_projects = on_time_projects + delayed_projects
        on_time_delivery_rate = flt((on_time_projects / total_tracked_projects * 100), 2) if total_tracked_projects > 0 else 0
        average_project_duration = flt(completed_project_duration_days / completed_projects_count, 2) if completed_projects_count > 0 else 0

        # Team health metrics
        # Calculate average tasks per team member (workload indicator)
        avg_tasks_per_member = flt(total_tasks_all / unique_team_count, 2) if unique_team_count > 0 else 0

        # Quality metrics - use incidents as proxy for defects
        total_incidents_for_quality = sum(p.get('incident_count', 0) for p in enriched_projects)
        defect_rate = flt((total_incidents_for_quality / total_tasks_all * 100), 2) if total_tasks_all > 0 else 0

        metrics = {
            'total_projects': len(enriched_projects),
            'active_projects': active_projects_count,
            'completed_projects': completed_projects_count,
            'total_risks': total_risks,
            'active_risks': active_risks_count,
            'critical_risks': critical_risks_count,
            'total_change_requests': total_change_requests,
            'pending_change_requests': pending_change_requests_count,
            'approved_change_requests': approved_change_requests_count,
            'total_incidents': total_incidents,
            'open_incidents': open_incidents_count,
            'critical_incidents': critical_incidents_count,
            # New task metrics
            'total_tasks': total_tasks_all,
            'completed_tasks': completed_tasks_all,
            'in_progress_tasks': in_progress_tasks_all,
            'overdue_tasks': overdue_tasks_all,
            'task_completion_rate': overall_task_completion_rate,
            'average_project_progress': average_project_progress,
            # Team metrics
            'total_team_members': total_team_members,
            'unique_team_members': unique_team_count,
            # Stakeholder metrics
            'on_time_delivery_rate': on_time_delivery_rate,
            'delayed_projects': delayed_projects,
            'on_time_projects': on_time_projects,
            'average_project_duration_days': average_project_duration,
            'avg_tasks_per_member': avg_tasks_per_member,
            'defect_rate': defect_rate,
            # Stakeholder metrics
            'on_time_delivery_rate': on_time_delivery_rate,
            'delayed_projects': delayed_projects,
            'on_time_projects': on_time_projects,
            'average_project_duration_days': average_project_duration,
            'avg_tasks_per_member': avg_tasks_per_member,
            'defect_rate': defect_rate
        }

        # 4. Prepare chart data
        status_counts = {}
        for project in enriched_projects:
            status = project.get('status', 'Unknown')
            status_counts[status] = status_counts.get(status, 0) + 1

        project_status_chart = [
            {'status': status, 'count': count}
            for status, count in status_counts.items()
        ]

        # Enhanced task type chart with status breakdown for bottleneck analysis
        task_type_chart = []
        for task_type, count in task_type_counts.items():
            breakdown = task_type_status_breakdown.get(task_type, {})
            completed = breakdown.get('completed', 0)
            in_progress = breakdown.get('in_progress', 0)
            overdue = breakdown.get('overdue', 0)
            open_count = breakdown.get('open', 0)
            completion_rate = flt((completed / count * 100), 2) if count > 0 else 0
            overdue_rate = flt((overdue / count * 100), 2) if count > 0 else 0
            
            task_type_chart.append({
                'task_type': task_type,
                'count': count,
                'completed': completed,
                'in_progress': in_progress,
                'overdue': overdue,
                'open': open_count,
                'completion_rate': completion_rate,
                'overdue_rate': overdue_rate
            })

        # Product comparison chart (if multiple products)
        product_comparison_chart = []
        if not product_name:
            # Get product manager info for all products
            product_manager_map = {}
            for project in enriched_projects:
                product_id = project.get('software_product')
                if product_id and product_id not in product_manager_map:
                    try:
                        product_doc = frappe.get_doc('Software Product', product_id)
                        product_manager_id = product_doc.get('product_manager')
                        if product_manager_id:
                            try:
                                user = frappe.get_doc('User', product_manager_id)
                                product_manager_map[product_id] = {
                                    'id': user.name,
                                    'full_name': user.full_name or user.name
                                }
                            except frappe.DoesNotExistError:
                                product_manager_map[product_id] = {
                                    'id': product_manager_id,
                                    'full_name': product_manager_id
                                }
                        else:
                            product_manager_map[product_id] = None
                    except frappe.DoesNotExistError:
                        product_manager_map[product_id] = None
            
            # Group projects by product
            products_dict = {}
            for project in enriched_projects:
                product = project.get('software_product') or 'Unassigned'
                if product not in products_dict:
                    manager_info = product_manager_map.get(product)
                    products_dict[product] = {
                        'project_count': 0,
                        'total_tasks': 0,
                        'completed_tasks': 0,
                        'active_risks': 0,
                        'open_incidents': 0,
                        'product_manager': manager_info['full_name'] if manager_info else None,
                        'product_manager_id': manager_info['id'] if manager_info else None
                    }
                products_dict[product]['project_count'] += 1
                products_dict[product]['total_tasks'] += project.get('total_tasks', 0)
                products_dict[product]['completed_tasks'] += project.get('completed_tasks', 0)
                products_dict[product]['active_risks'] += project.get('risk_count', 0)
                products_dict[product]['open_incidents'] += project.get('incident_count', 0)

            # Enhanced Product Comparison with Health Scores
            product_comparison_chart = []
            for product, data in products_dict.items():
                # Calculate health score (0-100) based on multiple factors
                total_tasks = data['total_tasks']
                completed_tasks = data['completed_tasks']
                active_risks = data['active_risks']
                open_incidents = data['open_incidents']
                project_count = data['project_count']
                
                # Task completion rate (0-40 points)
                task_completion_rate = (completed_tasks / total_tasks * 40) if total_tasks > 0 else 0
                
                # Risk score (0-30 points) - lower risks = higher score
                risk_score = max(0, 30 - (active_risks * 2)) if active_risks <= 15 else 0
                
                # Incident score (0-20 points) - lower incidents = higher score
                incident_score = max(0, 20 - (open_incidents * 2)) if open_incidents <= 10 else 0
                
                # Project activity score (0-10 points) - more projects = higher score (capped)
                project_score = min(10, project_count * 2)
                
                health_score = flt(task_completion_rate + risk_score + incident_score + project_score, 2)
                
                # Calculate delivery rate (on-time projects / total projects for this product)
                product_projects = [p for p in enriched_projects if p.get('software_product') == product]
                on_time_count = 0
                delayed_count = 0
                for proj in product_projects:
                    if proj.get('status') == 'Completed':
                        expected_end = proj.get('expected_end_date')
                        actual_end = proj.get('actual_end_date')
                        if expected_end and actual_end:
                            expected = frappe.utils.getdate(expected_end)
                            actual = frappe.utils.getdate(actual_end)
                            if actual <= expected:
                                on_time_count += 1
                            else:
                                delayed_count += 1
                
                total_tracked = on_time_count + delayed_count
                delivery_rate = flt((on_time_count / total_tracked * 100), 2) if total_tracked > 0 else 0
                
                product_comparison_chart.append({
                    'product': product,
                    'project_count': data['project_count'],
                    'total_tasks': data['total_tasks'],
                    'completed_tasks': data['completed_tasks'],
                    'active_risks': data['active_risks'],
                    'open_incidents': data['open_incidents'],
                    'product_manager': data.get('product_manager'),
                    'product_manager_id': data.get('product_manager_id'),
                    'health_score': health_score,
                    'delivery_rate': delivery_rate,
                    'task_completion_rate': flt((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0
                })

        # Enhanced Risk Analysis - Priority, Score Distribution, Mitigation Status
        risk_priority_counts = {}
        risk_score_distribution = {'0-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21+': 0}
        risk_mitigation_status = {'Open': 0, 'Mitigated': 0, 'Closed': 0, 'Monitoring': 0}
        
        for p in enriched_projects:
            for r in p.get('risks', []):
                # Priority counts
                priority = r.get('priority') or 'Unknown'
                risk_priority_counts[priority] = risk_priority_counts.get(priority, 0) + 1
                
                # Score distribution
                score = r.get('risk_score', 0) or 0
                if score <= 5:
                    risk_score_distribution['0-5'] += 1
                elif score <= 10:
                    risk_score_distribution['6-10'] += 1
                elif score <= 15:
                    risk_score_distribution['11-15'] += 1
                elif score <= 20:
                    risk_score_distribution['16-20'] += 1
                else:
                    risk_score_distribution['21+'] += 1
                
                # Mitigation status
                status = r.get('status') or 'Open'
                if status in ['Mitigated', 'Closed']:
                    risk_mitigation_status[status] = risk_mitigation_status.get(status, 0) + 1
                elif status in ['Monitoring', 'Watching']:
                    risk_mitigation_status['Monitoring'] = risk_mitigation_status.get('Monitoring', 0) + 1
                else:
                    risk_mitigation_status['Open'] = risk_mitigation_status.get('Open', 0) + 1

        risk_priority_chart = [
            {'priority': priority, 'count': count}
            for priority, count in risk_priority_counts.items()
        ]
        
        risk_score_chart = [
            {'score_range': range_name, 'count': count}
            for range_name, count in risk_score_distribution.items()
        ]
        
        risk_mitigation_chart = [
            {'status': status, 'count': count}
            for status, count in risk_mitigation_status.items() if count > 0
        ]

        # Enhanced Incident Analysis - Severity, Resolution Status, MTTR (Mean Time To Resolution)
        incident_severity_counts = {}
        incident_resolution_status = {'Open': 0, 'In Progress': 0, 'Resolved': 0, 'Closed': 0}
        incident_resolution_times = []  # Track resolution times for MTTR calculation
        
        for p in enriched_projects:
            for inc in p.get('incidents', []):
                # Severity counts
                severity = inc.get('severity') or 'Unknown'
                incident_severity_counts[severity] = incident_severity_counts.get(severity, 0) + 1
                
                # Resolution status
                status = inc.get('status') or 'Open'
                if status in ['Resolved', 'Closed']:
                    incident_resolution_status[status] = incident_resolution_status.get(status, 0) + 1
                elif status == 'In Progress':
                    incident_resolution_status['In Progress'] = incident_resolution_status.get('In Progress', 0) + 1
                else:
                    incident_resolution_status['Open'] = incident_resolution_status.get('Open', 0) + 1
                
                # Calculate resolution time if resolved
                if status in ['Resolved', 'Closed']:
                    reported_date = inc.get('reported_date')
                    resolved_date = inc.get('resolved_date') or inc.get('modified')
                    if reported_date and resolved_date:
                        try:
                            reported = frappe.utils.getdate(reported_date)
                            resolved = frappe.utils.getdate(resolved_date)
                            resolution_hours = (resolved - reported).total_seconds() / 3600
                            if resolution_hours > 0:
                                incident_resolution_times.append(resolution_hours)
                        except:
                            pass

        incident_severity_chart = [
            {'severity': severity, 'count': count}
            for severity, count in incident_severity_counts.items()
        ]
        
        incident_resolution_chart = [
            {'status': status, 'count': count}
            for status, count in incident_resolution_status.items() if count > 0
        ]
        
        # Calculate MTTR (Mean Time To Resolution) in hours
        mttr_hours = sum(incident_resolution_times) / len(incident_resolution_times) if incident_resolution_times else 0
        mttr_days = flt(mttr_hours / 24, 2) if mttr_hours > 0 else 0

        return {
            'success': True,
            'data': {
                'projects': enriched_projects,
                'metrics': metrics,
                'charts': {
                    'project_status': project_status_chart,
                    'task_types': task_type_chart,
                    'product_comparison': product_comparison_chart,
                    'risk_priority': risk_priority_chart,
                    'risk_score_distribution': risk_score_chart,
                    'risk_mitigation_status': risk_mitigation_chart,
                    'incident_severity': incident_severity_chart,
                    'incident_resolution_status': incident_resolution_chart
                },
                'advanced_metrics': {
                    'mttr_hours': mttr_hours,
                    'mttr_days': mttr_days,
                    'total_resolved_incidents': len(incident_resolution_times)
                }
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in get_product_kpi_data: {str(e)}", "Product KPI API Error")
        return {
            'success': False,
            'error': str(e),
            'data': None
        }


@frappe.whitelist()
def get_software_products_for_filter() -> Dict[str, Any]:
    """
    Get list of Software Products that have linked projects.

    Returns:
        Dictionary containing:
        - success: Boolean indicating success/failure
        - data: List of products with project counts
        - error: Error message if failed
    """
    try:
        products = frappe.get_all(
            'Software Product',
            fields=['name', 'product_name', 'status', 'product_manager'],
            order_by='product_name asc'
        )

        # Filter to only products with projects and enrich with product manager info
        products_with_projects = []
        for product in products:
            project_count = frappe.db.count('Project', {'custom_software_product': product.get('name')})
            if project_count > 0:
                product_manager_id = product.get('product_manager')
                product_manager_name = None
                product_manager_full_name = None
                
                # Get product manager full name if exists
                if product_manager_id:
                    try:
                        user = frappe.get_doc('User', product_manager_id)
                        product_manager_name = user.name
                        product_manager_full_name = user.full_name or user.name
                    except frappe.DoesNotExistError:
                        product_manager_name = product_manager_id
                        product_manager_full_name = product_manager_id
                
                products_with_projects.append({
                    'name': product.get('name'),
                    'product_name': product.get('product_name'),
                    'status': product.get('status'),
                    'project_count': project_count,
                    'product_manager': product_manager_name,
                    'product_manager_full_name': product_manager_full_name
                })

        return {
            'success': True,
            'data': products_with_projects
        }

    except Exception as e:
        frappe.log_error(f"Error in get_software_products_for_filter: {str(e)}", "Product KPI API Error")
        return {
            'success': False,
            'error': str(e),
            'data': []
        }
