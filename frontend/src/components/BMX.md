BMX
	Define the benefit package, version the package, timeline the package, mapped to an scheme and mapped to an insurer
	Define the benefits/regimens (codeable concepts)
	Define the items: In each, add the molecure name (product catalog), unit (codeable concept), dose (codeable concept), doses/cycle, dose days (codeable concept), LimitAmt/Cycle, LimitNoCycles
	Maker Checker process to approve benefit package to activate

Doctypes:
Diagnosis Category 
    Code - eg SHA-06-022 (Docname)
    Insurer eg SHA - consider coding this as a link to Insurer doctype
    Diagnosis Description e.g Breast Cancer
    ICD 11
    Required Params(Checkbox): GFR Glomerular Filtration Rate (float), Body Surface Area BSA(float), Age (integer), Gender (codeable concept),
Regimen:
    Diagnosis Category: Link
    Regimen Code (Docname) eg SHA-06-022-1
    Regimen Description eg Breast Cancer Regimen 1
    Cycle (integer): eg 6. Limit
    Time between cycles (Uom): eg Weekly, Fortnightly, Monthly, Quarterly, Half Yearly, Yearly
    Regimen Items (Table)
        Item (Link to Item) - Sync from catalog
        Units (float): eg 1000
        UOM : Link(uom) e.g mg
        Days of Administration: D1, D2, D3, D4, D5, D6, D7
BMX doctypes above
-----------------------------------------------------------------------------------------------------
=====================================================================================================
CarePlan:
    Patient (Link to Patient)
    Regimen : Data
    Start Date (date)
    End Date (date)
    Status (select): Draft, Active, Completed, Cancelled
    Params (Table)
        Param Data
        Value (float)
    Regimen Items (Table)
        Item (Link to Item)
        Units (float)
        UOM (Link(uom))
        Date of Administration: 2025-10-10
        Status (select): Draft, Active, Completed, Cancelled, Prescribed, Dispensed
		Cycle (integer): eg 6. Limit
																										
Medication Administration, MedicationRequest, MedicationDispense:
    Link to Care Plan
    Date of Administration
    Status (select): Draft, Active, Completed, Cancelled, Prescribed, Dispensed
    Item (Link to Item)
    Units (float)
    UOM (Link(uom))
    Date of Administration: 2025-10-10
    Status (select): Draft, Active, Completed, Cancelled, Prescribed, Dispensed
    Params (Table)
        Param Data
        Value (float)

Instance :
App: erpnext,healthcare, payments, practice
UAT Instance : practice.kenya-hie.health
Prod: practice.tiberbu.health
helper classes: Create Schedules as Per FHIR elements

--------------------
polling endpoint: /v1/validate_patient_regimen?cr_id&regimen_code


============================================================================



P360: Adding regimen in plan 
	Select patient: OTP process: 
	Specify Cancer Type (codeable concept)
	Add patient to a cancer registry
	Add: Specify the Regimen-Benefit from BMX
	Populate the items/drugs as per regimen
		Items in BMX (A)
		Items removed from BMX list (R)
		Items added to BMX list (N)
	Define the Start Date of cycle 1
	for each item in cycle
		Adjust or retain number of cycles
		Adjust or retain number of doses in a cycle
		Specify the cycle frequency (weekly, montly etc - codeable concept)
	Adjust or retain cycle start dates
	Auto generate schedule of the plan based on Admin Days (doses) and cycles (defineable by doctor).
	Save as Draft
	
Approval of Plan (in BMS)
	If A items, auto-approve with not adjustments
	If R and N items, go for manual review (if N and drug is not a schedule drug, reject)
	If Plan Approved, change to Active
	
Submit preauth (in PP)
	Select Patient
	Select SHA coded
	
	generate a proforma with pharmacy based on plan (offline activity)
	
	Call P360 and Load Plan (must be active)
	Specify cost of of each item in the plan to match the proforma
	Attach the proforma
	Submit for approval

Preauth Approval (PBAS - Timothy)	
	Check for Eligibility of patient in the policy period and coverage period
	Check if total preauth price within total SHA-06-022 Balance
	Check if each item within limit	
		Approve up to the limit
	Return with approval to each item with approved items to P360
	Return approval status to PP and P360
		If approved display to Patient in Afyayangu with Approved limits
	
Claim Process (PP)
	Select Patient
	Select Preauth (must be approved)
	Load Plan with approved limits
	Based on the Plan Date, select the Cycle and Dose
	Submit claim
	
Claim Approval  (PBAS - Timothy)