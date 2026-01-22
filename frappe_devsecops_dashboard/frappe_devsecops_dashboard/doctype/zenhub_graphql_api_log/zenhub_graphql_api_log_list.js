// Copyright (c) 2026, Salim and contributors
// License: MIT

frappe.listview_settings['Zenhub GraphQL API Log'] = {
	// Add color indicators based on status
	get_indicator: function(doc) {
		const status_colors = {
			'Success': 'green',
			'Failed': 'red',
			'Partial Success': 'orange',
			'Timeout': 'yellow',
			'Error': 'red'
		};

		return [__(doc.status), status_colors[doc.status] || 'gray', 'status,=,' + doc.status];
	},

	// Format columns
	formatters: {
		http_status_code: function(value) {
			if (!value) return '';

			let color = 'green';
			if (value >= 400 && value < 500) color = 'orange';
			else if (value >= 500) color = 'red';

			return `<span class="indicator-pill ${color}">${value}</span>`;
		},

		response_time_ms: function(value) {
			if (!value) return '';

			let color = 'green';
			if (value > 1000) color = 'red';
			else if (value > 500) color = 'orange';

			return `<span style="color: ${color === 'green' ? '#28a745' : color === 'orange' ? '#fd7e14' : '#dc3545'}">${value}ms</span>`;
		},

		graphql_operation: function(value) {
			return `<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${value}</code>`;
		}
	},

	// Add custom buttons
	onload: function(listview) {
		// Add filter for last 24 hours
		listview.page.add_inner_button(__('Last 24 Hours'), function() {
			const yesterday = frappe.datetime.add_days(frappe.datetime.now_datetime(), -1);
			listview.filter_area.add([[
				'Zenhub GraphQL API Log',
				'creation',
				'>=',
				yesterday
			]]);
		});

		// Add filter for failed operations
		listview.page.add_inner_button(__('Failed Operations'), function() {
			listview.filter_area.add([[
				'Zenhub GraphQL API Log',
				'status',
				'in',
				['Failed', 'Error', 'Timeout']
			]]);
		});

		// Add filter for successful operations
		listview.page.add_inner_button(__('Successful'), function() {
			listview.filter_area.add([[
				'Zenhub GraphQL API Log',
				'status',
				'=',
				'Success'
			]]);
		});
	},

	// Hide certain columns by default
	hide_name_column: false,

	// Add custom filters
	filters: [
		['status', '=', 'Success']
	],

	// Primary action
	primary_action: function() {
		frappe.new_doc('Zenhub GraphQL API Log');
	}
};
