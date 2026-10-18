# Hospital Patient Data Management System

A secure, responsive, full-stack Hospital Patient Data Management System built for emergency casualty care and administrative oversight. The application faithfully reproduces the official 15-column emergency intake register structure (TAEI / Trauma Resuscitation Standard), provides separate authenticated portals for Nurses and Doctors/Admins, enforces strict Row Level Security (RLS), tracks staff sessions via live heartbeats, maintains an immutable audit log, and generates authentic Microsoft Excel (`.xlsx`) files with custom daily sheets.

---

## 1. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons.
- **Backend & API**: Node.js, Express, TypeScript (`tsx server.ts`).
- **Database & Architecture**:
  - Full PostgreSQL schema with Row Level Security (RLS) policies (`supabase/schema.sql`).
  - Embedded high-performance transactional JSON database engine (`src/server/db.ts`) for local zero-configuration execution.
- **Excel Generation**: ExcelJS for real, formatted `.xlsx` workbooks with auto-fit columns, borders, text preservation for IP numbers, and daily tabbed worksheets (`AUG 11`, `AUG 12`...).
- **Authentication & Security**: PBKDF2 password hashing, token-based session management, live heartbeat activity tracking, and strict role guards.

---

## 2. The 15 Standard Hospital Register Columns

The system implements the exact 15 columns from the hospital emergency ledger:

1. **S NO**: Automatically generated sequential record number (managed server-side to prevent duplicates).
2. **IP NO**: Inpatient / Casualty ID (stored as text to preserve leading zeros and prevent exponential notation like `1E+07`).
3. **NAME**: Patient full name.
4. **AGE**: Numeric age (0–130) with validation.
5. **SEX**: Dropdown (`M`, `F`, `Other`).
6. **ADMISSION DATE & TIME**: Date-time string (e.g. `11.08.2026 12.16AM`).
7. **PATIENT RECEIVED TIME**: Time picker (e.g. `12.20AM`).
8. **BROAD SPECIALITY CATEGORY**: Dropdown (`SURGERY CASES`, `MEDICINE CASES`, configurable).
9. **DIAGNOSIS**: Emergency diagnosis text with quick-pick chips (`RTA`, `POISONING`, `ASF`, `CHEST PAIN`, `FEVER`, `ASSAULT`, etc.).
10. **AGE INTERVAL**: Configurable ranges (`12-60`, `>60`, `<12`).
11. **TAEI PILLAR / TAEI NON PILLAR**: Dropdown (`PILLAR`, `NON PILLAR`).
12. **MEDICOLEGAL CATEGORY**: Dropdown (`MLC`, `NMLC`).
13. **TRANSFERRED OUT**: Destination ward (`MS`, `MM`, `NS`, `FM`, `SD ICU`, `M ORTHO`, `FS`, `MICU`, `SICU`, etc.).
14. **TRANSFERRED OUT TIME**: Time field (e.g. `02.15PM`).
15. **EMERGENCY RESPONSE TIME**: Duration or response timestamp (e.g. `5 mins`).

---

## 3. Dedicated Access Portals

### A. Nurse Portal (`/#nurse`)
- Simple, high-speed emergency data entry form designed for emergency department workflows.
- Auto-increments S NO sequentially.
- Prevents accidental loss of leading zeros in IP NO.
- Quick-pick buttons for common emergency trauma diagnoses.
- Displays read-only log of entries submitted during current shift.
- **Strict Nurse Restrictions**: Nurses cannot delete saved records, edit submitted records directly, or download the full patient database.
- **Correction Workflow**: If a nurse makes a clerical error, they can submit an authorized Correction Request note that alerts the Doctor/Admin to review and execute the change.

### B. Doctor / Administrator Portal (`/#admin`)
- Accessible only with `doctor_admin` security clearance.
- **Overview Dashboard**: Total records, active duty nurses (verified via 30s heartbeat), records entered per nurse, daily volume counts, and recent submissions.
- **Patient Records Management**: High-density 15-column spreadsheet table matching the original Excel header styling (`#B8D8D8` mint/teal), search, multi-filters, sorting, pagination, multi-select, edit modal, soft-delete archive, permanent deletion, record cloning, and ward relocation.
- **Genuine Excel Export**: Powered by ExcelJS. Export filtered, selected, or all records. Supports splitting records into daily worksheets (`AUG 11`, `AUG 12`...) matching the original workbook tabs.
- **Nurse Management**: View all nurses, approve pending account requests, activate/deactivate accounts, monitor live duty presence, and revoke active sessions.
- **Security Audit Logs**: Complete chronological history of logins, failures, data creations, edits, archives, and exports.
- **Clinical Configuration**: Manage hospital name and approved dropdown options.

---

## 4. Default Accounts & Credentials

For evaluation and testing:

| Role | Username / Email | Password | Status |
| :--- | :--- | :--- | :--- |
| **Doctor / Admin** | `sanjeevan2213@gmail.com` (`sanjeevan2213`) | `sanjeevan@123` | Active (Chief Medical Officer / Admin) |
| **Duty Staff Nurse** | `nurse.anita@hospital.org` (`nurse_anita`) | `NursePassword2026!` | Active |
| **Pending Nurse** | `nurse.sarah@hospital.org` (`nurse_sarah`) | `NursePassword2026!` | Pending Approval |

---

## 5. First-Time Doctor/Admin Provisioning

Administrators cannot self-register through the public interface. To provision a new Doctor/Admin:
1. An existing Doctor/Admin can create nurse accounts and assign roles.
2. In production, configure `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in your server environment variables before deployment.

---

## 6. Nurse Registration & Approval Workflow

1. A staff nurse visits the Nurse Portal and clicks **Request New Nurse Account**.
2. They enter their legal name, hospital email, username, staff ID, and desired password.
3. The account is created with status `pending_approval`. The nurse cannot log in yet.
4. The Doctor/Admin logs into the Admin Portal, navigates to **Nurse Management**, and clicks **Approve Access**.
5. Once approved, the nurse can log in to the Emergency Station.

---

## 7. Supabase & Vercel Deployment Instructions

### Step 1: Set up Supabase PostgreSQL
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and run the entire SQL script from `supabase/schema.sql`. This creates all tables, triggers, and Row Level Security (RLS) policies.

### Step 2: Configure Environment Variables
In your Vercel project settings, set:
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
INITIAL_ADMIN_EMAIL="admin@hospital.org"
INITIAL_ADMIN_PASSWORD="DoctorAdmin2026!"
```

### Step 3: Deploy to Vercel
Connect your Git repository to Vercel and deploy. The application will run using the Supabase PostgreSQL backend.

---

## 8. Acceptance Verification Checklist

- [x] Separate dedicated Nurse (`/#nurse`) and Doctor/Admin (`/#admin`) login screens.
- [x] Unauthenticated and unauthorized users cannot access the Admin dashboard.
- [x] Fast emergency patient data entry form with all 15 columns in exact order.
- [x] S NO is generated sequentially on save.
- [x] IP NO text formatting preserves leading zeros.
- [x] Clear validation for age, required fields, and format.
- [x] Saved records are persisted permanently in the database.
- [x] Nurses cannot delete or edit submitted records; can submit correction requests.
- [x] Doctor/Admin dashboard with overview metrics, active duty presence, and nurse entry counts.
- [x] Spreadsheet-style 15-column management table with search, filters, sorting, and pagination.
- [x] Admin actions: Edit, archive (soft delete), restore, permanent delete, duplicate, and transfer ward.
- [x] Genuine Excel (`.xlsx`) export with mint green headers, borders, text preservation, and optional daily worksheets (`AUG 11`, `AUG 12`...).
- [x] Nurse management: Approve pending requests, activate/deactivate, monitor sessions, and revoke access.
- [x] Audit log recording all critical events with actor, action, timestamp, and details.
- [x] Fully responsive across desktop, tablet, and mobile.
- [x] Meaningful empty states when no records are present.
