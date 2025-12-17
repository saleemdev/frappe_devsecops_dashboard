"""
Wiki API - Whitelisted methods for Wiki Space and Wiki Page CRUD operations
Provides backend support for the DevSecOps Wiki feature
"""

import frappe
from frappe import _
from frappe.utils import cint, md_to_html, get_url


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
			fields=["name", "route", "space_name", "description", "creation", "modified"],
			limit_start=cint(limit_start),
			limit_page_length=cint(limit_page_length),
			order_by="modified desc"
		)

		# Enrich with page count and use space_name as title
		for space in spaces:
			space['title'] = space.get('space_name') or space.get('route', '')
			space['description'] = space.get('description') or ''
			# Count pages from wiki_sidebars child table (Wiki Group Item)
			page_count = frappe.db.count(
				"Wiki Group Item",
				filters={"parenttype": "Wiki Space", "parent": space['name']}
			)
			space['page_count'] = page_count

		return spaces
	except Exception as e:
		frappe.log_error(f"Error fetching wiki spaces: {str(e)}")
		frappe.throw(_("Failed to fetch wiki spaces"))


@frappe.whitelist()
def get_wiki_spaces_with_links(filters=None, limit_start=0, limit_page_length=20):
	"""
	Get list of Wiki Spaces with full documentation URLs for sharing

	Args:
		filters: dict of filter conditions
		limit_start: pagination start
		limit_page_length: number of records per page

	Returns:
		list of wiki spaces with page_count and doc_url fields
	"""
	try:
		filters = filters or {}
		spaces = frappe.get_list(
			"Wiki Space",
			filters=filters,
			fields=["name", "route", "space_name", "description", "creation", "modified"],
			limit_start=cint(limit_start),
			limit_page_length=cint(limit_page_length),
			order_by="modified desc"
		)

		# Enrich with page count, URLs, and title
		for space in spaces:
			space['title'] = space.get('space_name') or space.get('route', '')
			space['description'] = space.get('description') or ''

			# Count pages from wiki_sidebars child table (Wiki Group Item)
			page_count = frappe.db.count(
				"Wiki Group Item",
				filters={"parenttype": "Wiki Space", "parent": space['name']}
			)
			space['page_count'] = page_count

			# Generate full documentation URL
			# Route may already start with 'wiki/' or be just 'wiki'
			if space.get('route'):
				route = space['route']
				# Only add /wiki/ prefix if route doesn't already start with 'wiki/' or isn't exactly 'wiki'
				if route.startswith('wiki/') or route == 'wiki':
					public_path = f"/{route}"
				else:
					public_path = f"/wiki/{route}"

				space['doc_url'] = get_url(f"/app/frappe-devsecops-dashboard#wiki/space/{space['name']}")
				space['public_url'] = get_url(public_path)
			else:
				space['doc_url'] = get_url(f"/app/frappe-devsecops-dashboard#wiki/space/{space['name']}")
				space['public_url'] = None

		return spaces
	except Exception as e:
		frappe.log_error(f"Error fetching wiki spaces with links: {str(e)}")
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
		space_dict['title'] = space_dict.get('space_name') or space_dict.get('route', '')
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
		space.space_name = name
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
		wiki page document with html_content field and URLs
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

		# Get owner's full name from User doctype
		if page_dict.get('owner'):
			try:
				owner_full_name = frappe.db.get_value("User", page_dict['owner'], "full_name")
				page_dict['owner_full_name'] = owner_full_name or page_dict['owner']
			except Exception:
				page_dict['owner_full_name'] = page_dict['owner']
		else:
			page_dict['owner_full_name'] = 'Unknown'

		# Add documentation URLs
		page_dict['doc_url'] = get_url(f"/app/frappe-devsecops-dashboard#wiki/page/{page_name}")
		if page_dict.get('route'):
			route = page_dict['route']
			# Only add /wiki/ prefix if route doesn't already start with 'wiki/'
			if route.startswith('wiki/'):
				public_path = f"/{route}"
			else:
				public_path = f"/wiki/{route}"
			page_dict['public_url'] = get_url(public_path)
		else:
			page_dict['public_url'] = None

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

		# Basic input validation and sane defaults
		title = (title or "").strip()
		route = (route or "").strip()
		_content = (content or "").strip()

		if not title:
			frappe.throw(_("Page title is required"))
		if not route:
			frappe.throw(_("Route (URL slug) is required"))

		# If content is empty, provide a minimal starter to satisfy mandatory field
		if not _content:
			_content = f"# {title}\n\n"

		page = frappe.new_doc("Wiki Page")
		page.title = title
		page.content = _content
		page.route = route
		page.published = cint(published)

		if wiki_space:
			page.wiki_space = wiki_space

		if project_name:
			page.custom_linked_project = project_name

		page.insert()

		# If linked to a Wiki Space, ensure the space's sidebar (child table) includes this page
		if wiki_space:
			# Check if Wiki Space exists
			if not frappe.db.exists("Wiki Space", wiki_space):
				frappe.throw(_(f"Wiki Space {wiki_space} does not exist"))

			# Avoid duplicate sidebar entries
			already = frappe.db.exists(
				"Wiki Group Item",
				{"parenttype": "Wiki Space", "parent": wiki_space, "wiki_page": page.name},
			)

			if not already:
				# Get the Wiki Space document
				space_doc = frappe.get_doc("Wiki Space", wiki_space)

				# Append to wiki_sidebars child table
				space_doc.append("wiki_sidebars", {
					"doctype": "Wiki Group Item",
					"wiki_page": page.name,
					"parent_label": title  # Default to page title, editable later from frontend
				})

				# Save the space document
				space_doc.flags.ignore_permissions = True
				space_doc.save()
				frappe.db.commit()

				frappe.logger().info(f"Successfully added page {page.name} to Wiki Space {wiki_space} sidebar")

				# Clear wiki sidebar cache so the new page appears immediately
				try:
					from wiki.wiki.doctype.wiki_page.wiki_page import clear_sidebar_cache
					clear_sidebar_cache()
				except Exception as cache_err:
					frappe.logger().warning(f"Could not clear sidebar cache: {str(cache_err)}")

		return page.as_dict()
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to create wiki pages"))
	except frappe.DuplicateEntryError:
		frappe.throw(_("A wiki page with this route already exists"))
	except Exception as e:
		frappe.log_error(f"Error creating wiki page: {str(e)}")
		frappe.throw(_("Failed to create wiki page"))


@frappe.whitelist()
def publish_wiki_page(page_name):
	"""
	Publish a draft Wiki Page

	Args:
		page_name: name of the wiki page

	Returns:
		updated wiki page document
	"""
	try:
		frappe.has_permission("Wiki Page", "write", page_name, throw=True)

		page = frappe.get_doc("Wiki Page", page_name)
		page.published = 1
		page.save()

		frappe.logger().info(f"Published wiki page: {page_name}")
		return {
			"message": "Wiki page published successfully",
			"page": page.as_dict()
		}
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to publish this wiki page"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Page not found"))
	except Exception as e:
		frappe.log_error(f"Error publishing wiki page: {str(e)}")
		frappe.throw(_("Failed to publish wiki page"))


@frappe.whitelist()
def unpublish_wiki_page(page_name):
	"""
	Unpublish a Wiki Page (mark as draft)

	Args:
		page_name: name of the wiki page

	Returns:
		updated wiki page document
	"""
	try:
		frappe.has_permission("Wiki Page", "write", page_name, throw=True)

		page = frappe.get_doc("Wiki Page", page_name)
		page.published = 0
		page.save()

		frappe.logger().info(f"Unpublished wiki page: {page_name}")
		return {
			"message": "Wiki page unpublished successfully",
			"page": page.as_dict()
		}
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to unpublish this wiki page"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Page not found"))
	except Exception as e:
		frappe.log_error(f"Error unpublishing wiki page: {str(e)}")
		frappe.throw(_("Failed to unpublish wiki page"))


@frappe.whitelist()
def toggle_guest_access(page_name, allow_guest):
	"""
	Enable or disable guest access for a Wiki Page

	Args:
		page_name: name of the wiki page
		allow_guest: 1 to enable, 0 to disable

	Returns:
		updated wiki page document
	"""
	try:
		frappe.has_permission("Wiki Page", "write", page_name, throw=True)

		page = frappe.get_doc("Wiki Page", page_name)
		page.allow_guest = cint(allow_guest)
		page.save()

		status = "enabled" if cint(allow_guest) else "disabled"
		frappe.logger().info(f"Guest access {status} for wiki page: {page_name}")
		return {
			"message": f"Guest access {status} successfully",
			"page": page.as_dict()
		}
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to modify guest access for this wiki page"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Page not found"))
	except Exception as e:
		frappe.log_error(f"Error toggling guest access: {str(e)}")
		frappe.throw(_("Failed to toggle guest access"))


@frappe.whitelist()
def update_wiki_page(page_name, updates):
	"""
	Update a Wiki Page

	Args:
		page_name: name of the wiki page
		updates: dict of fields to update

	Returns:
		updated wiki page document
	"""
	try:
		frappe.has_permission("Wiki Page", "write", page_name, throw=True)

		page = frappe.get_doc("Wiki Page", page_name)
		page.update(updates)
		page.save()
		return page.as_dict()
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to update this wiki page"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Page not found"))
	except Exception as e:
		frappe.log_error(f"Error updating wiki page: {str(e)}")
		frappe.throw(_("Failed to update wiki page"))


@frappe.whitelist()
def move_wiki_page(page_name, new_wiki_space):
	"""
	Move a Wiki Page from one Wiki Space to another

	Args:
		page_name: name of the wiki page to move
		new_wiki_space: name of the destination wiki space

	Returns:
		success message with updated page
	"""
	try:
		frappe.has_permission("Wiki Page", "write", page_name, throw=True)
		frappe.has_permission("Wiki Space", "write", new_wiki_space, throw=True)

		# Get the page
		page = frappe.get_doc("Wiki Page", page_name)
		old_wiki_space = page.wiki_space

		# Verify destination space exists
		if not frappe.db.exists("Wiki Space", new_wiki_space):
			frappe.throw(_("Destination Wiki Space does not exist"))

		# Remove from old space sidebar (if exists)
		if old_wiki_space:
			try:
				old_sidebar_entry = frappe.db.exists(
					"Wiki Group Item",
					{"parenttype": "Wiki Space", "parent": old_wiki_space, "wiki_page": page_name}
				)
				if old_sidebar_entry:
					frappe.delete_doc("Wiki Group Item", old_sidebar_entry, ignore_permissions=True)
					frappe.logger().info(f"Removed page {page_name} from Wiki Space {old_wiki_space} sidebar")
			except Exception as e:
				frappe.log_error(f"Error removing page from old space sidebar: {str(e)}")

		# Update page's wiki_space field
		page.wiki_space = new_wiki_space
		page.save()

		# Add to new space sidebar
		try:
			# Check if already exists in new space sidebar
			already = frappe.db.exists(
				"Wiki Group Item",
				{"parenttype": "Wiki Space", "parent": new_wiki_space, "wiki_page": page_name}
			)
			if not already:
				space_doc = frappe.get_doc("Wiki Space", new_wiki_space)
				space_doc.append("wiki_sidebars", {
					"doctype": "Wiki Group Item",
					"wiki_page": page_name,
					"parent_label": page.title
				})
				space_doc.flags.ignore_permissions = True
				space_doc.save()
				frappe.db.commit()
				frappe.logger().info(f"Added page {page_name} to Wiki Space {new_wiki_space} sidebar")

				# Clear wiki sidebar cache
				try:
					from wiki.wiki.doctype.wiki_page.wiki_page import clear_sidebar_cache
					clear_sidebar_cache()
				except Exception as cache_err:
					frappe.logger().warning(f"Could not clear sidebar cache: {str(cache_err)}")
		except Exception as e:
			frappe.log_error(f"Error adding page to new space sidebar: {str(e)}")
			frappe.throw(_("Failed to add page to new space sidebar"))

		return {
			"message": "Wiki page moved successfully",
			"page": page.as_dict(),
			"old_space": old_wiki_space,
			"new_space": new_wiki_space
		}
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to move this wiki page"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Page or Wiki Space not found"))
	except Exception as e:
		frappe.log_error(f"Error moving wiki page: {str(e)}")
		frappe.throw(_("Failed to move wiki page"))


@frappe.whitelist()
def delete_wiki_page(page_name):
	"""
	Delete a Wiki Page

	Args:
		page_name: name of the wiki page

	Returns:
		success message
	"""
	try:
		frappe.has_permission("Wiki Page", "delete", page_name, throw=True)
		frappe.delete_doc("Wiki Page", page_name)
		return {"message": "Wiki page deleted successfully"}
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to delete this wiki page"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Page not found"))
	except Exception as e:
		frappe.log_error(f"Error deleting wiki page: {str(e)}")
		frappe.throw(_("Failed to delete wiki page"))


@frappe.whitelist()
def get_wiki_space_sidebar(space_name):
	"""
	Get Wiki Space sidebar items with current ordering

	Args:
		space_name: name of the wiki space

	Returns:
		list of sidebar items ordered by idx
	"""
	try:
		frappe.has_permission("Wiki Space", "read", space_name, throw=True)

		# Get all Wiki Group Items for this space, ordered by idx
		sidebar_items = frappe.get_all(
			"Wiki Group Item",
			filters={
				"parenttype": "Wiki Space",
				"parent": space_name
			},
			fields=["name", "wiki_page", "parent_label", "idx", "hide_on_sidebar"],
			order_by="idx asc"
		)

		# Enrich with Wiki Page title if parent_label is empty
		for item in sidebar_items:
			if item.wiki_page:
				page = frappe.get_doc("Wiki Page", item.wiki_page)
				item["page_title"] = page.title
				item["page_route"] = page.route
				item["page_published"] = page.published
			else:
				item["page_title"] = item.parent_label or "Untitled"
				item["page_route"] = None
				item["page_published"] = 0

		return sidebar_items

	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to view this wiki space"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Space not found"))
	except Exception as e:
		frappe.log_error(f"Error fetching wiki space sidebar: {str(e)}")
		frappe.throw(_("Failed to fetch wiki space sidebar"))


@frappe.whitelist()
def update_wiki_space_sidebar(space_name, sidebar_items):
	"""
	Update Wiki Space sidebar ordering and settings

	Args:
		space_name: name of the wiki space
		sidebar_items: list of sidebar items with updated idx values
		                Format: [{"name": "item-id", "idx": 1, "parent_label": "Label"}, ...]

	Returns:
		success message with updated sidebar
	"""
	try:
		frappe.has_permission("Wiki Space", "write", space_name, throw=True)

		if isinstance(sidebar_items, str):
			import json
			sidebar_items = json.loads(sidebar_items)

		# Update each sidebar item
		for item in sidebar_items:
			if not item.get("name"):
				continue

			sidebar_doc = frappe.get_doc("Wiki Group Item", item["name"])

			# Update idx (ordering)
			if "idx" in item:
				sidebar_doc.idx = item["idx"]

			# Update parent_label if provided
			if "parent_label" in item:
				sidebar_doc.parent_label = item["parent_label"]

			# Update hide_on_sidebar if provided
			if "hide_on_sidebar" in item:
				sidebar_doc.hide_on_sidebar = item["hide_on_sidebar"]

			sidebar_doc.flags.ignore_permissions = True
			sidebar_doc.save()

		frappe.db.commit()

		# Clear wiki sidebar cache
		try:
			from wiki.wiki.doctype.wiki_page.wiki_page import clear_sidebar_cache
			clear_sidebar_cache()
		except Exception as cache_err:
			frappe.logger().warning(f"Could not clear sidebar cache: {str(cache_err)}")

		# Return updated sidebar
		updated_sidebar = get_wiki_space_sidebar(space_name)

		return {
			"message": "Wiki space sidebar updated successfully",
			"sidebar": updated_sidebar
		}

	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to update this wiki space"))
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Space not found"))
	except Exception as e:
		frappe.log_error(f"Error updating wiki space sidebar: {str(e)}")
		frappe.throw(_("Failed to update wiki space sidebar"))


@frappe.whitelist()
def add_page_to_sidebar(space_name, page_name, parent_label=None):
	"""
	Add a Wiki Page to a Wiki Space's sidebar

	Args:
		space_name: name of the wiki space
		page_name: name of the wiki page to add
		parent_label: optional custom label (defaults to page title)

	Returns:
		success message with updated sidebar
	"""
	try:
		frappe.has_permission("Wiki Space", "write", space_name, throw=True)

		# Check if page exists
		if not frappe.db.exists("Wiki Page", page_name):
			frappe.throw(_("Wiki Page does not exist"))

		# Check if already in sidebar
		already_exists = frappe.db.exists(
			"Wiki Group Item",
			{"parenttype": "Wiki Space", "parent": space_name, "wiki_page": page_name}
		)

		if already_exists:
			frappe.throw(_("Page is already in the sidebar"))

		# Get the Wiki Space document
		space_doc = frappe.get_doc("Wiki Space", space_name)

		# Get page title if no custom label provided
		if not parent_label:
			page = frappe.get_doc("Wiki Page", page_name)
			parent_label = page.title

		# Get next idx (max + 1)
		current_items = frappe.get_all(
			"Wiki Group Item",
			filters={"parenttype": "Wiki Space", "parent": space_name},
			fields=["idx"],
			order_by="idx desc",
			limit=1
		)
		next_idx = (current_items[0].idx + 1) if current_items else 1

		# Append to wiki_sidebars child table
		space_doc.append("wiki_sidebars", {
			"doctype": "Wiki Group Item",
			"wiki_page": page_name,
			"parent_label": parent_label,
			"idx": next_idx
		})

		# Save the space document
		space_doc.flags.ignore_permissions = True
		space_doc.save()
		frappe.db.commit()

		# Clear wiki sidebar cache
		try:
			from wiki.wiki.doctype.wiki_page.wiki_page import clear_sidebar_cache
			clear_sidebar_cache()
		except Exception as cache_err:
			frappe.logger().warning(f"Could not clear sidebar cache: {str(cache_err)}")

		# Return updated sidebar
		updated_sidebar = get_wiki_space_sidebar(space_name)

		return {
			"message": "Page added to sidebar successfully",
			"sidebar": updated_sidebar
		}

	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to update this wiki space"))
	except frappe.ValidationError:
		# Re-raise validation errors (like "already in sidebar") as-is
		raise
	except frappe.DoesNotExistError:
		frappe.throw(_("Wiki Space or Wiki Page not found"))
	except Exception as e:
		frappe.log_error(f"Error adding page to sidebar: {str(e)}")
		frappe.throw(_("Failed to add page to sidebar"))
