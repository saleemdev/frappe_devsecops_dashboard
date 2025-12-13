"""
Wiki API - Whitelisted methods for Wiki Space and Wiki Page CRUD operations
Provides backend support for the DevSecOps Wiki feature
"""

import frappe
from frappe import _
from frappe.utils import cint, md_to_html


@frappe.whitelist()
def get_wiki_spaces(filters=None, limit_start=0, limit_page_length=20):
	"""
	Get list of Wiki Spaces with optional filtering

	Args:
		filters: dict of filter conditions
		limit_start: pagination start
		limit_page_length: number of records per page

	Returns:
		list of wiki spaces with computed page_count
	"""
	try:
		filters = filters or {}
		spaces = frappe.get_list(
			"Wiki Space",
			filters=filters,
			fields=["name", "route"],
			limit_start=cint(limit_start),
			limit_page_length=cint(limit_page_length),
			order_by="modified desc"
		)

		# Enrich with page count and title
		for space in spaces:
			space['title'] = space.get('name', '')
			space['description'] = ''
			# Count pages in this space
			page_count = frappe.db.count(
				"Wiki Page",
				filters={"wiki_space": space['name']}
			)
			space['page_count'] = page_count

		return spaces
	except Exception as e:
		frappe.log_error(f"Error fetching wiki spaces: {str(e)}")
		frappe.throw(_("Failed to fetch wiki spaces"))


@frappe.whitelist()
def get_wiki_space(space_name):
	"""
	Get a specific Wiki Space with its details

	Args:
		space_name: name of the wiki space

	Returns:
		wiki space document
	"""
	try:
		space = frappe.get_doc("Wiki Space", space_name)
		frappe.has_permission("Wiki Space", "read", space_name, throw=True)
		space_dict = space.as_dict()
		space_dict['title'] = space_dict.get('name', '')
		return space_dict
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to view this wiki space"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Space not found"))


@frappe.whitelist()
def create_wiki_space(name, route, description=None):
	"""
	Create a new Wiki Space

	Args:
		name: space name/title
		route: unique route for the space
		description: optional space description

	Returns:
		created wiki space document
	"""
	try:
		frappe.has_permission("Wiki Space", "create", throw=True)

		space = frappe.new_doc("Wiki Space")
		space.name = name
		space.route = route
		if description:
			space.description = description

		space.insert()
		return space.as_dict()
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to create wiki spaces"))
	except frappe.DuplicateEntryError:
		frappe.throw(_("A wiki space with this name already exists"))
	except Exception as e:
		frappe.log_error(f"Error creating wiki space: {str(e)}")
		frappe.throw(_("Failed to create wiki space"))


@frappe.whitelist()
def update_wiki_space(name, updates):
	"""
	Update a Wiki Space

	Args:
		name: space name
		updates: dict of fields to update

	Returns:
		updated wiki space document
	"""
	try:
		frappe.has_permission("Wiki Space", "write", name, throw=True)

		space = frappe.get_doc("Wiki Space", name)
		space.update(updates)
		space.save()
		return space.as_dict()
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to update this wiki space"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Space not found"))
	except Exception as e:
		frappe.log_error(f"Error updating wiki space: {str(e)}")
		frappe.throw(_("Failed to update wiki space"))


@frappe.whitelist()
def delete_wiki_space(name):
	"""
	Delete a Wiki Space

	Args:
		name: space name

	Returns:
		success message
	"""
	try:
		frappe.has_permission("Wiki Space", "delete", name, throw=True)
		frappe.delete_doc("Wiki Space", name)
		return {"message": "Wiki space deleted successfully"}
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to delete this wiki space"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Space not found"))
	except Exception as e:
		frappe.log_error(f"Error deleting wiki space: {str(e)}")
		frappe.throw(_("Failed to delete wiki space"))


@frappe.whitelist()
def get_wiki_pages_for_space(space_name, limit_start=0, limit_page_length=20):
	"""
	Get all Wiki Pages in a specific Wiki Space

	Args:
		space_name: name of the wiki space
		limit_start: pagination start
		limit_page_length: number of records per page

	Returns:
		list of wiki pages in the space
	"""
	try:
		pages = frappe.get_list(
			"Wiki Page",
			filters={"wiki_space": space_name},
			fields=["name", "title", "route", "wiki_space", "published", "modified", "custom_linked_project", "custom_linked_project_name"],
			limit_start=cint(limit_start),
			limit_page_length=cint(limit_page_length),
			order_by="modified desc"
		)
		return pages
	except Exception as e:
		frappe.log_error(f"Error fetching wiki pages for space: {str(e)}")
		frappe.throw(_("Failed to fetch wiki pages"))


@frappe.whitelist()
def get_wiki_pages_for_project(project_name, limit_start=0, limit_page_length=20):
	"""
	Get all Wiki Pages linked to a specific Project

	Args:
		project_name: name of the project
		limit_start: pagination start
		limit_page_length: number of records per page

	Returns:
		list of wiki pages linked to the project
	"""
	try:
		pages = frappe.get_list(
			"Wiki Page",
			filters={"custom_linked_project": project_name, "published": 1},
			fields=["name", "title", "route", "custom_linked_project", "modified"],
			limit_start=cint(limit_start),
			limit_page_length=cint(limit_page_length),
			order_by="modified desc"
		)
		return pages
	except Exception as e:
		frappe.log_error(f"Error fetching wiki pages for project: {str(e)}")
		frappe.throw(_("Failed to fetch wiki pages"))


@frappe.whitelist()
def get_wiki_page(page_name):
	"""
	Get a specific Wiki Page with its content and rendered HTML

	Args:
		page_name: name of the wiki page

	Returns:
		wiki page document with html_content field
	"""
	try:
		page = frappe.get_doc("Wiki Page", page_name)
		frappe.has_permission("Wiki Page", "read", page_name, throw=True)
		page_dict = page.as_dict()

		# Convert markdown content to HTML
		if page_dict.get('content'):
			try:
				page_dict['html_content'] = md_to_html(page_dict['content'])
			except Exception as e:
				frappe.log_error(f"Error converting markdown to HTML: {str(e)}")
				page_dict['html_content'] = page_dict['content']
		else:
			page_dict['html_content'] = ''

		return page_dict
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to view this wiki page"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Page not found"))


@frappe.whitelist()
def create_wiki_page(title, content, route, wiki_space=None, project_name=None, published=0):
	"""
	Create a new Wiki Page

	Args:
		title: page title
		content: markdown content
		route: unique route for the page
		wiki_space: optional wiki space to group the page
		project_name: optional linked project
		published: whether page is published

	Returns:
		created wiki page document
	"""
	try:
		frappe.has_permission("Wiki Page", "create", throw=True)

		page = frappe.new_doc("Wiki Page")
		page.title = title
		page.content = content
		page.route = route
		page.published = cint(published)

		if wiki_space:
			page.wiki_space = wiki_space

		if project_name:
			page.custom_linked_project = project_name

		page.insert()
		return page.as_dict()
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to create wiki pages"))
	except frappe.DuplicateEntryError:
		frappe.throw(_("A wiki page with this route already exists"))
	except Exception as e:
		frappe.log_error(f"Error creating wiki page: {str(e)}")
		frappe.throw(_("Failed to create wiki page"))

