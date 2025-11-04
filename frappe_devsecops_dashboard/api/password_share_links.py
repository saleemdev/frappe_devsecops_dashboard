"""
Password Share Links API
Provides operations for creating and validating one-time shareable password links
"""

import frappe
import json
from frappe import _
from frappe.utils import cint, now
from datetime import datetime, timedelta


@frappe.whitelist()
def create_share_link(vault_entry_name, expiry_hours=24, recipient_email=""):
	"""
	Generate shareable link with one-time code
	
	Args:
		vault_entry_name: Name of the password vault entry
		expiry_hours: Hours until link expires (default: 24)
		recipient_email: Email to send the one-time code
	
	Returns:
		dict: Success response with share link details
	"""
	try:
		# Verify the vault entry exists and user is the creator
		entry = frappe.get_doc("Password Vault Entry", vault_entry_name)
		
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to share this password entry")
		
		# Calculate expiry datetime
		expiry_dt = datetime.fromisoformat(str(now())) + timedelta(hours=cint(expiry_hours))
		
		# Create share link
		share_link = frappe.new_doc("Password Share Link")
		share_link.password_vault_entry = vault_entry_name
		share_link.recipient_email = recipient_email
		share_link.expiry_datetime = expiry_dt
		share_link.max_uses = 1
		share_link.current_uses = 0
		share_link.is_used = 0
		
		share_link.insert(ignore_permissions=False)
		frappe.db.commit()
		
		# Generate share link URL
		share_url = f"/password-share/{share_link.share_token}"
		
		return {
			"success": True,
			"data": {
				"name": share_link.name,
				"share_token": share_link.share_token,
				"one_time_code": share_link.one_time_code,
				"share_url": share_url,
				"expiry_datetime": str(share_link.expiry_datetime),
				"message": "Share link created successfully"
			}
		}
	
	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {vault_entry_name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - create_share_link")
		return {"success": False, "error": str(e)}


@frappe.whitelist(allow_guest=True)
def validate_share_link(share_token, one_time_code):
	"""
	Validate token and code, return password if valid
	
	Args:
		share_token: Share token UUID
		one_time_code: 6-digit one-time code
	
	Returns:
		dict: Success response with password entry details if valid
	"""
	try:
		# Find share link by token
		share_links = frappe.get_list(
			"Password Share Link",
			filters={"share_token": share_token},
			fields=["name", "password_vault_entry", "one_time_code", "expiry_datetime", 
					"is_used", "max_uses", "current_uses", "accessed_by_ip"]
		)
		
		if not share_links:
			return {"success": False, "error": "Invalid share link"}
		
		share_link = share_links[0]
		
		# Validate one-time code
		if share_link["one_time_code"] != one_time_code:
			return {"success": False, "error": "Invalid one-time code"}
		
		# Check if link is expired
		expiry_dt = datetime.fromisoformat(str(share_link["expiry_datetime"]))
		now_dt = datetime.fromisoformat(str(now()))
		
		if now_dt > expiry_dt:
			return {"success": False, "error": "Share link has expired"}
		
		# Check if link has been used
		if share_link["is_used"] and share_link["max_uses"] == 1:
			return {"success": False, "error": "Share link has already been used"}
		
		# Check if max uses reached
		if share_link["current_uses"] >= share_link["max_uses"]:
			return {"success": False, "error": "Share link usage limit reached"}
		
		# Get the password entry
		entry = frappe.get_doc("Password Vault Entry", share_link["password_vault_entry"])
		
		# Update share link usage
		share_link_doc = frappe.get_doc("Password Share Link", share_link["name"])
		share_link_doc.current_uses = share_link["current_uses"] + 1
		share_link_doc.accessed_at = now()
		share_link_doc.accessed_by_ip = frappe.request.remote_addr if frappe.request else "unknown"
		
		if share_link_doc.current_uses >= share_link_doc.max_uses:
			share_link_doc.is_used = 1
		
		share_link_doc.save(ignore_permissions=True)
		frappe.db.commit()
		
		return {
			"success": True,
			"data": {
				"title": entry.title,
				"username": entry.username,
				"password": entry.password,
				"url": entry.url,
				"notes": entry.notes,
				"category": entry.category
			}
		}
	
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - validate_share_link")
		return {"success": False, "error": "Failed to validate share link"}


@frappe.whitelist()
def get_share_links(vault_entry_name):
	"""
	List all share links for a password entry
	
	Args:
		vault_entry_name: Name of the password vault entry
	
	Returns:
		dict: Success response with list of share links
	"""
	try:
		# Verify the vault entry exists and user is the creator
		entry = frappe.get_doc("Password Vault Entry", vault_entry_name)
		
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to view share links for this entry")
		
		share_links = frappe.get_list(
			"Password Share Link",
			filters={"password_vault_entry": vault_entry_name},
			fields=[
				"name",
				"share_token",
				"recipient_email",
				"expiry_datetime",
				"is_used",
				"max_uses",
				"current_uses",
				"accessed_at",
				"creation"
			],
			order_by="creation desc"
		)
		
		# Add status to each link
		for link in share_links:
			now_dt = datetime.fromisoformat(str(now()))
			expiry_dt = datetime.fromisoformat(str(link["expiry_datetime"]))
			
			if link["is_used"]:
				link["status"] = "Used"
			elif now_dt > expiry_dt:
				link["status"] = "Expired"
			else:
				link["status"] = "Active"
		
		return {
			"success": True,
			"data": share_links or []
		}
	
	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {vault_entry_name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - get_share_links")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def revoke_share_link(share_link_name):
	"""
	Manually revoke a share link
	
	Args:
		share_link_name: Name of the share link
	
	Returns:
		dict: Success response
	"""
	try:
		share_link = frappe.get_doc("Password Share Link", share_link_name)
		
		# Verify user is the creator
		if share_link.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to revoke this share link")
		
		frappe.delete_doc("Password Share Link", share_link_name, ignore_permissions=False)
		frappe.db.commit()
		
		return {"success": True, "message": "Share link revoked successfully"}
	
	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Share link {share_link_name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - revoke_share_link")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def send_one_time_code(share_link_name):
	"""
	Send/resend one-time code via email
	
	Args:
		share_link_name: Name of the share link
	
	Returns:
		dict: Success response
	"""
	try:
		share_link = frappe.get_doc("Password Share Link", share_link_name)
		
		# Verify user is the creator
		if share_link.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to send code for this share link")
		
		if not share_link.recipient_email:
			return {"success": False, "error": "Recipient email is required"}
		
		# Get password entry for context
		entry = frappe.get_doc("Password Vault Entry", share_link.password_vault_entry)
		
		# Send email with one-time code
		subject = "One-Time Code for Password Access"
		message = f"""
		<p>You have been sent a secure password. Use the following one-time code to access it:</p>
		<h2 style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{share_link.one_time_code}</h2>
		<p><strong>Password Title:</strong> {entry.title}</p>
		<p><strong>Expires:</strong> {share_link.expiry_datetime}</p>
		<p style="color: red;"><strong>Security Warning:</strong> This code is valid for one-time use only. Do not share this code with anyone.</p>
		<p>Click the link you received to access the password along with this code.</p>
		"""
		
		frappe.sendmail(
			recipients=[share_link.recipient_email],
			subject=subject,
			message=message,
			now=True
		)
		
		return {"success": True, "message": "One-time code sent successfully"}
	
	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Share link {share_link_name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - send_one_time_code")
		return {"success": False, "error": str(e)}

