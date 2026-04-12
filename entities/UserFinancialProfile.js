{
  "name": "UserFinancialProfile",
  "type": "object",
  "properties": {
    "birth_year": {
      "type": "number",
      "description": "Year of birth"
    },
    "gender": {
      "type": "string",
      "enum": [
        "male",
        "female"
      ],
      "description": "Gender for retirement age calculation"
    },
    "current_salary": {
      "type": "number",
      "description": "Current gross monthly salary"
    },
    "retirement_age": {
      "type": "number",
      "description": "Planned retirement age"
    },
    "marital_status": {
      "type": "string",
      "enum": [
        "single",
        "married"
      ],
      "description": "Marital status for tax calculation"
    },
    "salary_growth_pct": {
      "type": "number",
      "description": "Expected annual salary growth percentage",
      "default": 2
    }
  },
  "required": [
    "birth_year",
    "gender",
    "current_salary"
  ]
}