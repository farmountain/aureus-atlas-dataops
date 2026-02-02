# AUREUS Platform - Pilot Program Agreement

**PILOT AGREEMENT**

This Pilot Agreement ("Agreement") is entered into as of _____________ ("Effective Date") by and between:

**AUREUS Platform** ("Provider")  
Address: 123 Tech Hub Drive, Suite 400, San Francisco, CA 94105  
Email: sales@aureus-platform.com  
Phone: +1 (415) 555-0100  
Website: www.aureus-platform.com

AND

**[Customer Legal Name]** ("Customer")  
Address: [Customer Address]  
Contact: [Customer Name, Title]  
Email: [customer@bank.com]  
Phone: [Customer Phone]

---

## 1. Purpose and Scope

### 1.1 Pilot Objectives
Provider agrees to provide Customer with access to the AUREUS Platform (the "Platform") for a limited pilot engagement to:
- Evaluate the Platform's capabilities for governed agentic data operations
- Validate use cases specific to Customer's credit risk and compliance workflows
- Assess product-market fit and gather feedback for product development
- Determine suitability for production deployment

### 1.2 Pilot Scope
The pilot includes access to:
- Natural language query interface with LLM-powered SQL generation
- Dataset catalog and metadata management
- Config Copilot for specification generation
- Approval workflow system
- AUREUS Guard policy engine and audit logging
- Observability dashboard

Detailed scope is defined in PILOT_REQUIREMENTS.md (incorporated by reference).

### 1.3 Pilot Limitations
Customer acknowledges the following pilot limitations:
- Platform provided "as-is" for evaluation purposes
- Limited to pre-production use cases only
- No production data processing commitments
- No service level agreements (SLAs) during pilot
- Features and capabilities subject to change

---

## 2. Pilot Term and Termination

### 2.1 Pilot Duration
The pilot will commence on the Effective Date and continue for **twelve (12) weeks** unless earlier terminated or extended as provided herein ("Pilot Term").

### 2.2 Extension
Either party may request a pilot extension of up to four (4) additional weeks by providing written notice at least two (2) weeks before the end of the Pilot Term. Extensions are subject to mutual written agreement.

### 2.3 Termination for Convenience
Either party may terminate this Agreement at any time with seven (7) days' written notice to the other party.

### 2.4 Termination for Cause
Either party may terminate immediately upon written notice if:
- The other party materially breaches this Agreement and fails to cure within five (5) business days
- The other party becomes insolvent or files for bankruptcy
- A critical security vulnerability is discovered that cannot be mitigated

### 2.5 Effect of Termination
Upon termination:
- Customer's access to the Platform will be revoked within 24 hours
- Customer must cease all use of the Platform
- Customer may retain data exported during the Pilot Term
- Provider will delete Customer data within 30 days (unless otherwise requested)
- Neither party has further obligations except as expressly stated herein

---

## 3. Pilot Fees and Expenses

### 3.1 Pilot Pricing

**Option A: Free Pilot** (Selected: [ ])
- No license fees during Pilot Term
- Customer responsible for infrastructure costs (if self-hosted)
- Customer provides LLM API credentials (OpenAI/Azure)
- Implementation support included

**Option B: Paid Pilot** (Selected: [ ])
- One-time pilot fee: **$10,000 USD**
- Payment due within 30 days of Effective Date
- Includes cloud hosting (if cloud-hosted option selected)
- Includes LLM API costs (up to $2,000)
- Implementation support included

### 3.2 Customer Infrastructure Costs
If Customer selects self-hosted deployment, Customer is responsible for:
- Cloud infrastructure costs (AWS/Azure/GCP)
- LLM API costs (OpenAI or Azure OpenAI)
- Network and security infrastructure

Estimated monthly costs: $500-$2,000 depending on usage.

### 3.3 Out-of-Scope Costs
The following are not included and will be billed separately if requested:
- On-site implementation support: $5,000 per week plus expenses
- Custom feature development: To be quoted
- Extended support beyond business hours: $250/hour
- Third-party security audit: Customer responsibility

---

## 4. Roles and Responsibilities

### 4.1 Provider Responsibilities

**Implementation Support**:
- Dedicated implementation engineer (8am-6pm Customer timezone)
- Platform deployment and configuration
- Dataset registration and testing
- User training (2-hour initial session + ongoing support)
- Bug fixes and troubleshooting

**Communication**:
- Daily standup meetings (15 minutes)
- Weekly check-in calls (1 hour)
- Slack channel for real-time support (response <2 hours)
- Email support (response <4 hours business days)
- Emergency hotline (response <1 hour for P0 issues)

**Documentation**:
- Platform user guide
- API documentation
- Security documentation
- Compliance mapping (SOC 2, GDPR, PCI DSS)

### 4.2 Customer Responsibilities

**Personnel**:
- Executive Sponsor (1 hour/week)
- Pilot Lead - dedicated point of contact (50% time allocation)
- Technical Lead - infrastructure and data access (as needed)
- Power Users - 2-3 users for daily testing (10 hours/week each)
- Pilot Users - 10-20 users for broader evaluation

**Infrastructure** (if self-hosted):
- Provision compute resources (2 vCPUs, 4GB RAM minimum)
- Provide storage (50GB for evidence and logs)
- Configure network access (HTTPS, ports 443 and 5000)
- Provide LLM API credentials (OpenAI or Azure OpenAI)

**Data Preparation**:
- Identify 3-10 datasets for pilot
- Document schema (column names, types, descriptions)
- Classify data (PII levels, jurisdiction tags)
- Provide sample data (100K-1M rows per dataset)
- Grant data access to Platform (read-only credentials)

**Feedback and Engagement**:
- Attend daily standups and weekly check-ins
- Complete weekly feedback surveys
- Report bugs and issues promptly
- Participate in end-of-pilot evaluation

---

## 5. Data and Privacy

### 5.1 Customer Data
"Customer Data" means all data provided by Customer or accessed by the Platform on Customer's behalf, including datasets, query results, user information, and audit logs.

### 5.2 Data Ownership
Customer retains all ownership rights in Customer Data. Provider acquires no rights in Customer Data except as necessary to provide the Platform during the Pilot Term.

### 5.3 Data Usage by Provider
Provider may use Customer Data only to:
- Provide and operate the Platform
- Troubleshoot issues and provide support
- Generate aggregate, anonymized analytics (with Customer consent)

Provider will NOT:
- Sell or license Customer Data to third parties
- Use Customer Data to train LLM models
- Share Customer Data with competitors
- Use Customer Data for marketing without explicit consent

### 5.4 Data Protection
Provider will implement commercially reasonable security measures to protect Customer Data, including:
- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Access controls and authentication
- Audit logging of all data access
- Regular security assessments

### 5.5 Data Deletion
Upon termination, Provider will:
- Delete all Customer Data within 30 days
- Provide written confirmation of deletion
- Retain audit logs for 90 days (compliance requirement)
- Delete audit logs after 90 days unless legally required to retain

### 5.6 Data Breach Notification
If Provider becomes aware of unauthorized access to Customer Data, Provider will:
- Notify Customer within 24 hours of discovery
- Provide details of the breach and affected data
- Implement immediate remediation measures
- Cooperate with Customer's investigation

---

## 6. Intellectual Property

### 6.1 Provider IP
Provider retains all ownership rights in the Platform, including:
- Software code and algorithms
- Documentation and training materials
- Trademarks and branding
- Improvements and enhancements developed during the Pilot

### 6.2 Customer IP
Customer retains all ownership rights in:
- Customer Data
- Business processes and workflows
- Domain expertise and requirements

### 6.3 Feedback
Customer may provide feedback, suggestions, and feature requests ("Feedback"). Customer grants Provider a perpetual, irrevocable, worldwide, royalty-free license to use Feedback to improve the Platform.

### 6.4 Confidential Information
Each party may disclose confidential information to the other during the pilot. Receiving party agrees to:
- Use confidential information only for purposes of this Agreement
- Protect confidential information with same care as own confidential information
- Not disclose to third parties without prior written consent
- Return or destroy confidential information upon termination

Confidential information does not include information that:
- Is publicly available through no breach of this Agreement
- Is independently developed without use of confidential information
- Is rightfully received from a third party
- Is required to be disclosed by law (with notice to disclosing party)

---

## 7. Warranties and Disclaimers

### 7.1 Provider Warranties
Provider warrants that:
- It has the right to provide the Platform
- The Platform will perform substantially as described
- It will use commercially reasonable efforts to provide support

### 7.2 Customer Warranties
Customer warrants that:
- It has the right to provide Customer Data to Provider
- Customer Data does not violate any third-party rights
- It will comply with all applicable laws and regulations

### 7.3 DISCLAIMER
**THE PLATFORM IS PROVIDED "AS-IS" FOR PILOT EVALUATION PURPOSES. PROVIDER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. PROVIDER DOES NOT WARRANT THAT THE PLATFORM WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.**

---

## 8. Limitation of Liability

### 8.1 Liability Cap
**TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVIDER'S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE FEES PAID BY CUSTOMER DURING THE PILOT TERM (OR $10,000 IF NO FEES PAID).**

### 8.2 Excluded Damages
**NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.**

### 8.3 Exceptions
The liability limitations above do not apply to:
- Either party's gross negligence or willful misconduct
- Customer's obligations to pay fees
- Either party's indemnification obligations
- Violations of confidentiality obligations
- Data breach caused by Provider's security failures

---

## 9. Indemnification

### 9.1 Provider Indemnification
Provider will indemnify and defend Customer against third-party claims that the Platform infringes intellectual property rights, provided Customer:
- Promptly notifies Provider of the claim
- Grants Provider sole control of defense and settlement
- Cooperates reasonably with Provider

Provider may, at its option:
- Obtain rights for Customer to continue using the Platform
- Replace or modify the Platform to be non-infringing
- Refund fees paid and terminate this Agreement

### 9.2 Customer Indemnification
Customer will indemnify and defend Provider against third-party claims arising from:
- Customer Data (including claims of infringement, privacy violations)
- Customer's use of the Platform in violation of this Agreement
- Customer's negligence or willful misconduct

---

## 10. Security and Compliance

### 10.1 Security Standards
Provider will maintain security controls reasonably designed to protect Customer Data, including:
- Prompt injection defense and input validation
- Automatic PII masking based on user roles
- SQL injection prevention
- Audit logging of all actions
- Role-based access control

### 10.2 Compliance
Provider represents that the Platform is designed to support Customer's compliance with:
- GDPR (General Data Protection Regulation)
- PCI DSS (Payment Card Industry Data Security Standard)
- SOC 2 Type II (in progress, expected completion Q3 2026)

**Customer acknowledges that Customer is solely responsible for its own compliance obligations and must independently verify the Platform's suitability.**

### 10.3 Security Assessments
Customer may conduct security assessments of the Platform, including:
- Vulnerability scans (with 5 business days' notice)
- Penetration testing (with 10 business days' notice, approved scope)
- Code review (for customer-deployed components)

Provider will remediate critical vulnerabilities within 5 business days.

---

## 11. Success Criteria and Production Conversion

### 11.1 Success Metrics
Pilot success will be evaluated based on:
- User adoption rate (target: >70% weekly active users)
- Query success rate (target: >90%)
- Net Promoter Score (target: >40)
- Time to insight (target: <5 minutes)
- Policy compliance (target: 100% for high-risk actions)

Detailed metrics defined in PILOT_REQUIREMENTS.md.

### 11.2 Production Conversion
If pilot is successful, parties will negotiate a production agreement including:
- Software licensing terms
- Service level agreements (SLAs)
- Support and maintenance
- Pricing and payment terms
- Multi-year commitment options

### 11.3 No Obligation to Convert
Customer has no obligation to convert to a production agreement. Provider has no obligation to offer production services.

### 11.4 Right of First Refusal (Optional)
If Customer elects to deploy a competing platform within 6 months of pilot completion, Customer will first offer Provider the opportunity to match competitor's pricing and terms. (Selected: [ ])

---

## 12. General Provisions

### 12.1 Governing Law
This Agreement shall be governed by the laws of [State/Country], without regard to conflicts of law principles.

### 12.2 Dispute Resolution
Any disputes will be resolved through:
1. Good faith negotiation (30 days)
2. Mediation (if negotiation fails)
3. Binding arbitration (if mediation fails)

### 12.3 Entire Agreement
This Agreement, including incorporated documents (PILOT_REQUIREMENTS.md), constitutes the entire agreement and supersedes all prior agreements and understandings.

### 12.4 Amendments
This Agreement may be amended only by written agreement signed by both parties.

### 12.5 Waiver
Failure to enforce any provision does not constitute a waiver of future enforcement.

### 12.6 Severability
If any provision is found invalid, the remaining provisions remain in effect.

### 12.7 Assignment
Neither party may assign this Agreement without prior written consent, except to a successor in connection with a merger or acquisition.

### 12.8 Notices
All notices must be in writing and delivered to:

**Provider**:  
AUREUS Platform  
Attn: Legal Department  
Email: legal@aureus-platform.com

**Customer**:  
[Name]  
[Address]  
Email: [_______________]

### 12.9 Force Majeure
Neither party is liable for delays caused by events beyond its reasonable control (natural disasters, pandemics, war, government actions, etc.).

### 12.10 Publicity
Neither party may issue press releases or use the other party's name/logo without prior written consent. Provider may include Customer as a reference customer with consent.

---

## SIGNATURE PAGE

**PROVIDER: AUREUS Platform**

Signature: ________________________________  
Name: [Print Name]  
Title: [Title]  
Date: _____________

**CUSTOMER: [Customer Legal Name]**

Signature: ________________________________  
Name: [Print Name]  
Title: [Title]  
Date: _____________

---

## EXHIBITS

### Exhibit A: Pilot Configuration
- [ ] Cloud-hosted (Provider infrastructure)
- [ ] Customer VPC (Customer cloud account)
- [ ] On-premises (Customer data center)

**Datasets**: [List 3-10 datasets]

**Users**: [Number of users by role]
- Analysts: ___
- Approvers: ___
- Admins: ___
- Viewers: ___

**Pilot Duration**: 12 weeks from [Start Date]

### Exhibit B: Pricing (if Paid Pilot selected)
- Pilot Fee: $________
- Payment Terms: Net 30
- Currency: USD

### Exhibit C: Infrastructure Details (if self-hosted)
- Cloud Provider: [ ] AWS [ ] Azure [ ] GCP [ ] Other: ______
- Region: ____________
- Instance Type: ____________
- LLM API: [ ] OpenAI [ ] Azure OpenAI

### Exhibit D: Support Contacts

**Provider Contacts**:
- **Implementation Engineer**: implementations@aureus-platform.com | +1 (415) 555-0102
- **Product Manager**: product@aureus-platform.com | +1 (415) 555-0103
- **Technical Support**: support@aureus-platform.com | +1 (415) 555-0101 (24/7)
- **Security Team**: security@aureus-platform.com
- **Emergency Hotline**: +1 (415) 555-0911 (Critical Issues)

**Customer Contacts**:
- Executive Sponsor: [Name, Email, Phone]
- Pilot Lead: [Name, Email, Phone]
- Technical Lead: [Name, Email, Phone]

---

**Document Version**: 1.0  
**Date**: January 31, 2026  
**Status**: Template (To be customized for each customer)
