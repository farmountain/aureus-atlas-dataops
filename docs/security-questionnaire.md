# AUREUS Platform - Security Questionnaire
## Standard Responses for Customer Security Reviews

**Version**: 1.0  
**Date**: January 31, 2026  
**Classification**: Public  
**Last Updated**: Post Security Enhancement (Jan 31, 2026)

---

## 1. General Security

### 1.1 Do you have a documented information security policy?
**Yes.** AUREUS maintains comprehensive security policies covering:
- Access control and authentication
- Data protection and encryption
- Incident response procedures
- Vulnerability management
- Security awareness training

Documentation available upon request under NDA.

### 1.2 What security certifications do you have?
**In Progress:**
- **SOC 2 Type II**: Expected completion Q3 2026
- **ISO 27001**: Planned for 2027

**Current Compliance Support:**
- GDPR-ready architecture
- PCI DSS compliant design patterns
- HIPAA-compatible controls available

### 1.3 Do you perform regular security assessments?
**Yes.** Security assessments include:
- **Vulnerability Scanning**: Monthly automated scans
- **Penetration Testing**: Annual third-party testing
- **Code Reviews**: All code changes reviewed for security
- **Dependency Audits**: Weekly automated dependency checks

Most recent penetration test: [To be completed - planned Q2 2026]

### 1.4 Do you have a bug bounty program?
**Planned.** We plan to launch a private bug bounty program in Q2 2026. Currently, we accept responsible disclosure at: security@aureus-platform.com

---

## 2. Application Security

### 2.1 How do you secure the application?

**Multi-Layer Security Approach:**

**Input Validation** (✅ Implemented Jan 31, 2026):
- Prompt injection defense on all LLM inputs
- SQL injection prevention
- XSS protection
- CSRF tokens on all state-changing operations
- Input sanitization and size limits

**Output Validation** (✅ Implemented Jan 31, 2026):
- LLM output validation for schema compliance
- SQL output validation (SELECT-only enforcement)
- Response size limits
- Content Security Policy (CSP) headers

**Authentication & Authorization**:
- JWT-based authentication (production)
- Role-based access control (RBAC)
- Principle of least privilege
- Session timeouts (15 minutes idle)

**Data Protection** (✅ Enhanced Jan 31, 2026):
- Automatic PII masking based on user role
- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Secure credential storage (no plaintext secrets)

### 2.2 How do you protect against prompt injection attacks?
**Comprehensive Defense** (✅ Implemented Jan 31, 2026):

AUREUS includes a prompt injection defense module integrated into all LLM interaction points:

**Pre-LLM Validation:**
- Pattern matching for known injection techniques
- Detection of instruction override attempts
- Suspicious SQL keyword filtering
- Tool execution request blocking
- Encoded payload detection

**Post-LLM Validation:**
- Generated SQL validation (SELECT-only)
- Multi-statement detection
- Dangerous keyword blocking
- Table access restriction
- Output schema validation

**Risk Levels:**
- CRITICAL risks: Automatically blocked
- HIGH risks: Automatically blocked
- MEDIUM risks: Logged and monitored
- LOW risks: Allowed with logging

All validation failures are logged with full context for security monitoring.

### 2.3 How do you handle SQL injection?
**Three-Layer Protection:**

1. **Input Layer**: User queries validated before LLM processing
2. **Generation Layer**: LLM-generated SQL validated before execution
3. **Execution Layer**: Parameterized queries + read-only database user

**SQL Validation Checks:**
- Must start with SELECT (no DML/DDL)
- No destructive keywords (DROP, DELETE, TRUNCATE, etc.)
- No multi-statement injection (`;` detection)
- No SQL comments (obfuscation prevention)
- Table whitelist enforcement

### 2.4 What is your secure SDLC process?
**Development Lifecycle:**

1. **Design**: Threat modeling, security requirements
2. **Development**: Secure coding guidelines, code reviews
3. **Testing**: Automated security tests, manual penetration testing
4. **Deployment**: Infrastructure as code, automated security checks
5. **Operations**: Continuous monitoring, incident response
6. **Maintenance**: Regular patching, dependency updates

**Code Review Requirements:**
- All code reviewed by at least one other developer
- Security-focused review for sensitive changes
- Automated static analysis (SAST) on every commit

---

## 3. Data Security

### 3.1 How do you protect customer data?

**Data Protection Measures:**

**Encryption:**
- **In Transit**: TLS 1.3 for all network communication
- **At Rest**: AES-256 encryption for stored data
- **Key Management**: Secrets stored in AWS Secrets Manager / Azure Key Vault

**Access Controls:**
- Role-based access (Analyst, Approver, Admin, Viewer)
- Automatic PII masking (✅ implemented Jan 31, 2026)
- Policy-based data access restrictions
- Audit logging of all data access

**PII Protection** (✅ Enhanced Jan 31, 2026):
- Automatic detection of PII columns
- Role-based masking strategies:
  - Admin: Unmasked
  - Approver: Partial masking (shows last 4 chars)
  - Analyst: Redacted for high PII
  - Viewer: Full redaction
- Explicit approval required for PII unmasking

**Data Minimization:**
- Collect only necessary data
- Retention policies enforced
- Automatic deletion after retention period
- Right to erasure support (GDPR)

### 3.2 Where is data stored?
**Flexible Deployment:**

**Customer Choice:**
- **Cloud-Hosted**: AWS US-East-1 (default) or customer-specified region
- **Customer VPC**: Data remains in customer's cloud account
- **On-Premises**: Deployed in customer's data center

**Data Residency:**
- Configurable per customer requirements
- Supports EU, US, UK, APAC regions
- No cross-border data transfer without explicit consent

**Backup and Recovery:**
- Automated daily backups
- 30-day retention (configurable)
- Encrypted backups
- Tested recovery procedures (RTO: 4 hours, RPO: 1 hour)

### 3.3 Do you segregate customer data?
**Yes.** Multi-tenant architecture with strict isolation:

**Logical Separation:**
- Unique database schema per customer
- Row-level security policies
- Namespace isolation

**Physical Separation (Available):**
- Dedicated database instance (enterprise tier)
- Dedicated infrastructure (on-premises or VPC)

**Verification:**
- Automated testing of tenant isolation
- Regular audit of access controls
- Penetration testing includes isolation testing

### 3.4 What is your data retention policy?
**Configurable by Data Type:**

**Operational Data:**
- Query results: 90 days (default)
- Datasets: Until customer deletion
- Evidence packs: 7 years (regulatory compliance)
- Audit logs: 7 years (immutable)

**User Data:**
- User profiles: Active + 90 days after deactivation
- Session logs: 1 year
- Access logs: 7 years

**Deletion:**
- Secure deletion (overwrite + verification)
- Deletion confirmation provided
- Right to erasure honored within 30 days

---

## 4. Access Control

### 4.1 How do you manage user authentication?
**Production Authentication:**

**Primary Methods:**
- SSO via OIDC/SAML 2.0 (Okta, Azure AD, Auth0)
- MFA required for privileged accounts
- JWT tokens with short expiration (1 hour)
- Refresh tokens with rotation

**Password Requirements** (fallback):
- Minimum 12 characters
- Complexity requirements (upper, lower, number, special)
- Password history (last 5 passwords)
- Account lockout after 5 failed attempts

**Session Management:**
- Secure, HttpOnly, SameSite cookies
- 15-minute idle timeout
- Absolute timeout: 8 hours
- Concurrent session limits

### 4.2 What roles and permissions exist?
**Four Primary Roles:**

| Role | Permissions | Use Case |
|------|------------|----------|
| **Viewer** | Read-only access to approved datasets | Executives, auditors |
| **Analyst** | Query execution, pipeline viewing | Data analysts, business users |
| **Approver** | Approve high-risk actions | Managers, compliance officers |
| **Admin** | Full platform administration | IT administrators, data governance |

**Permissions Model:**
- Least privilege by default
- Explicit grants required
- Inheritance not allowed
- Regular access reviews (quarterly)

### 4.3 How do you handle privileged access?
**Privileged Access Management:**

**Admin Accounts:**
- Separate admin accounts (no shared accounts)
- MFA required
- All actions logged
- Time-limited elevated access
- Break-glass procedures for emergencies

**Database Access:**
- No direct database access in production
- Read-only user for query execution
- Admin access via bastion host only
- All queries logged

**Cloud Infrastructure:**
- IAM roles with least privilege
- No long-lived credentials
- Access keys rotated every 90 days
- CloudTrail logging enabled

---

## 5. Network Security

### 5.1 How is network traffic secured?
**Network Security Controls:**

**Transport Security:**
- TLS 1.3 for all communication
- HSTS enabled (strict transport security)
- Certificate pinning (mobile/desktop clients)

**Network Segmentation:**
- Frontend in DMZ
- Application tier isolated
- Database in private subnet
- No direct internet access to data tier

**Firewall Rules:**
- Whitelist-based (deny by default)
- Least privilege network access
- Regular rule review and cleanup

**DDoS Protection:**
- CloudFlare / AWS Shield
- Rate limiting at application layer (10 requests/min per user)
- Auto-scaling to handle traffic spikes

### 5.2 Do you use a WAF (Web Application Firewall)?
**Yes** (Production Deployments):
- AWS WAF / Azure WAF / CloudFlare WAF
- OWASP Top 10 protection
- Custom rules for banking industry
- Real-time threat intelligence

**WAF Rules:**
- SQL injection protection
- XSS protection
- Rate limiting
- Geo-blocking (configurable)
- Bot detection

### 5.3 How do you secure APIs?
**API Security:**

**Authentication:**
- JWT bearer tokens
- API keys for service-to-service
- OAuth 2.0 for third-party integrations

**Authorization:**
- Scope-based access control
- Rate limiting per API key
- Request signing for sensitive operations

**Input Validation:**
- JSON schema validation
- Request size limits
- Content-type enforcement

**Monitoring:**
- API usage metrics
- Anomaly detection
- Failed authentication tracking

---

## 6. Monitoring and Incident Response

### 6.1 What monitoring is in place?
**Comprehensive Monitoring:**

**Security Monitoring:**
- Failed authentication attempts
- Authorization failures
- Policy violations
- Anomalous query patterns
- Suspicious input patterns (prompt injection attempts)

**Performance Monitoring:**
- Query latency (P50, P95, P99)
- LLM response times
- Database connection pool
- Memory and CPU usage

**Business Monitoring:**
- Query success rate
- User adoption metrics
- Budget consumption
- Feature usage

**Alerting:**
- Real-time alerts for critical events (< 5 minutes)
- Escalation procedures
- On-call rotation
- PagerDuty / Opsgenie integration

### 6.2 Do you have an incident response plan?
**Yes.** Documented incident response plan includes:

**Incident Classification:**
- **P0 (Critical)**: Security breach, data loss, complete outage
- **P1 (High)**: Partial outage, performance degradation
- **P2 (Medium)**: Non-critical bugs, minor issues
- **P3 (Low)**: Cosmetic issues, feature requests

**Response Procedures:**
1. **Detection**: Automated alerts + user reports
2. **Triage**: Classify severity, assign owner
3. **Investigation**: Root cause analysis, impact assessment
4. **Containment**: Stop the breach, mitigate damage
5. **Remediation**: Fix root cause, deploy patch
6. **Recovery**: Restore service, verify resolution
7. **Post-Mortem**: Document lessons learned, improve processes

**Communication:**
- Status page for customer communication
- Email notifications for affected customers
- Incident summary provided within 24 hours
- Post-mortem shared within 1 week

### 6.3 Have you had any security incidents?
**As of January 31, 2026**: No reportable security incidents.

**Definition of Reportable Incident:**
- Unauthorized data access
- Data breach or loss
- Successful external attack
- Significant service disruption due to security

**Commitment:**
- We will notify customers within 24 hours of discovering any incident affecting their data
- We will provide regular updates during incident response
- We will share post-mortem and remediation plans

---

## 7. Compliance

### 7.1 What regulations do you comply with?
**Current Compliance Support:**

**GDPR (General Data Protection Regulation)**:
- ✅ Data minimization
- ✅ Right to erasure
- ✅ Data portability
- ✅ Consent management
- ✅ Data breach notification procedures

**PCI DSS (Payment Card Industry Data Security Standard)**:
- ✅ Encryption in transit and at rest
- ✅ Access control mechanisms
- ✅ Audit logging
- ⚠️ Full certification: Customer responsibility if processing card data

**SOC 2 Type II**:
- ⚠️ In progress (expected Q3 2026)
- Controls documented
- Evidence collection underway

**CCPA (California Consumer Privacy Act)**:
- ✅ Data access requests
- ✅ Data deletion requests
- ✅ Opt-out mechanisms

### 7.2 Can you provide compliance documentation?
**Available Documentation:**

**Immediately Available:**
- Security policy overview
- Data flow diagrams
- Network architecture diagrams
- Encryption specifications
- Access control matrix
- Incident response plan summary

**Available Under NDA:**
- Complete security policies
- Penetration test reports
- Vulnerability scan results
- Business continuity plan
- Disaster recovery procedures

**Coming Soon (Q3 2026):**
- SOC 2 Type II report
- ISO 27001 certificate

### 7.3 Do you support customer compliance requirements?
**Yes.** We design for compliance:

**Features Supporting Compliance:**
- Complete audit trails (immutable logs)
- Evidence pack generation (regulatory documentation)
- Policy engine (automated compliance controls)
- Data lineage tracking (transparency requirements)
- Approval workflows (human oversight for high-risk actions)
- Automatic PII masking (data minimization)

**Customer-Specific Requirements:**
- Willing to accommodate special compliance needs
- Custom policies can be configured
- Additional audit logging available
- Compliance consultation included

---

## 8. Third-Party Security

### 8.1 What third-party services do you use?
**Critical Dependencies:**

| Service | Purpose | Data Access | Compliance |
|---------|---------|-------------|------------|
| **AWS / Azure / GCP** | Infrastructure | Full | SOC 2, ISO 27001, FedRAMP |
| **OpenAI / Azure OpenAI** | LLM API | Query text only | SOC 2, GDPR |
| **Auth0 / Okta** | Authentication | User identity | SOC 2, ISO 27001 |
| **PostgreSQL** | Database | Full | Open source, self-managed |
| **Redis** | Caching | Session data | Open source, self-managed |

**No PII Sent to LLM:**
- User queries are validated before LLM
- Results are masked before display
- LLM sees only metadata, not actual data values

### 8.2 How do you vet third-party vendors?
**Vendor Security Assessment:**

**Selection Criteria:**
- SOC 2 Type II certified (preferred)
- ISO 27001 certified (preferred)
- Data processing agreement available
- Security incident history review
- Financial stability check

**Ongoing Monitoring:**
- Quarterly vendor security reviews
- Continuous monitoring of vendor incidents
- Regular renewal of data processing agreements
- Vendor access reviewed and re-approved annually

### 8.3 Do you have data processing agreements (DPAs)?
**Yes.** We maintain DPAs with all vendors processing customer data.

**DPA Contents:**
- Data processing purposes
- Security obligations
- Sub-processor disclosure
- Data breach notification requirements
- Audit rights
- Data deletion procedures

**Customer DPA:**
- We provide a standard DPA with pilot agreement
- Customization available for enterprise customers
- Compliant with GDPR Article 28

---

## 9. Business Continuity

### 9.1 What is your backup and recovery process?
**Backup Strategy:**

**Automated Backups:**
- **Frequency**: Daily incremental, weekly full
- **Retention**: 30 days (configurable up to 7 years)
- **Encryption**: AES-256 encrypted backups
- **Geographic Redundancy**: Backups stored in separate region

**Recovery Testing:**
- Monthly restore tests
- Quarterly disaster recovery drills
- Documented recovery procedures
- Verified RTOs and RPOs

**Recovery Objectives:**
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour (15 minutes for audit logs)

### 9.2 Do you have a business continuity plan?
**Yes.** Comprehensive BCP includes:

**Disaster Scenarios:**
- Data center outage
- Ransomware attack
- Key personnel loss
- Vendor failure
- Natural disaster

**Recovery Procedures:**
- Failover to backup region (automated)
- Disaster declaration process
- Communication tree
- Alternative work arrangements
- Vendor failover plans

**Testing:**
- Annual full BCP test
- Quarterly tabletop exercises
- Lessons learned documented

### 9.3 What is your uptime guarantee?
**Production SLAs** (Post-Pilot):

| Tier | Uptime SLA | Monthly Downtime |
|------|------------|------------------|
| **Standard** | 99.0% | < 7.2 hours |
| **Business** | 99.5% | < 3.6 hours |
| **Enterprise** | 99.9% | < 43 minutes |

**Pilot Phase**: No SLA (best effort support)

**Maintenance Windows:**
- Scheduled maintenance: Monthly, pre-announced
- Emergency maintenance: As needed, < 1 hour

---

## 10. Additional Questions

### 10.1 Do you perform background checks on employees?
**Yes.** All employees with access to customer data undergo:
- Criminal background check
- Employment verification
- Education verification
- Reference checks

### 10.2 Do you provide security training?
**Yes.** Mandatory security training includes:
- **Onboarding**: Security awareness, policies, procedures
- **Annual**: Refresher training, policy updates
- **Role-Specific**: Developers (secure coding), Support (incident response)
- **Ad-Hoc**: Security bulletins, threat briefings

### 10.3 Can we audit your security controls?
**Yes.** Audit rights include:
- Annual security questionnaire
- Virtual security review meetings
- Documentation review (under NDA)
- Third-party audit reports (SOC 2 when available)

**Physical/Technical Audits:**
- Penetration testing: With approval and coordinated scope
- Code review: For customer-deployed components
- Infrastructure review: Limited (cloud provider audits preferred)

### 10.4 How do you handle security vulnerabilities?
**Vulnerability Management Process:**

**Disclosure:**
- Responsible disclosure: security@aureus-platform.com
- Acknowledgment within 24 hours
- Status updates every 48 hours until resolution

**Remediation:**
- **Critical**: Patch within 24 hours
- **High**: Patch within 7 days
- **Medium**: Patch within 30 days
- **Low**: Patch in next release

**Notification:**
- Customers notified of critical vulnerabilities within 24 hours
- Patch notes provided
- Upgrade assistance offered

---

## Contact Information

**Security Team**:
- Email: security@aureus-platform.com
- Emergency: +1-XXX-XXX-XXXX (24/7)
- PGP Key: Available on request

**Responsible Disclosure**:
- security@aureus-platform.com
- Acknowledgment within 24 hours
- Bounty program (planned Q2 2026)

**Compliance Questions**:
- compliance@aureus-platform.com
- Response within 2 business days

---

**Document Control**:
- **Version**: 1.0
- **Last Updated**: January 31, 2026
- **Next Review**: Quarterly
- **Owner**: Security Team
- **Classification**: Public

*This questionnaire is updated regularly to reflect current security posture and capabilities. For the most current information, please contact security@aureus-platform.com.*
