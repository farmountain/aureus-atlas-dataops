# AUREUS Platform - Pilot Program Requirements

**Version**: 1.0  
**Date**: January 31, 2026  
**Status**: Ready for Pilot Deployment  

---

## Executive Summary

This document defines requirements, scope, and success criteria for AUREUS Platform pilot deployments with early customers. The pilot phase validates product-market fit, gathers feedback, and demonstrates value before full production rollout.

**Pilot Duration**: 8-12 weeks  
**Target Customers**: Mid-tier banks ($20B-$50B assets), Credit Risk teams  
**Deployment Model**: Cloud-hosted (AWS/Azure) or on-premises  
**Support Model**: Dedicated implementation team + daily check-ins  

---

## 1. Pilot Objectives

### Primary Goals
1. **Validate Core Use Cases** - Confirm natural language query + governance workflow solves real problems
2. **Gather Feature Feedback** - Identify missing capabilities for production readiness
3. **Demonstrate ROI** - Measure time savings, accuracy improvements, compliance benefits
4. **Build Reference Stories** - Create testimonials, case studies for future sales

### Success Metrics
- **Adoption Rate**: >70% of invited users actively use platform weekly
- **Query Success Rate**: >90% of natural language queries execute successfully
- **Time to Insight**: <5 minutes from question to answer (vs. 2-5 days baseline)
- **User Satisfaction**: Net Promoter Score (NPS) >40
- **Governance Compliance**: 100% of high-risk actions go through approval workflow

---

## 2. Scope - What's Included in Pilot

### ✅ **Core Features (Available Now)**

#### Natural Language Query Interface
- Ask data questions in plain English
- Automatic SQL generation from intent
- Policy-based access control
- Query history and audit trail
- Evidence pack generation
- **Limitation**: Queries limited to pre-registered datasets

#### Dataset Catalog
- Browse 5 sample banking datasets
- Complete metadata (schema, PII, jurisdiction, SLA)
- Search and filter capabilities
- Schema inspection
- **Limitation**: Manual dataset registration required

#### Config Copilot
- Natural language → structured specifications
- Auto-generate: Dataset contracts, DQ rules, Policies, SLAs
- JSON schema validation
- AUREUS Guard integration
- **Limitation**: Frontend-only (no persistent storage)

#### Approval Workflow
- Role-based access (Analyst, Approver, Admin, Viewer)
- Pending request queue
- Evidence review interface
- Approval/rejection with comments
- **Limitation**: Simulated email notifications

#### AUREUS Guard
- Policy engine with 15+ pre-configured policies
- Budget enforcement (token limits, query costs)
- Audit logging (all actions tracked)
- Snapshot and rollback capability
- **Limitation**: In-memory storage (resets on restart)

#### Security Features (✅ NEW - Jan 31, 2026)
- Prompt injection defense (integrated into all LLM calls)
- Automatic PII masking (role-based)
- Input validation (CRITICAL/HIGH risk auto-blocked)
- SQL injection prevention
- Output validation

#### Observability
- Token usage tracking
- Query cost estimation
- Latency monitoring
- Budget alerts
- **Limitation**: UI-only metrics (no Prometheus export)

### ⚠️ **Limitations - Not Included in Pilot**

#### Backend Services
- ❌ Real database execution (uses simulated sandbox)
- ❌ Persistent storage beyond browser (state resets on refresh)
- ❌ Multi-user coordination (no shared state)
- ❌ Server-side rate limiting (client-side only)

#### Authentication
- ❌ Real SSO integration (OIDC/SAML)
- ❌ MFA enforcement
- ❌ Session management
- ❌ User provisioning
- **Workaround**: Role switching via UI (demo purposes)

#### Data Integration
- ❌ Snowflake connector
- ❌ dbt integration
- ❌ Real-time data refresh
- ❌ Custom data source connections
- **Workaround**: Use sample datasets provided

#### Advanced Features
- ❌ Column-level lineage
- ❌ Visual lineage graphs
- ❌ Impact analysis
- ❌ ML model governance
- ❌ Cost attribution by team

#### Enterprise Operations
- ❌ High availability (HA) deployment
- ❌ Disaster recovery (DR)
- ❌ Auto-scaling
- ❌ Prometheus metrics export
- ❌ SIEM integration

---

## 3. Technical Requirements

### Customer Prerequisites

#### Infrastructure
- **Cloud**: AWS, Azure, or GCP account with admin access
- **Compute**: Minimum 2 vCPUs, 4GB RAM per instance
- **Storage**: 50GB for evidence and logs
- **Network**: HTTPS access, ports 443 and 5000

#### Data Requirements
- **Datasets**: 3-10 datasets for pilot scope
- **Schema Documentation**: Column names, types, descriptions
- **Data Dictionary**: PII flags, business definitions
- **Sample Data**: 100K-1M rows per dataset (for testing)

#### User Access
- **Pilot Users**: 10-20 users across roles
  - 5-10 Analysts (query users)
  - 2-3 Approvers (governance reviewers)
  - 1-2 Admins (platform administrators)
  - 2-3 Viewers (read-only)
- **Email Addresses**: For notifications and access provisioning
- **Roles/Permissions**: Existing org chart for role mapping

#### Security & Compliance
- **Network Security**: Firewall rules, VPN access
- **Data Classification**: PII levels, jurisdiction tags
- **Compliance Requirements**: SOC 2, GDPR, PCI DSS applicability
- **Audit Requirements**: Log retention, access reviews

### AUREUS Platform Deployment

#### Deployment Options

**Option A: Cloud-Hosted (Recommended for Pilot)**
- AUREUS deploys and manages infrastructure
- Customer provides data access credentials
- Fastest time to value (2-3 days setup)
- Easiest for pilot phase

**Option B: Customer VPC**
- Deployed in customer's cloud account
- Full data residency control
- Requires customer DevOps support
- Setup time: 1-2 weeks

**Option C: On-Premises**
- Deployed in customer data center
- Maximum security control
- Requires customer infrastructure team
- Setup time: 2-4 weeks

#### System Dependencies
- **LLM API**: OpenAI GPT-4 or Azure OpenAI (API key required)
- **Database**: PostgreSQL 14+ (for metadata, audit logs)
- **Cache**: Redis 6+ (for rate limiting, sessions)
- **Storage**: S3/Azure Blob (for evidence packs)

---

## 4. Pilot Timeline

### Week 0: Pre-Pilot Setup (1 week)
- [ ] Kick-off meeting
- [ ] Sign pilot agreement
- [ ] Provision infrastructure
- [ ] Configure SSO (if applicable)
- [ ] Load sample datasets
- [ ] User training (2-hour session)

### Weeks 1-4: Initial Validation (4 weeks)
- [ ] Daily standup (15 min)
- [ ] Use case 1: Ad-hoc queries (Week 1)
- [ ] Use case 2: Dataset onboarding (Week 2)
- [ ] Use case 3: Pipeline generation (Week 3)
- [ ] Use case 4: Approval workflows (Week 4)
- [ ] Weekly feedback sessions
- [ ] Bug fixes and quick wins

### Weeks 5-8: Expansion & Refinement (4 weeks)
- [ ] Add more datasets (5-10 total)
- [ ] Expand user base (20+ users)
- [ ] Advanced use cases (custom policies)
- [ ] Performance optimization
- [ ] Integration testing
- [ ] ROI measurement

### Weeks 9-12: Production Prep (4 weeks)
- [ ] Security review
- [ ] Compliance validation
- [ ] Production cutover planning
- [ ] Training for additional users
- [ ] Handover to support team
- [ ] Executive review & decision

---

## 5. Use Cases - Credit Risk Focus

### Primary Use Cases

#### UC-1: Portfolio Risk Analysis
**Actor**: Credit Risk Analyst  
**Goal**: Analyze loan portfolio by risk rating  
**Sample Questions**:
- "What is the total outstanding balance for high-risk loans?"
- "Show me top 10 borrowers by exposure in the energy sector"
- "Calculate average PD by risk rating and vintage"

**Success Criteria**: Analyst gets answer in <3 minutes (vs. 2 days)

#### UC-2: Regulatory Reporting
**Actor**: Compliance Officer  
**Goal**: Generate regulatory reports with audit trail  
**Sample Questions**:
- "What is our total Tier 1 capital ratio?"
- "Show me all transactions >$10K in the last 30 days"
- "Calculate credit concentration by industry"

**Success Criteria**: Complete audit trail for every report

#### UC-3: Dataset Onboarding
**Actor**: Data Engineer  
**Goal**: Register new dataset with governance controls  
**Sample Input**: "Onboard credit card transaction dataset, daily refresh, high PII, US only"  
**Success Criteria**: Complete spec generated in <10 seconds

#### UC-4: High-Risk Query Approval
**Actor**: Risk Manager (Approver)  
**Goal**: Review and approve sensitive data access  
**Trigger**: Analyst queries high-PII dataset  
**Success Criteria**: Approver reviews evidence and decides within 1 business day

---

## 6. Roles & Responsibilities

### AUREUS Team

#### Implementation Engineer (Dedicated)
- Infrastructure setup and configuration
- Dataset registration and testing
- Bug fixes and troubleshooting
- Daily availability (8am-6pm customer timezone)

#### Product Manager
- Weekly check-ins
- Feature prioritization
- Roadmap alignment
- Escalation point

#### Security Engineer (On-Call)
- Security review and hardening
- Compliance documentation
- Vulnerability response
- Incident handling

### Customer Team

#### Executive Sponsor
- Budget approval
- Resource allocation
- Success criteria approval
- Go/no-go decision

#### Pilot Lead (Customer Point of Contact)
- Day-to-day coordination
- User feedback collection
- Issue prioritization
- Success metrics tracking

#### Technical Lead
- Infrastructure provisioning
- Data access provisioning
- Integration support
- Security review

#### Power Users (2-3)
- Daily platform usage
- Feature testing
- Training other users
- Feedback champions

---

## 7. Success Criteria

### Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User Adoption | >70% weekly active users | Platform analytics |
| Query Success Rate | >90% | Query logs |
| Time to Insight | <5 minutes | User survey |
| Policy Compliance | 100% high-risk approvals | Audit logs |
| Uptime | >99% | Monitoring dashboard |
| Response Time P95 | <3 seconds | Observability metrics |

### Qualitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User Satisfaction | NPS >40 | End-of-pilot survey |
| Feature Completeness | >80% use cases supported | Feature checklist |
| Ease of Use | "Easy" or "Very Easy" >70% | User survey |
| Security Confidence | "Confident" >80% | Security questionnaire |
| Recommendation | Would recommend >70% | Exit interview |

### Business Outcomes

- **Time Savings**: 80% reduction in time to answer data questions
- **Cost Avoidance**: Reduced SQL training costs ($50K/year)
- **Risk Mitigation**: Zero compliance violations during pilot
- **Productivity Gain**: 20% increase in analyst output

---

## 8. Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM generates incorrect SQL | Medium | High | Manual SQL review, validation rules, unit tests |
| Performance degradation | Low | Medium | Load testing, query optimization, caching |
| Data quality issues | Medium | Medium | DQ checks, validation rules, monitoring |
| Integration failures | Low | Medium | Thorough testing, fallback mechanisms |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low user adoption | Medium | High | Training, champions program, easy wins |
| Feature gaps | High | Medium | Prioritized roadmap, quick iterations |
| Security concerns | Low | High | Comprehensive security review, audits |
| Budget overruns | Low | Low | Fixed pilot pricing, clear scope |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Key person turnover | Low | Medium | Documentation, knowledge transfer |
| Pilot scope creep | Medium | Medium | Change control process, steering committee |
| Vendor dependency | Low | High | Clear SLAs, escalation procedures |

---

## 9. Exit Criteria

### Pilot Success = Production Go-Ahead

**Required Outcomes** (All must be met):
1. ✅ >70% user adoption rate
2. ✅ >90% query success rate
3. ✅ NPS >40
4. ✅ Zero critical security issues
5. ✅ Executive sponsor approval

**Sufficient Outcomes** (2 of 3 must be met):
1. ✅ 80% reduction in time to insight
2. ✅ 100% policy compliance
3. ✅ Would recommend >70%

### Pilot Failure = End Engagement

**Blocking Issues** (Any one blocks production):
1. ❌ <50% user adoption after 8 weeks
2. ❌ Critical security vulnerability
3. ❌ <70% query success rate
4. ❌ NPS <0 (detractors > promoters)
5. ❌ Executive sponsor decision to end

### Pilot Extension = 4 Additional Weeks

**Extension Criteria** (2 of 3 must be met):
1. ⚠️ 50-70% user adoption (needs improvement)
2. ⚠️ 70-90% query success rate (close but needs work)
3. ⚠️ Positive feedback but missing critical features

---

## 10. Pricing - Pilot Phase

### Pilot Program Pricing

**Option 1: Free Pilot (Preferred)**
- **Cost**: $0 for 12 weeks
- **Requirements**:
  - Active participation (>70% weekly usage by invited users)
  - Weekly feedback sessions (30 minutes each)
  - Willingness to provide reference/testimonial upon successful completion
  - Case study participation (optional, with customer approval)
  - Mutual NDA signing
- **Post-Pilot Commitment**: 
  - No obligation to purchase
  - If customer proceeds to production, standard commercial terms apply
  - **Reference customer discount**: 15% off Year 1 pricing
  - **Early adopter benefits**: Priority feature requests, quarterly executive reviews

**Option 2: Paid Pilot**
- **Cost**: $10,000 flat fee for 12-week pilot
- **Included**:
  - Full platform access (all features)
  - Dedicated implementation engineer
  - Priority support (4-hour response time)
  - Infrastructure hosting (AWS/Azure cloud)
  - Up to 20 pilot users
- **Post-Pilot Commitment**:
  - No obligation to purchase
  - **Production discount**: 50% off first year if converted within 30 days
  - Pilot fee credited toward first production invoice

### Post-Pilot Production Pricing

**Per-User Licensing**:
- Analyst: $200/user/month
- Approver: $300/user/month
- Admin: $500/user/month
- Viewer: $100/user/month

**Platform Fee**:
- Base: $5,000/month (up to 50 users)
- Enterprise: $20,000/month (unlimited users)

**Implementation Services** (Optional):
- Standard: $25K (4 weeks, remote)
- Premium: $50K (8 weeks, on-site)

**Example Total Cost** (30 users):
- 20 Analysts × $200 = $4,000
- 5 Approvers × $300 = $1,500
- 2 Admins × $500 = $1,000
- 3 Viewers × $100 = $300
- Platform Base = $5,000
- **Total: $11,800/month or $141,600/year**

**ROI Justification**: Saves $500K/year in training costs + productivity gains worth $1M+

---

## 11. Support Model - Pilot Phase

### AUREUS Support

**Daily Standups** (15 minutes)
- Status update
- Blockers resolution
- Priority setting

**Weekly Check-ins** (1 hour)
- Feature demos
- Feedback review
- Roadmap alignment

**On-Demand Support**
- Slack channel (response <2 hours)
- Email support (response <4 hours)
- Emergency hotline (response <1 hour)

### Customer Commitments

- Dedicated pilot lead (50% time)
- Power users (10 hours/week each)
- Executive sponsor (1 hour/week)
- Technical lead (as needed)

---

## 12. Next Steps

### To Start Pilot

1. **Sign Pilot Agreement** (see PILOT_AGREEMENT_TEMPLATE.md)
2. **Complete Pre-Pilot Checklist**:
   - [ ] Identify 3-10 datasets for pilot
   - [ ] Document schema and PII flags
   - [ ] Provision infrastructure (if customer-hosted)
   - [ ] Provide LLM API key (OpenAI or Azure)
   - [ ] List pilot users with roles
3. **Schedule Kick-off Meeting** (2 hours)
   - Platform walkthrough
   - Use case planning
   - Timeline confirmation
   - Q&A
4. **Begin Week 0 Setup**

### Questions?

**AUREUS Contact Information:**
- **Sales & Onboarding**: sales@aureus-platform.com | +1 (415) 555-0100
- **Technical Support**: support@aureus-platform.com | +1 (415) 555-0101  
- **Product Team**: product@aureus-platform.com
- **Security Team**: security@aureus-platform.com
- **Emergency Hotline**: +1 (415) 555-0911 (24/7)
- **Website**: www.aureus-platform.com
- **Documentation**: docs.aureus-platform.com
- **Company Address**: 123 Tech Hub Drive, Suite 400, San Francisco, CA 94105

---

**Document Version Control**:
- v1.0 (Jan 31, 2026): Initial pilot requirements
- Next Review: Post first pilot completion
