import frappe
from frappe.model.document import Document


class RACITemplate(Document):
	def on_change(self):
		"""Auto-populate tasks from Project Template when it changes"""
		if self.project_template:
			self.populate_tasks_from_template()

	def populate_tasks_from_template(self):
		"""Fetch tasks from the selected Project Template and add to RACI assignments"""
		if not self.project_template:
			return

		try:
			# Get the Project Template document
			template_doc = frappe.get_doc('Project Template', self.project_template)

			# Clear existing assignments if template changed
			self.raci_assignments = []

			# Add tasks from the template
			if template_doc.tasks:
				for task_row in template_doc.tasks:
					if task_row.task:
						# Get task details
						try:
							task_doc = frappe.get_doc('Task', task_row.task)
							self.append('raci_assignments', {
								'task_link': task_row.task,
								'task_name': task_doc.subject or task_row.task
							})
						except frappe.DoesNotExistError:
							# If task doesn't exist, just use the task ID as name
							self.append('raci_assignments', {
								'task_link': task_row.task,
								'task_name': task_row.subject or task_row.task
							})
		except frappe.DoesNotExistError:
			frappe.msgprint(f'Project Template {self.project_template} not found')
