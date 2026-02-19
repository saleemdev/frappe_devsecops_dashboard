import frappe
from frappe.tests.utils import FrappeTestCase

from frappe_devsecops_dashboard.api.toil.api_utils import (
    fail,
    normalize_toil_status,
    ok,
    parse_json_payload,
    serialize_timesheet,
)
from frappe_devsecops_dashboard.constants import TOILStatus


class TestTOILApiUtils(FrappeTestCase):
    def test_ok_envelope(self):
        result = ok(data={"k": "v"}, message="done", total=1)
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["k"], "v")
        self.assertEqual(result["message"], "done")
        self.assertEqual(result["total"], 1)

    def test_fail_envelope_includes_message(self):
        result = fail("E_TEST", "bad request", http_status=422)
        self.assertFalse(result["success"])
        self.assertEqual(result["error"]["code"], "E_TEST")
        self.assertEqual(result["message"], "bad request")
        self.assertEqual(frappe.response.get("http_status_code"), 422)

    def test_parse_json_payload(self):
        self.assertEqual(parse_json_payload(None), {})
        self.assertEqual(parse_json_payload({"a": 1}), {"a": 1})
        self.assertEqual(parse_json_payload('{"a": 1}')["a"], 1)
        self.assertEqual(parse_json_payload("not-json"), {})

    def test_serialize_timesheet_status_normalization(self):
        row = {
            "name": "TS-TEST-0001",
            "start_date": "2026-02-01",
            "end_date": "2026-02-01",
            "docstatus": 0,
            "total_toil_hours": 2,
            "toil_days": 0.25,
            "toil_status": "",
        }
        out = serialize_timesheet(row)
        self.assertEqual(out["toil_status"], TOILStatus.PENDING_ACCRUAL)
        self.assertEqual(out["status"], TOILStatus.PENDING_ACCRUAL)
        self.assertTrue(out["is_reviewable"])

    def test_normalize_toil_status_cancelled(self):
        self.assertEqual(
            normalize_toil_status({"docstatus": 2, "total_toil_hours": 1}),
            TOILStatus.CANCELLED,
        )

