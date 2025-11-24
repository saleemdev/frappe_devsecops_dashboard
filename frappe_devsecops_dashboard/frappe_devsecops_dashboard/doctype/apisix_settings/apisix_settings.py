# Copyright (c) 2024, Nyimbi Odero and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class APISIXSettings(Document):
	"""APISIX Settings DocType for managing APISIX Gateway credentials"""

	def validate(self):
		"""Validate APISIX Settings"""
		# Ensure admin_api_url ends without trailing slash
		if self.admin_api_url and self.admin_api_url.endswith('/'):
			self.admin_api_url = self.admin_api_url.rstrip('/')

		# Ensure data_plane_url ends without trailing slash
		if self.data_plane_url and self.data_plane_url.endswith('/'):
			self.data_plane_url = self.data_plane_url.rstrip('/')

		# Validate timeout is positive
		if self.timeout and self.timeout < 1:
			frappe.throw("Timeout must be at least 1 second")

	def test_connection(self):
		"""Test connection to APISIX Admin API"""
		try:
			import requests

			headers = {
				'X-API-KEY': self.get_password('admin_api_key')
			}

			response = requests.get(
				f"{self.admin_api_url}/apisix/admin/routes",
				headers=headers,
				timeout=self.timeout or 30,
				verify=self.verify_ssl
			)

			if response.status_code == 200:
				return {
					'success': True,
					'message': 'Successfully connected to APISIX Admin API'
				}
			else:
				return {
					'success': False,
					'message': f'Connection failed: HTTP {response.status_code}'
				}
		except Exception as e:
			return {
				'success': False,
				'message': f'Connection error: {str(e)}'
			}
