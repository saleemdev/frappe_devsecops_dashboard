# Copyright (c) 2025, KNS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class RiskRegister(Document):
    def autoname(self):
        """Generate name based on project"""
        if self.project:
            project_abbr = self.project.replace(" ", "-")[:20]
            self.name = f"RISK-{project_abbr}-{frappe.generate_hash(length=4)}"

    def validate(self):
        """Validate risk register"""
        # Check for duplicate project
        if self.project:
            existing = frappe.db.exists("Risk Register", {
                "project": self.project,
                "name": ["!=", self.name]
            })
            if existing:
                frappe.throw(f"Risk Register already exists for project {self.project}")

        # Calculate risk scores for each risk item
        if self.risks:
            for risk in self.risks:
                if risk.probability and risk.impact:
                    risk.risk_score = int(risk.probability) * int(risk.impact)

                    # Auto-assign priority based on risk score
                    if risk.risk_score >= 15:
                        risk.priority = "Critical"
                    elif risk.risk_score >= 10:
                        risk.priority = "High"
                    elif risk.risk_score >= 5:
                        risk.priority = "Medium"
                    else:
                        risk.priority = "Low"

                # Auto-generate risk ID if not present
                if not risk.risk_id:
                    risk.risk_id = f"R{str(len(self.risks)).zfill(3)}"
