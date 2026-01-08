# Config Copilot - Sample Natural Language Inputs

This document contains three sample natural language inputs that demonstrate Config Copilot's ability to generate complete data specifications.

## Sample 1: Credit Card Transactions Dataset

### Natural Language Input:
```
I need a dataset for credit card transactions that includes cardholder information, transaction details, and merchant data. This dataset contains high PII including card numbers and customer names, so it needs strong masking policies. The data should be refreshed daily from our core banking system and retained for 7 years for regulatory compliance. We need quality checks to ensure no duplicate transactions, all amounts are positive, and transaction timestamps are within reasonable bounds. Set up SLAs for 24-hour freshness and 99.5% availability. This is for the Treasury/Markets domain and will be used for fraud detection and spending analysis.
```

### Expected Generated Specs:
- **Dataset Contract**: credit_card_transactions with schema including card_number, customer_name, transaction_amount, merchant_id, transaction_timestamp
- **DQ Rules**: 
  - Uniqueness check on transaction_id
  - Completeness checks on required fields
  - Validity check for positive amounts
  - Timeliness check for reasonable timestamps
- **Policies**:
  - High PII access requires approval
  - Card number masking policy (show only last 4 digits)
  - Cross-border data transfer restrictions
- **SLAs**:
  - Freshness: 24 hours
  - Availability: 99.5%
  - Quality: 95% DQ pass rate

---

## Sample 2: AML Alert Investigation Dataset

### Natural Language Input:
```
Create a dataset for anti-money laundering alert investigations. It should track alerts from our AML system including alert IDs, customer identifiers, alert scores, investigation status, and investigator notes. This is moderate PII since it has customer IDs but not directly identifying info. The data needs to be available in the US jurisdiction only and refreshed every 4 hours. We need completeness checks on all core fields, validation that alert scores are between 0-100, and consistency checks that closed alerts have resolution notes. The dataset owner is the compliance team (compliance@bank.com) and it's part of the AML/FCC domain. Set up alerting to the compliance team if data freshness exceeds 5 hours or quality drops below 98%.
```

### Expected Generated Specs:
- **Dataset Contract**: aml_alert_investigations with schema for alert_id, customer_id, alert_score, status, investigator_notes, etc.
- **DQ Rules**:
  - Completeness on alert_id, customer_id, alert_score, status
  - Validity check: alert_score BETWEEN 0 AND 100
  - Consistency check: IF status = 'closed' THEN resolution_notes IS NOT NULL
- **Policies**:
  - Jurisdiction restriction: US only
  - Access limited to compliance team and auditors
  - Requires approval for data exports
- **SLAs**:
  - Freshness: 4 hours (alert at 5 hours)
  - Quality: 98% DQ pass rate
  - Alerting to compliance@bank.com via email and Slack

---

## Sample 3: Loan Portfolio Risk Ratings

### Natural Language Input:
```
I need to onboard a loan portfolio risk ratings dataset for Credit Risk analysis. The dataset should contain loan IDs, borrower IDs, credit scores, risk ratings (AAA to D), exposure amounts, probability of default, loss given default, and last review dates. This has low PII since it uses anonymized borrower IDs. Data comes from our risk modeling system and needs to be updated every business day by 6 AM. The dataset must meet regulatory requirements: all loans must have a risk rating, credit scores must be in valid range (300-850), PD must be between 0 and 1, and all loans must be reviewed within the last 90 days. Set up quality SLA at 99% pass rate and alert the risk team if freshness exceeds 30 hours. Domain is Credit Risk, owner is risk.analytics@bank.com. Retain for 10 years.
```

### Expected Generated Specs:
- **Dataset Contract**: loan_portfolio_risk_ratings with comprehensive schema
- **DQ Rules**:
  - Completeness: risk_rating IS NOT NULL for all records
  - Validity: credit_score BETWEEN 300 AND 850
  - Validity: probability_of_default BETWEEN 0 AND 1
  - Timeliness: last_review_date > CURRENT_DATE - 90 days
  - Uniqueness: No duplicate loan_id values
- **Policies**:
  - Access control: Risk analysts and senior management only
  - Retention: 10 years for regulatory compliance
  - Quality gate: Block downstream usage if DQ < 99%
- **SLAs**:
  - Freshness: 24 hours (alert at 30 hours)
  - Quality: 99% DQ pass rate
  - Availability: 99.9%
  - Alerting to risk.analytics@bank.com

---

## Usage Instructions

To test these samples in Config Copilot:

1. Navigate to the **Config** tab in the AUREUS platform
2. Copy one of the natural language inputs above
3. Paste into the "Natural Language Input" textarea
4. Click "Generate Specs"
5. Review the generated specifications in each tab:
   - Dataset Contract
   - DQ Rules
   - Policies
   - SLAs
6. Check validation results
7. If valid, enter a commit message and click "Commit Specifications"
8. View the evidence pack generated at `evidence/config_copilot_runs/{commitId}/`

## Expected Outcomes

Each sample should generate:
- ✅ Complete, valid JSON specifications
- ✅ Pass all schema validation checks
- ✅ Include appropriate banking domain mappings
- ✅ Generate relevant DQ rules based on data characteristics
- ✅ Create governance policies matching PII levels and jurisdictions
- ✅ Define realistic SLAs with alerting configurations
- ✅ Produce full audit trail and evidence artifacts
