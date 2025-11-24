# Copyright (c) 2024, Nyimbi Odero and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
import json


class APIRoute(Document):
	"""API Route DocType with APISIX integration"""

	def before_insert(self):
		"""Generate URI path before insert"""
		self.generate_uri_path()

	def validate(self):
		"""Validate API Route"""
		# Generate URI path if not set or software product changed
		if not self.uri_path or self.has_value_changed('software_product') or self.has_value_changed('api_version'):
			self.generate_uri_path()

		# Validate upstream_url format
		if self.upstream_url and not (self.upstream_url.startswith('http://') or self.upstream_url.startswith('https://')):
			frappe.throw(_('Upstream URL must start with http:// or https://'))

		# Validate timeout is positive
		if self.upstream_timeout and self.upstream_timeout < 1:
			frappe.throw(_('Upstream timeout must be at least 1 second'))

		# Validate rate limit settings
		if self.enable_rate_limit:
			if not self.rate_limit_count or self.rate_limit_count < 1:
				frappe.throw(_('Rate limit count must be at least 1'))
			if not self.rate_limit_time_window or self.rate_limit_time_window < 1:
				frappe.throw(_('Rate limit time window must be at least 1 second'))

	def generate_uri_path(self):
		"""Generate URI path from software product namespace and version"""
		if self.software_product:
			try:
				product = frappe.get_doc('Software Product', self.software_product)
				namespace = product.api_namespace

				if not namespace:
					frappe.msgprint(
						_('Software Product {0} does not have an API namespace configured').format(self.software_product),
						alert=True
					)
					return

				# Clean namespace (remove leading/trailing slashes)
				namespace = namespace.strip('/')

				# Generate path: /<version>/<namespace>/*
				version = (self.api_version or 'v1').strip('/')
				self.uri_path = f"/{version}/{namespace}/*"

				frappe.msgprint(
					_('Generated URI path: {0}').format(self.uri_path),
					alert=True,
					indicator='blue'
				)

			except Exception as e:
				frappe.log_error(f"Error generating URI path: {str(e)}", "API Route")
				frappe.throw(_('Failed to generate URI path: {0}').format(str(e)))

	def on_update(self):
		"""Sync to APISIX when status changes to Active"""
		if self.status == 'Active' and self.sync_status != 'Synced':
			self.sync_to_apisix()

	def on_trash(self):
		"""Delete route from APISIX when deleted"""
		if self.apisix_route_id:
			self.delete_from_apisix()

	def sync_to_apisix(self):
		"""Sync route to APISIX Gateway"""
		try:
			self.sync_status = 'Syncing'
			self.save(ignore_permissions=True)
			frappe.db.commit()

			# Get APISIX settings
			settings = frappe.get_single('APISIX Settings')
			if not settings.admin_api_url or not settings.admin_api_key:
				frappe.throw(_('APISIX Settings not configured. Please configure APISIX connection first.'))

			# Build APISIX route payload
			route_data = self.build_apisix_payload()

			# Send to APISIX
			import requests

			headers = {
				'Content-Type': 'application/json',
				'X-API-KEY': settings.get_password('admin_api_key')
			}

			# Update existing route or create new
			if self.apisix_route_id:
				# Update
				url = f"{settings.admin_api_url}/apisix/admin/routes/{self.apisix_route_id}"
				response = requests.put(url, json=route_data, headers=headers, timeout=settings.timeout, verify=settings.verify_ssl)
			else:
				# Create
				url = f"{settings.admin_api_url}/apisix/admin/routes"
				response = requests.post(url, json=route_data, headers=headers, timeout=settings.timeout, verify=settings.verify_ssl)

			if response.status_code in [200, 201]:
				result = response.json()
				if result.get('node'):
					self.apisix_route_id = result['node'].get('key', '').split('/')[-1]
					self.sync_status = 'Synced'
					self.save(ignore_permissions=True)
					frappe.db.commit()

					frappe.msgprint(
						_('Route successfully synced to APISIX'),
						alert=True,
						indicator='green'
					)
				else:
					raise Exception('Invalid response from APISIX')
			else:
				raise Exception(f'APISIX API error: HTTP {response.status_code} - {response.text}')

		except Exception as e:
			self.sync_status = 'Failed'
			self.save(ignore_permissions=True)
			frappe.db.commit()

			error_msg = str(e)
			frappe.log_error(f"APISIX Sync Error: {error_msg}", "API Route Sync")
			frappe.throw(_('Failed to sync route to APISIX: {0}').format(error_msg))

	def delete_from_apisix(self):
		"""Delete route from APISIX Gateway"""
		try:
			if not self.apisix_route_id:
				return

			settings = frappe.get_single('APISIX Settings')
			if not settings.admin_api_url or not settings.admin_api_key:
				return

			import requests

			headers = {
				'X-API-KEY': settings.get_password('admin_api_key')
			}

			url = f"{settings.admin_api_url}/apisix/admin/routes/{self.apisix_route_id}"
			response = requests.delete(url, headers=headers, timeout=settings.timeout, verify=settings.verify_ssl)

			if response.status_code in [200, 204]:
				frappe.msgprint(
					_('Route successfully deleted from APISIX'),
					alert=True,
					indicator='orange'
				)
			else:
				frappe.log_error(f"APISIX Delete Error: HTTP {response.status_code}", "API Route Delete")

		except Exception as e:
			frappe.log_error(f"Error deleting from APISIX: {str(e)}", "API Route Delete")

	def build_apisix_payload(self):
		"""Build APISIX route configuration payload"""
		# Parse HTTP methods
		methods = [m.strip() for m in (self.http_methods or 'GET').split(',')]

		# Base route configuration
		route = {
			"name": self.route_name,
			"desc": self.description or self.route_name,
			"uri": self.uri_path,
			"methods": methods,
			"priority": self.priority or 0,
			"status": 1 if self.status == 'Active' else 0,
			"upstream": {
				"type": self.upstream_type or "roundrobin",
				"nodes": {
					self.upstream_url: 1
				},
				"timeout": {
					"connect": self.upstream_timeout or 60,
					"send": self.upstream_timeout or 60,
					"read": self.upstream_timeout or 60
				},
				"retries": self.upstream_retries or 1
			},
			"plugins": {}
		}

		# Enable WebSocket if requested
		if self.enable_websocket:
			route["enable_websocket"] = True

		# Add authentication plugin
		if self.enable_auth and self.auth_type == 'key-auth':
			route["plugins"]["key-auth"] = {}

		# Add rate limiting plugin
		if self.enable_rate_limit:
			route["plugins"]["limit-count"] = {
				"count": self.rate_limit_count,
				"time_window": self.rate_limit_time_window,
				"rejected_code": 429,
				"policy": "local"
			}
			if self.rate_limit_burst:
				route["plugins"]["limit-count"]["burst"] = self.rate_limit_burst

		# Add CORS plugin
		if self.enable_cors and self.cors_origins:
			origins = [origin.strip() for origin in self.cors_origins.split(',')]
			route["plugins"]["cors"] = {
				"allow_origins": ','.join(origins),
				"allow_methods": ','.join(methods),
				"allow_headers": "*",
				"expose_headers": "*",
				"max_age": 3600,
				"allow_credential": True
			}

		# Add IP restriction plugin
		if self.enable_ip_restriction and self.allowed_ips:
			ips = [ip.strip() for ip in self.allowed_ips.split(',')]
			route["plugins"]["ip-restriction"] = {
				"whitelist": ips
			}

		return route

	@frappe.whitelist()
	def force_sync(self):
		"""Force sync route to APISIX (called from UI)"""
		self.sync_to_apisix()
		return {
			'success': True,
			'sync_status': self.sync_status,
			'apisix_route_id': self.apisix_route_id
		}
