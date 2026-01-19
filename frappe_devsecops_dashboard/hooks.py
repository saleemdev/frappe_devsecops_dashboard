app_name = "frappe_devsecops_dashboard"
app_title = "Frappe Devsecops Dashboard"
app_publisher = "Salim"
app_description = "Frappe app to leverage ERPNext project to render DOD devsecops dashboard"
app_email = "dsmwaura@gmailcom"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/frappe_devsecops_dashboard/css/frappe_devsecops_dashboard.css"
# app_include_js = "/assets/frappe_devsecops_dashboard/js/frappe_devsecops_dashboard.js"

# include js, css files in header of web template
# web_include_css = "/assets/frappe_devsecops_dashboard/css/frappe_devsecops_dashboard.css"
# web_include_js = "/assets/frappe_devsecops_dashboard/js/frappe_devsecops_dashboard.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "frappe_devsecops_dashboard/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
home_page = "index"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "frappe_devsecops_dashboard.utils.jinja_methods",
# 	"filters": "frappe_devsecops_dashboard.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "frappe_devsecops_dashboard.install.before_install"
# after_install = "frappe_devsecops_dashboard.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "frappe_devsecops_dashboard.uninstall.before_uninstall"
# after_uninstall = "frappe_devsecops_dashboard.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "frappe_devsecops_dashboard.utils.before_app_install"
# after_app_install = "frappe_devsecops_dashboard.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "frappe_devsecops_dashboard.utils.before_app_uninstall"
# after_app_uninstall = "frappe_devsecops_dashboard.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "frappe_devsecops_dashboard.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Software Product": {
		"before_save": "frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.handle_software_product_zenhub_workspace"
	},
	"Project": {
		"before_save": "frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.project_extension.project_extension.on_project_before_save"
	},
	"Task": {
		"before_save": "frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.task_extension.task_extension.on_task_before_save"
	}
}

# Scheduled Tasks
# ---------------

scheduler_events = {
	"cron": {
		"0 */4 * * *": [
			"frappe_devsecops_dashboard.api.change_request_reminders.send_approval_reminders"
		]
	}
}

# Testing
# -------

# before_tests = "frappe_devsecops_dashboard.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "frappe_devsecops_dashboard.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "frappe_devsecops_dashboard.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["frappe_devsecops_dashboard.utils.before_request"]
# after_request = ["frappe_devsecops_dashboard.utils.after_request"]

# Job Events
# ----------
# before_job = ["frappe_devsecops_dashboard.utils.before_job"]
# after_job = ["frappe_devsecops_dashboard.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"frappe_devsecops_dashboard.auth.validate"
# ]

# Whitelisted API Methods
# -----------------------
# Methods that can be called via HTTP API without authentication

whitelisted_methods = [
	"frappe_devsecops_dashboard.api.dashboard.get_dashboard_data",
	"frappe_devsecops_dashboard.api.dashboard.get_project_details",
	# ZenHub Integration API Methods
	"frappe_devsecops_dashboard.api.zenhub.get_sprint_data",
	"frappe_devsecops_dashboard.api.zenhub.get_workspace_issues",
	"frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report",
	"frappe_devsecops_dashboard.api.zenhub.get_workspace_summary",
	"frappe_devsecops_dashboard.api.zenhub.get_project_summary",
	"frappe_devsecops_dashboard.api.zenhub.get_task_summary",
	# ZenHub Workspace API Methods
	"frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary",
	"frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project",
	"frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic",
	"frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization",
	"frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary_with_filters",
	# ZenHub Project Creation Methods
	"frappe_devsecops_dashboard.api.zenhub_workspace_setup.setup_product_workspace",
	"frappe_devsecops_dashboard.api.zenhub_workspace_setup.test_create_project_in_workspace"
]

# Build hooks for frontend assets
# --------------------------------
build_hooks = {
	"before_build": "frappe_devsecops_dashboard.build.before_build",
	"after_build": "frappe_devsecops_dashboard.build.after_build"
}

# Migration hooks
# ---------------
# Run frontend build after migrations to ensure assets are always up-to-date
after_migrate = [
	"frappe_devsecops_dashboard.fixtures.add_zenhub_workspace_field.add_zenhub_workspace_field",
	"frappe_devsecops_dashboard.fixtures.migrate_software_product_zenhub_field.migrate_software_product_zenhub_field",
	"frappe_devsecops_dashboard.fixtures.add_zenhub_fields_to_product.add_zenhub_project_field_to_project",
	"frappe_devsecops_dashboard.build.run_frontend_build",
	"frappe_devsecops_dashboard.fixtures.add_zenhub_menu.add_zenhub_dashboard_menu"
]

# Website Route Rules
# -------------------
# Override default login page with custom login UI
website_route_rules = [
	{"from_route": "/login", "to_route": "login"},
]

# CLI Commands
# -----------
commands = [
	"frappe_devsecops_dashboard.commands.setup_zenhub_workspace.setup_zenhub_workspace"
]
