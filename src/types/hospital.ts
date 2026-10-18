export type UserRole = 'nurse' | 'doctor_admin';
export type AccountStatus = 'active' | 'pending_approval' | 'deactivated';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  accountStatus: AccountStatus;
  staffId?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface LoginSession {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  loginAt: string;
  lastActivityAt: string;
  logoutAt?: string;
  sessionStatus: 'active' | 'expired' | 'revoked';
  deviceSummary?: string;
  ipAddress?: string;
}

export type BroadSpeciality = 'SURGERY CASES' | 'MEDICINE CASES' | string;
export type TaeiCategory = 'PILLAR' | 'NON PILLAR' | string;
export type MedicolegalCategory = 'MLC' | 'NMLC' | string;
export type SexOption = 'M' | 'F' | 'Other';

export interface PatientRecord {
  id: string;
  serialNumber: number; // S NO (auto-generated)
  ipNumber: string;     // IP NO (e.g. "9985", "10004", text to keep leading zeros)
  patientName: string;  // NAME
  age: number;          // AGE
  sex: SexOption;       // SEX: M, F
  admissionDatetime: string; // ADMISSION DATE & TIME
  patientReceivedTime: string; // PATIENT RECEIVED TIME
  specialtyCategory: BroadSpeciality; // BROAD SPECIALITY CATEGORY
  diagnosis: string;    // DIAGNOSIS (e.g. RTA, POISONING, ASF, CHEST PAIN, etc.)
  ageInterval: string;  // AGE INTERVAL: "12-60", ">60", "<12", etc.
  taeiCategory: TaeiCategory; // TAEI PILLAR / TAEI NON PILLAR
  medicolegalCategory: MedicolegalCategory; // MEDICOLEGAL CATEGORY: MLC / NMLC
  transferredOut: string; // TRANSFERRED OUT: MS, SD ICU, NS, MM, FM, M ORTHO, FS, etc.
  transferredOutTime: string; // TRANSFERRED OUT TIME
  emergencyResponseTime: string; // EMERGENCY RESPONSE TIME: e.g. "5 mins", "12.30 AM"

  // System & Audit Metadata
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  correctionRequest?: {
    nurseId: string;
    nurseName: string;
    note: string;
    requestedAt: string;
    status: 'pending' | 'resolved';
  };
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'LOGIN_FAILED'
    | 'SESSION_REVOKED'
    | 'RECORD_CREATED'
    | 'RECORD_UPDATED'
    | 'RECORD_ARCHIVED'
    | 'RECORD_RESTORED'
    | 'RECORD_PERMANENTLY_DELETED'
    | 'RECORD_COPIED'
    | 'RECORD_MOVED'
    | 'EXCEL_EXPORTED'
    | 'NURSE_REGISTERED'
    | 'NURSE_APPROVED'
    | 'NURSE_DEACTIVATED'
    | 'NURSE_ACTIVATED'
    | 'NURSE_CREATED'
    | 'CONFIG_UPDATED'
    | 'CORRECTION_REQUESTED'
    | 'CORRECTION_RESOLVED';
  entityType: 'patient_record' | 'user' | 'session' | 'hospital_config' | 'system';
  entityId?: string;
  timestamp: string;
  changeSummary: string;
  metadata?: Record<string, any>;
}

export interface HospitalConfig {
  hospitalName: string;
  hospitalBranch: string;
  emergencyUnitName: string;
  specialtyCategories: string[];
  taeiCategories: string[];
  medicolegalCategories: string[];
  transferWards: string[];
  ageIntervals: string[];
  commonDiagnoses: string[];
}
