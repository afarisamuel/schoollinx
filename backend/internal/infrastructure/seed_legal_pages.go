package infrastructure

import (
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

// SeedDefaultLegalPages populates initial legal documents if the table is empty.
func SeedDefaultLegalPages(db *gorm.DB) {
	var count int64
	if err := db.Model(&domain.LegalPage{}).Count(&count).Error; err != nil || count > 0 {
		return
	}

	now := time.Now()
	defaultPages := []domain.LegalPage{
		{
			ID:            uuid.New(),
			Slug:          "privacy-policy",
			Title:         "Privacy Policy & Data Protection",
			Category:      "Privacy & Compliance",
			Summary:       "How SchoolLinx collects, protects, isolates, and processes student, guardian, and institutional data under strict GDPR and local data protection regulations.",
			Version:       "v2.4",
			IsPublished:   true,
			EffectiveDate: &now,
			LastUpdatedBy: "System Governance",
			Content: `## 1. Executive Summary & Commitment to Data Isolation

SchoolLinx operates on a **dedicated tenant schema isolation architecture**. Unlike traditional single-database platforms, your institution's records (including biometric data, student grades, fee ledgers, and guardian contact details) are cryptographically and logically segregated in independent database namespaces.

We do **not** sell, rent, monetize, or harvest student or institutional data under any circumstance.

---

## 2. Information We Collect and Process

When an educational institution provisions an account or users interact with our platform, we collect:

- **Institutional Identity & Credentials**: School administrative contact details, authorized domain names, accreditation identifiers, and billing credentials.
- **Academic & Operational Records**: Student enrollments, class rosters, attendance timestamps, continuous assessments, examination marks, and report cards.
- **Financial & Payment Metadata**: Paystack transaction references, fee structure schedules, and receipt records. Credit card and banking details are processed directly by PCI-DSS Level 1 certified gateways and never stored on our servers.
- **Communication Logs**: Multi-carrier SMS transmission payloads, delivery receipts, emergency broadcast logs, and in-app notices.
- **Technical & Security Telemetry**: Session tokens, IP access logs, device fingerprints, and rate-limit audit records for unauthorized access detection.

---

## 3. Dedicated Tenant Isolation & Database Security

Every school onboarded to SchoolLinx receives an isolated PostgreSQL schema. Key security safeguards include:

- **AES-256 Cloud Encryption**: All data at rest is encrypted using customer-managed encryption keys (CMEK).
- **TLS 1.3 in Transit**: All data in flight across web sockets, public APIs, and administrative dashboards enforces TLS 1.3 with HSTS.
- **Row-Level and Schema-Level Access Controls**: Cross-tenant queries are prevented by architectural barriers at the database engine level.

---

## 4. Biometric & Guardian Pickup Verification

For institutions utilizing biometric time-clocks or QR pickup verification:
- Biometric templates are converted to unidirectional irreversible cryptographic hashes. Raw fingerprint or facial imagery is never retained.
- Pickup codes generated for guardians expire automatically upon verification and are permanently recorded in immutable audit logs.

---

## 5. Data Retention, Portability & Right to Erasure

- **Data Ownership**: The school retains full, unrestricted ownership of all student, parent, and institutional data.
- **One-Click Export**: SuperAdmins and School Principals can generate standardized JSON/CSV/PDF database archives at any time.
- **Right to Erasure**: Upon contract termination or verified GDPR/DPA request, tenant schemas are securely purged in accordance with DoD 5220.22-M sanitization standards.

---

## 6. Regulatory Compliance

SchoolLinx complies with:
- General Data Protection Regulation (GDPR - EU/UK)
- Data Protection Act (DPA)
- Family Educational Rights and Privacy Act (FERPA principles)
- WAEC & GES Institutional Data Processing Standards

---

## 7. Contact Our Data Protection Officer

For privacy inquiries, audit verification, or data subject access requests:
- **Email**: privacy@schoollinx.com
- **Legal Desk**: Data Governance Team, SchoolLinx Inc.`,
		},
		{
			ID:            uuid.New(),
			Slug:          "terms-of-service",
			Title:         "Institutional Terms of Service",
			Category:      "Terms & Conditions",
			Summary:       "Binding service terms, operational SLAs, uptime guarantees, multi-carrier SMS compliance, and billing agreements for SchoolLinx institutions.",
			Version:       "v2.1",
			IsPublished:   true,
			EffectiveDate: &now,
			LastUpdatedBy: "System Governance",
			Content: `## 1. Acceptance of Institutional Agreement

By provisioning a school node, accessing the SchoolLinx administrative dashboard, or utilizing our mobile and web applications, you agree to be bound by these Institutional Terms of Service on behalf of your school or educational organization.

---

## 2. Platform Availability & 99.99% Uptime SLA

- **Service Level Commitment**: SchoolLinx provides a guaranteed **99.99% monthly service uptime** across all core academic, attendance, and billing modules.
- **Maintenance Windows**: Scheduled maintenance occurs exclusively during designated low-traffic maintenance windows with at least 72 hours prior notification to school administrators.
- **Failover & Redundancy**: Multi-region database replication ensures sub-minute automated failover in the event of upstream cloud infrastructure disruption.

---

## 3. Account Responsibilities & Credential Governance

- **Administrative Authority**: The designated Primary SuperAdmin holds authority over staff role delegation, module permissions, and data export authorizations.
- **Multi-Factor Authentication (2FA)**: Institutions handling sensitive fiscal operations are strongly advised to enforce 2FA across all bursar and administrative accounts.
- **Compromise Notification**: Institutions must notify SchoolLinx Security Operations immediately upon discovering unauthorized account activity or credential leaks.

---

## 4. SMS Gateway, Delivery Rates & Compliance

- **Permissible Content**: The SMS gateway must be used solely for legitimate institutional communications including fee reminders, emergency alerts, attendance summaries, and student notices.
- **Sender ID Verification**: Custom alphanumeric Sender IDs are subject to regulatory telecommunications vetting before activation.
- **Unsolicited Messaging**: Mass unsolicited promotional broadcasts to external lists are strictly prohibited and will result in immediate API key suspension.

---

## 5. Subscription Fees, Invoicing & Billing Cycle

- **Billing Models**: Subscriptions are billed on a Per-Student Per-Term or Annual Enterprise tier as selected in the institutional agreement.
- **Grace Periods**: In the event of subscription renewal delays, schools receive a 14-day grace period during which full academic operations remain uninterrupted.
- **Refund Policy**: Software license subscriptions are non-refundable once active, but pro-rated credits may be applied for prepaid multi-term contracts.

---

## 6. Limitation of Liability

To the maximum extent permitted by applicable law, SchoolLinx shall not be liable for indirect, incidental, special, or consequential damages resulting from upstream carrier network delays or internet provider outages outside our direct control.`,
		},
		{
			ID:            uuid.New(),
			Slug:          "cookie-policy",
			Title:         "Cookie & Tracking Technology Policy",
			Category:      "Privacy & Compliance",
			Summary:       "Transparent disclosure of essential session tokens, telemetry, and preference cookies utilized by SchoolLinx.",
			Version:       "v1.5",
			IsPublished:   true,
			EffectiveDate: &now,
			LastUpdatedBy: "System Governance",
			Content: `## 1. What Are Cookies and Local Storage?

Cookies and local browser storage are small text files or key-value pairs stored on your device when you browse SchoolLinx portals. They are essential for maintaining authenticated sessions, saving appearance preferences, and preventing unauthorized cross-site attacks.

---

## 2. Categories of Cookies We Use

### A. Strictly Necessary (Essential)
These cookies and storage items are required for the platform to function securely. They cannot be disabled.
- **schoollinx_token / jwt_session**: Encrypted bearer authorization token used to authenticate your role-based API requests.
- **tenant_subdomain**: Identifies the school schema for routing requests to the appropriate isolated database.
- **csrf_token**: Prevents Cross-Site Request Forgery attacks.

### B. Preference & Interface Customization
- **theme_preference**: Remembers light, dark, or system appearance mode.
- **sidebar_collapsed**: Remembers administrative sidebar layout state.
- **schoollinx_cookie_consent**: Records your cookie preferences and prevents repetitive prompts.

### C. Operational Telemetry & Error Tracking
- **slx_telemetry_id**: Anonymous session identifier used exclusively to measure page load latencies, crash dumps, and API response health. Contains no student or personally identifiable information.

---

## 3. Third-Party Cookies

SchoolLinx does not host third-party advertising cookies, social media trackers, or retargeting pixels. Third-party interactions are strictly limited to:
- **Paystack / Payment Gateways**: Temporary fraud detection cookies loaded only inside secure checkout modal frames.

---

## 4. Managing Your Preferences

You can adjust your cookie settings at any time using the cookie preferences modal or by modifying your browser's security settings.`,
		},
		{
			ID:            uuid.New(),
			Slug:          "security-whitepaper",
			Title:         "Security & Compliance Whitepaper",
			Category:      "Security & Compliance",
			Summary:       "Detailed technical architecture on SchoolLinx schema isolation, cryptographic controls, disaster recovery, and infrastructure defense.",
			Version:       "v3.0",
			IsPublished:   true,
			EffectiveDate: &now,
			LastUpdatedBy: "Security Operations",
			Content: `## 1. Zero-Trust Cloud Architecture

SchoolLinx is engineered on a Zero-Trust security paradigm. Every API interaction is authenticated, authorized, and logged with millisecond granularity across edge firewalls, Go micro-engines, and PostgreSQL schema-isolated storage nodes.

---

## 2. Multi-Tenant Cryptographic Isolation

- **Schema Partitioning**: Each school's data resides in a distinct database schema. No shared tables exist for sensitive student and financial records.
- **Connection Pinning**: Queries dynamically set the PostgreSQL search path per tenant, preventing accidental cross-table bleeding.
- **Field-Level Encryption**: Sensitive identifiers (such as national IDs and emergency contact PINs) are encrypted using AES-GCM-256 before disk writes.

---

## 3. Disaster Recovery & Geo-Redundant Backups

- **Automated Hourly Snapshots**: PostgreSQL WAL logs and schema state are mirrored to geo-redundant encrypted object stores across multiple availability zones.
- **Recovery Point Objective (RPO)**: Under 5 minutes of transactional data.
- **Recovery Time Objective (RTO)**: Under 15 minutes for complete node reconstruction.
- **Disaster Drill Verification**: Automated recovery verification drills execute monthly in staging sandbox environments.

---

## 4. Vulnerability Management & Penetration Testing

- Continuous SAST and DAST scanning across all CI/CD deployment pipelines.
- Annual third-party penetration testing by CREST-accredited security auditors.
- Bug bounty vulnerability disclosure program for ethical researchers.`,
		},
	}

	for _, page := range defaultPages {
		if err := db.Create(&page).Error; err != nil {
			log.Printf("Failed to seed legal page %s: %v", page.Slug, err)
		} else {
			log.Printf("Seeded default legal page: %s", page.Slug)
		}
	}
}
