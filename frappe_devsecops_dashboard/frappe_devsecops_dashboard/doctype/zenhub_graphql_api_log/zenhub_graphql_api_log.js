// Copyright (c) 2026, Salim and contributors
// License: MIT

frappe.ui.form.on('Zenhub GraphQL API Log', {
	refresh: function(frm) {
		// Add custom button to view related document
		if (frm.doc.reference_doctype && frm.doc.reference_docname) {
			frm.add_custom_button(__('View {0}', [frm.doc.reference_doctype]), function() {
				frappe.set_route('Form', frm.doc.reference_doctype, frm.doc.reference_docname);
			});
		}

		// Add indicator colors based on status
		frm.set_indicator_formatter('status', function(doc) {
			return {
				'Success': 'green',
				'Failed': 'red',
				'Partial Success': 'orange',
				'Timeout': 'yellow',
				'Error': 'red'
			}[doc.status];
		});

		// Format HTTP status code with color
		if (frm.doc.http_status_code) {
			const status_code = frm.doc.http_status_code;
			let indicator = 'green';

			if (status_code >= 400 && status_code < 500) {
				indicator = 'orange'; // Client errors
			} else if (status_code >= 500) {
				indicator = 'red'; // Server errors
			}

			frm.set_df_property('http_status_code', 'description',
				`<span class="indicator ${indicator}">HTTP ${status_code}</span>`
			);
		}

		// Add retry button for failed operations
		if (frm.doc.status === 'Failed' || frm.doc.status === 'Error') {
			frm.add_custom_button(__('Retry Operation'), function() {
				frappe.confirm(
					__('Do you want to retry this Zenhub operation?'),
					function() {
						frappe.msgprint(__('Retry functionality would be implemented here'));
					}
				);
			}, __('Actions'));
		}
	}
});
