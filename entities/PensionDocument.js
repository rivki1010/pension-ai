{
  "name": "PensionDocument",
  "type": "object",
  "properties": {
    "file_url": {
      "type": "string",
      "description": "URL of the uploaded file"
    },
    "file_name": {
      "type": "string",
      "description": "Original file name"
    },
    "document_type": {
      "type": "string",
      "enum": [
        "pension",
        "education_fund"
      ],
      "description": "Type of document - pension or education fund"
    },
    "year": {
      "type": "number",
      "description": "Year of the document"
    },
    "provider_name": {
      "type": "string",
      "description": "Insurance/fund company name"
    },
    "total_balance": {
      "type": "number",
      "description": "Total balance at end of period"
    },
    "monthly_deposit": {
      "type": "number",
      "description": "Monthly deposit amount"
    },
    "employer_deposit": {
      "type": "number",
      "description": "Employer monthly deposit"
    },
    "employee_deposit": {
      "type": "number",
      "description": "Employee monthly deposit"
    },
    "annual_return_pct": {
      "type": "number",
      "description": "Annual return percentage"
    },
    "management_fee_pct": {
      "type": "number",
      "description": "Management fee percentage"
    },
    "insurance_component": {
      "type": "number",
      "description": "Insurance/risk component amount"
    },
    "severance_balance": {
      "type": "number",
      "description": "Severance pay balance (\u05e4\u05d9\u05e6\u05d5\u05d9\u05d9\u05dd)"
    },
    "compensation_balance": {
      "type": "number",
      "description": "Compensation/tagmulim balance (\u05ea\u05d2\u05de\u05d5\u05dc\u05d9\u05dd)"
    },
    "status": {
      "type": "string",
      "enum": [
        "processing",
        "completed",
        "error"
      ],
      "default": "processing"
    },
    "extraction_notes": {
      "type": "string",
      "description": "Notes from data extraction"
    }
  },
  "required": [
    "file_url",
    "file_name",
    "document_type",
    "status"
  ]
}