// Copyright (c) 2025, Salim and contributors
// For license information, please see license.txt

frappe.ui.form.on('Change Request', {
	// refresh: function(frm) {

	// }
});

// List View Settings for Change Request
frappe.listview_settings['Change Request'] = {
	add_fields: [
		'title', 'cr_number', 'submission_date', 'project',
		'system_affected', 'change_category', 'approval_status',
		'workflow_state', 'originator_name', 'incident'
	],

	// Default sort: newest first
	order_by: 'submission_date desc',

	// Color-coded indicators for approval status
	get_indicator: function(doc) {
		// Priority 1: Show user's personal status if they're an approver
		if (doc._my_approval_status && doc._my_approval_status.is_approver) {
			const status = doc._my_approval_status.status;
			if (status === 'Pending') {
				return [__('⏳ Pending My Action'), 'red', ''];
			} else if (status === 'Approved') {
				return [__('✓ Approved By Me'), 'green', ''];
			} else if (status === 'Rejected') {
				return [__('✗ Rejected By Me'), 'orange', ''];
			}
		}

		// Priority 2: Show overall CR approval status
		const status_colors = {
			'Pending Review': 'orange',
			'Rework': 'red',
			'Not Accepted': 'darkgrey',
			'Withdrawn': 'grey',
			'Deferred': 'blue',
			'Approved for Implementation': 'green'
		};

		const color = status_colors[doc.approval_status] || 'blue';
		return [__(doc.approval_status), color, 'approval_status,=,' + doc.approval_status];
	},

	// Custom buttons and data enrichment
	onload: function(listview) {
		// Track active filter and prevent race conditions
		let active_filter = null;
		let enrichment_in_progress = false;
		let enrichment_timeout = null;
		let last_enriched_hash = null;

		// Function to enrich list data with user-specific approval status
		function enrich_with_approval_status(listview) {
			// Cancel pending enrichment (debouncing)
			if (enrichment_timeout) {
				clearTimeout(enrichment_timeout);
			}

			// Debounce: wait 100ms for rapid changes
			enrichment_timeout = setTimeout(function() {
				// Check if already in progress (prevent race conditions)
				if (enrichment_in_progress) {
					return;
				}

				// Collect CR names from current page
				const cr_names = listview.data.map(d => d.name);

				if (cr_names.length === 0) return;

				// Create hash to detect stale responses
				const current_hash = cr_names.sort().join(',');

				// Skip if already enriched with same data
				if (last_enriched_hash === current_hash) {
					return;
				}

				// Store current page's CR names to detect stale responses
				const expected_cr_names = JSON.stringify(cr_names.sort());

				enrichment_in_progress = true;

				// Show subtle loading indicator
				listview.$result.find('.list-row').css('opacity', '0.6');

				// Fetch approval status for all visible CRs
				frappe.call({
					method: 'frappe_devsecops_dashboard.api.change_request.get_my_approval_status_batch',
					args: {
						change_request_names: JSON.stringify(cr_names)
					},
					callback: function(r) {
						enrichment_in_progress = false;

						// Restore opacity
						listview.$result.find('.list-row').css('opacity', '1');

						// Verify response is still relevant (prevent race condition issues)
						const now_cr_names = JSON.stringify(
							listview.data.map(d => d.name).sort()
						);

						if (now_cr_names !== expected_cr_names) {
							console.log('Stale enrichment response, ignoring');
							return;
						}

						if (r.message && r.message.success) {
							// Inject into list data
							listview.data.forEach(doc => {
								doc._my_approval_status = r.message.data[doc.name] || {
									is_approver: false,
									status: null
								};
							});

							// Update hash to prevent redundant enrichment
							last_enriched_hash = current_hash;

							// Re-render list with enriched data (use render_list to avoid loops)
							listview.render_list();
						}
					},
					error: function(err) {
						enrichment_in_progress = false;
						// Restore opacity
						listview.$result.find('.list-row').css('opacity', '1');
						console.error('Error fetching approval status:', err);
						// Graceful degradation - list view still works without enrichment
					}
				});
			}, 100);
		}

		// Function to load filtered list with pagination support
		function load_filtered_list(listview, special_filter, start) {
			start = start || 0;

			// Show loading indicator
			frappe.freeze(__('Loading Change Requests...'));

			frappe.call({
				method: 'frappe_devsecops_dashboard.api.change_request.get_change_requests_filtered',
				args: {
					special_filter: special_filter,
					limit_start: start,
					limit_page_length: listview.page_length || 20
				},
				callback: function(r) {
					frappe.unfreeze();

					if (r.message && r.message.success) {
						listview.data = r.message.data;
						listview.total_count = r.message.total || r.message.data.length;
						listview.render();
						// Enrich with approval status
						enrich_with_approval_status(listview);
					}
				},
				error: function(err) {
					frappe.unfreeze();
					console.error('Error loading filtered list:', err);
					frappe.msgprint({
						title: __('Error'),
						indicator: 'red',
						message: __('Failed to load filtered Change Requests')
					});
				}
			});
		}

		// Store original refresh function
		const original_refresh = listview.refresh.bind(listview);

		// Override refresh to maintain filter state across pagination
		listview.refresh = function() {
			if (active_filter) {
				// Maintain filter during pagination
				const start = listview.start || 0;
				load_filtered_list(listview, active_filter, start);
			} else {
				// Use default refresh for "All Requests"
				original_refresh();
			}
		};

		// Add "Pending My Action" filter button
		listview.page.add_inner_button(__('Pending My Action'), function() {
			active_filter = 'pending_my_action';
			listview.start = 0;  // Reset to first page
			load_filtered_list(listview, 'pending_my_action', 0);
		}, __('Filters'));

		// Add "Approved By Me" filter button
		listview.page.add_inner_button(__('Approved By Me'), function() {
			active_filter = 'approved_by_me';
			listview.start = 0;  // Reset to first page
			load_filtered_list(listview, 'approved_by_me', 0);
		}, __('Filters'));

		// Add "All Requests" filter button
		listview.page.add_inner_button(__('All Requests'), function() {
			active_filter = null;
			listview.start = 0;  // Reset to first page
			listview.refresh();
		}, __('Filters'));

		// Enrich data when list loads (using namespaced event for cleanup)
		listview.$result.on('render-complete.cr_enrichment', function() {
			// Only enrich if data hash changed (prevent loops)
			const current_hash = listview.data.map(d => d.name).join(',');
			if (last_enriched_hash !== current_hash) {
				enrich_with_approval_status(listview);
			}
		});

		// Add cleanup on destroy to prevent memory leaks
		if (listview.on_destroy) {
			const original_destroy = listview.on_destroy.bind(listview);
			listview.on_destroy = function() {
				// Remove event listeners
				listview.$result.off('render-complete.cr_enrichment');

				// Clear any pending timeouts
				if (enrichment_timeout) {
					clearTimeout(enrichment_timeout);
				}

				// Call original destroy
				original_destroy();
			};
		} else {
			listview.on_destroy = function() {
				listview.$result.off('render-complete.cr_enrichment');
				if (enrichment_timeout) {
					clearTimeout(enrichment_timeout);
				}
			};
		}

		// Initial enrichment (only once, not via setTimeout to avoid race)
		enrich_with_approval_status(listview);
	}
};
