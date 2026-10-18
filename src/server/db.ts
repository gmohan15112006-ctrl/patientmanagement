import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserProfile,
  PatientRecord,
  LoginSession,
  AuditLog,
  HospitalConfig,
  UserRole
} from '../types/hospital';

export interface DBState {
  users: Array<UserProfile & { passwordHash: string; salt: string }>;
  records: PatientRecord[];
  sessions: LoginSession[];
  auditLogs: AuditLog[];
  config: HospitalConfig;
  lastSerialNumber: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hospital_db.json');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  return hashPassword(password, salt) === hash;
}

const DEFAULT_CONFIG: HospitalConfig = {
  hospitalName: 'GOVERNMENT EMERGENCY & TRAUMA CARE CENTER',
  hospitalBranch: 'TAMIL NADU ACCIDENT & EMERGENCY INITIATIVE (TAEI)',
  emergencyUnitName: 'CASUALTY & TRAUMA RESUSCITATION WARD',
  specialtyCategories: ['SURGERY CASES', 'MEDICINE CASES'],
  taeiCategories: ['PILLAR', 'NON PILLAR'],
  medicolegalCategories: ['MLC', 'NMLC'],
  transferWards: ['MS', 'MM', 'NS', 'FM', 'SD ICU', 'M ORTHO', 'FS', 'MICU', 'SICU', 'OPD', 'DISCHARGED'],
  ageIntervals: ['12-60', '>60', '<12'],
  commonDiagnoses: [
    'RTA',
    'POISONING',
    'ASF',
    'RTA WITH HI',
    'CHEST PAIN',
    'HYPOGLYCEMIA',
    'AGE',
    'ABDOMINAL PAIN',
    'ACUTE APPENDICITIS',
    'ASSAULT',
    'GIDDINESS',
    'DIABETIC CELLULITIS',
    'PSYCHIATRIC DISORDER',
    'FEVER',
    'CAG',
    'FFE/ CHICKEN FOX',
    'CVA'
  ],
};

function initDefaultDB(): DBState {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const nurseSalt = crypto.randomBytes(16).toString('hex');
  const nurse2Salt = crypto.randomBytes(16).toString('hex');

  const adminUser: UserProfile & { passwordHash: string; salt: string } = {
    id: 'user_admin_001',
    email: 'sanjeevan2213@gmail.com',
    username: 'sanjeevan2213',
    fullName: 'Dr. Sanjeevan (Chief Medical Officer / Admin)',
    role: 'doctor_admin',
    accountStatus: 'active',
    staffId: 'DOC-8801',
    department: 'Emergency & Trauma Surgery',
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date().toISOString(),
    loginCount: 0,
    salt: adminSalt,
    passwordHash: hashPassword('sanjeevan@123', adminSalt),
  };

  const activeNurse: UserProfile & { passwordHash: string; salt: string } = {
    id: 'user_nurse_001',
    email: 'nurse.anita@hospital.org',
    username: 'nurse_anita',
    fullName: 'Staff Nurse Anita R.',
    role: 'nurse',
    accountStatus: 'active',
    staffId: 'NUR-4210',
    department: 'Trauma Resuscitation Unit',
    createdAt: new Date('2026-02-15T00:00:00Z').toISOString(),
    updatedAt: new Date().toISOString(),
    loginCount: 0,
    salt: nurseSalt,
    passwordHash: hashPassword('NursePassword2026!', nurseSalt),
  };

  const pendingNurse: UserProfile & { passwordHash: string; salt: string } = {
    id: 'user_nurse_002',
    email: 'nurse.sarah@hospital.org',
    username: 'nurse_sarah',
    fullName: 'Staff Nurse Sarah M.',
    role: 'nurse',
    accountStatus: 'pending_approval',
    staffId: 'NUR-4299',
    department: 'Casualty Ward',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    loginCount: 0,
    salt: nurse2Salt,
    passwordHash: hashPassword('NursePassword2026!', nurse2Salt),
  };

  return {
    users: [adminUser, activeNurse, pendingNurse],
    records: [], // Empty records by default as required
    sessions: [],
    auditLogs: [
      {
        id: crypto.randomUUID(),
        actorUserId: 'system',
        actorName: 'System Bootstrap',
        actorRole: 'doctor_admin',
        action: 'CONFIG_UPDATED',
        entityType: 'system',
        timestamp: new Date().toISOString(),
        changeSummary: 'Hospital database initialized with default clinical options and administrative security policies.',
      },
    ],
    config: DEFAULT_CONFIG,
    lastSerialNumber: 0,
  };
}

class HospitalDatabase {
  private state: DBState;

  constructor() {
    this.ensureDataDir();
    this.state = this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DBState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure required keys exist
        if (parsed.users && parsed.records !== undefined) {
          // Guarantee that the authorized administrator matches sanjeevan2213@gmail.com
          const adminIdx = parsed.users.findIndex((u: any) => u.role === 'doctor_admin');
          const adminSalt = crypto.randomBytes(16).toString('hex');
          const adminProfile = {
            id: adminIdx >= 0 ? parsed.users[adminIdx].id : 'user_admin_001',
            email: 'sanjeevan2213@gmail.com',
            username: 'sanjeevan2213',
            fullName: 'Dr. Sanjeevan (Chief Medical Officer / Admin)',
            role: 'doctor_admin',
            accountStatus: 'active',
            staffId: 'DOC-8801',
            department: 'Emergency & Trauma Surgery',
            createdAt: adminIdx >= 0 ? parsed.users[adminIdx].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            loginCount: adminIdx >= 0 ? parsed.users[adminIdx].loginCount || 0 : 0,
            salt: adminSalt,
            passwordHash: hashPassword('sanjeevan@123', adminSalt),
          };

          if (adminIdx >= 0) {
            parsed.users[adminIdx] = adminProfile;
          } else {
            parsed.users.unshift(adminProfile);
          }

          return {
            ...parsed,
            config: parsed.config || DEFAULT_CONFIG,
            sessions: parsed.sessions || [],
            auditLogs: parsed.auditLogs || [],
            lastSerialNumber: parsed.lastSerialNumber || (parsed.records.length ? Math.max(...parsed.records.map((r: PatientRecord) => r.serialNumber || 0)) : 0)
          };
        }
      }
    } catch (e) {
      console.error('Error loading database, initializing fresh state:', e);
    }
    const fresh = initDefaultDB();
    this.save(fresh);
    return fresh;
  }

  private save(stateToSave: DBState = this.state) {
    try {
      this.ensureDataDir();
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  // --- Auth Operations ---
  public authenticateUser(identifier: string, password: string, requiredRole?: UserRole): { user?: UserProfile; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const found = this.state.users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        (u.email.toLowerCase() === 'sanjeevan2213@gmail.com' && (cleanId === 'sanjeevan' || cleanId === 'sanjeevan2213'))
    );

    if (!found) {
      this.addAuditLog({
        actorUserId: 'anonymous',
        actorName: identifier,
        actorRole: requiredRole || 'nurse',
        action: 'LOGIN_FAILED',
        entityType: 'user',
        changeSummary: `Failed login attempt for unknown account '${identifier}'.`,
      });
      return { error: 'Invalid username/email or password.' };
    }

    if (!verifyPassword(password, found.passwordHash, found.salt)) {
      this.addAuditLog({
        actorUserId: found.id,
        actorName: found.fullName,
        actorRole: found.role,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: found.id,
        changeSummary: `Failed login password attempt for account '${found.email}'.`,
      });
      return { error: 'Invalid username/email or password.' };
    }

    if (found.accountStatus === 'pending_approval') {
      return { error: 'Your account is pending Doctor/Admin approval. Please contact the administrator.' };
    }

    if (found.accountStatus === 'deactivated') {
      return { error: 'Your account has been deactivated by hospital administration. Access revoked.' };
    }

    if (requiredRole && found.role !== requiredRole) {
      this.addAuditLog({
        actorUserId: found.id,
        actorName: found.fullName,
        actorRole: found.role,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: found.id,
        changeSummary: `Access denied: Role '${found.role}' attempted to log into '${requiredRole}' portal.`,
      });
      return { error: `Unauthorized portal. This login is reserved strictly for ${requiredRole === 'doctor_admin' ? 'Doctor / Administrator' : 'Nursing Staff'}.` };
    }

    // Update login stats
    found.lastLoginAt = new Date().toISOString();
    found.loginCount = (found.loginCount || 0) + 1;
    found.updatedAt = new Date().toISOString();
    this.save();

    const { passwordHash, salt, ...safeProfile } = found;
    return { user: safeProfile };
  }

  public registerNurse(data: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    staffId?: string;
    department?: string;
  }): { user?: UserProfile; error?: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanUsername = data.username.trim().toLowerCase();

    if (this.state.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { error: 'Email is already registered.' };
    }
    if (this.state.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Username is already taken.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const newUser: UserProfile & { passwordHash: string; salt: string } = {
      id: `user_nurse_${Date.now()}`,
      email: data.email.trim(),
      username: data.username.trim(),
      fullName: data.fullName.trim(),
      role: 'nurse',
      accountStatus: 'pending_approval', // Strictly pending admin approval
      staffId: data.staffId?.trim() || `NUR-${Math.floor(1000 + Math.random() * 9000)}`,
      department: data.department?.trim() || 'Casualty / Emergency Unit',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      loginCount: 0,
      salt,
      passwordHash: hashPassword(data.password, salt),
    };

    this.state.users.push(newUser);
    this.save();

    this.addAuditLog({
      actorUserId: newUser.id,
      actorName: newUser.fullName,
      actorRole: 'nurse',
      action: 'NURSE_REGISTERED',
      entityType: 'user',
      entityId: newUser.id,
      changeSummary: `New nurse registration requested for '${newUser.fullName}' (${newUser.email}). Pending admin approval.`,
    });

    const { passwordHash, salt: _, ...safeProfile } = newUser;
    return { user: safeProfile };
  }

  public createSession(user: UserProfile, deviceSummary?: string, ipAddress?: string): LoginSession {
    // Revoke any previous active session for this user to maintain strict session governance
    this.state.sessions.forEach((s) => {
      if (s.userId === user.id && s.sessionStatus === 'active') {
        s.sessionStatus = 'revoked';
        s.logoutAt = new Date().toISOString();
      }
    });

    const session: LoginSession = {
      id: `sess_${crypto.randomUUID()}`,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      sessionStatus: 'active',
      deviceSummary: deviceSummary || 'Emergency Station Browser',
      ipAddress: ipAddress || '127.0.0.1',
    };

    this.state.sessions.push(session);
    this.save();

    this.addAuditLog({
      actorUserId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'LOGIN',
      entityType: 'session',
      entityId: session.id,
      changeSummary: `User ${user.fullName} logged in successfully [${user.role}].`,
    });

    return session;
  }

  public touchSession(sessionId: string): boolean {
    const sess = this.state.sessions.find((s) => s.id === sessionId && s.sessionStatus === 'active');
    if (sess) {
      sess.lastActivityAt = new Date().toISOString();
      this.save();
      return true;
    }
    return false;
  }

  public endSession(sessionId: string, actorUserId?: string): boolean {
    const sess = this.state.sessions.find((s) => s.id === sessionId);
    if (sess && sess.sessionStatus === 'active') {
      sess.sessionStatus = 'expired';
      sess.logoutAt = new Date().toISOString();
      this.save();

      this.addAuditLog({
        actorUserId: actorUserId || sess.userId,
        actorName: sess.userName,
        actorRole: sess.userRole,
        action: 'LOGOUT',
        entityType: 'session',
        entityId: sessionId,
        changeSummary: `Session closed for ${sess.userName}.`,
      });
      return true;
    }
    return false;
  }

  public revokeUserSessions(userId: string, adminUser: UserProfile): number {
    let count = 0;
    this.state.sessions.forEach((s) => {
      if (s.userId === userId && s.sessionStatus === 'active') {
        s.sessionStatus = 'revoked';
        s.logoutAt = new Date().toISOString();
        count++;
      }
    });
    if (count > 0) {
      this.save();
      this.addAuditLog({
        actorUserId: adminUser.id,
        actorName: adminUser.fullName,
        actorRole: adminUser.role,
        action: 'SESSION_REVOKED',
        entityType: 'user',
        entityId: userId,
        changeSummary: `Admin revoked ${count} active session(s) for user ID ${userId}.`,
      });
    }
    return count;
  }

  public getSession(sessionId: string): LoginSession | undefined {
    const sess = this.state.sessions.find((s) => s.id === sessionId);
    if (!sess) return undefined;
    // Expire session if inactive for > 30 minutes
    const lastActive = new Date(sess.lastActivityAt).getTime();
    if (Date.now() - lastActive > 30 * 60 * 1000 && sess.sessionStatus === 'active') {
      sess.sessionStatus = 'expired';
      this.save();
    }
    return sess;
  }

  public getUserById(userId: string): UserProfile | undefined {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return undefined;
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }

  public getAllNurses(): Array<UserProfile & { activeSessionsCount: number; recordsCount: number; isOnline: boolean }> {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    return this.state.users
      .filter((u) => u.role === 'nurse')
      .map((u) => {
        const { passwordHash, salt, ...safe } = u;
        const activeSessions = this.state.sessions.filter(
          (s) => s.userId === u.id && s.sessionStatus === 'active' && new Date(s.lastActivityAt).getTime() > tenMinutesAgo
        );
        const recordsCount = this.state.records.filter((r) => r.createdBy === u.id).length;
        return {
          ...safe,
          activeSessionsCount: activeSessions.length,
          recordsCount,
          isOnline: activeSessions.length > 0,
        };
      });
  }

  public updateNurseStatus(nurseId: string, status: 'active' | 'deactivated', adminUser: UserProfile): UserProfile | null {
    const nurse = this.state.users.find((u) => u.id === nurseId && u.role === 'nurse');
    if (!nurse) return null;
    const oldStatus = nurse.accountStatus;
    nurse.accountStatus = status;
    nurse.updatedAt = new Date().toISOString();

    if (status === 'deactivated') {
      this.revokeUserSessions(nurseId, adminUser);
    }

    this.save();
    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: status === 'active' ? (oldStatus === 'pending_approval' ? 'NURSE_APPROVED' : 'NURSE_ACTIVATED') : 'NURSE_DEACTIVATED',
      entityType: 'user',
      entityId: nurseId,
      changeSummary: `Nurse ${nurse.fullName} status updated from '${oldStatus}' to '${status}'.`,
    });

    const { passwordHash, salt, ...safe } = nurse;
    return safe;
  }

  public createNurseDirectly(data: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    staffId?: string;
    department?: string;
  }, adminUser: UserProfile): { user?: UserProfile; error?: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanUsername = data.username.trim().toLowerCase();

    if (this.state.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { error: 'Email already registered.' };
    }
    if (this.state.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Username already taken.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const newUser: UserProfile & { passwordHash: string; salt: string } = {
      id: `user_nurse_${Date.now()}`,
      email: data.email.trim(),
      username: data.username.trim(),
      fullName: data.fullName.trim(),
      role: 'nurse',
      accountStatus: 'active', // Direct creation by admin is active immediately
      staffId: data.staffId?.trim() || `NUR-${Math.floor(1000 + Math.random() * 9000)}`,
      department: data.department?.trim() || 'Emergency Department',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      loginCount: 0,
      salt,
      passwordHash: hashPassword(data.password, salt),
    };

    this.state.users.push(newUser);
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'NURSE_CREATED',
      entityType: 'user',
      entityId: newUser.id,
      changeSummary: `Admin created nurse account for '${newUser.fullName}' (${newUser.email}).`,
    });

    const { passwordHash, salt: _, ...safe } = newUser;
    return { user: safe };
  }

  // --- Patient Records Operations ---

  public getNextSerialNumber(): number {
    this.state.lastSerialNumber += 1;
    this.save();
    return this.state.lastSerialNumber;
  }

  public insertPatientRecord(
    recordData: Omit<PatientRecord, 'id' | 'serialNumber' | 'createdAt' | 'createdBy' | 'createdByName'>,
    user: UserProfile
  ): PatientRecord {
    const nextSerial = this.getNextSerialNumber();
    const newRecord: PatientRecord = {
      ...recordData,
      id: `rec_${crypto.randomUUID()}`,
      serialNumber: nextSerial,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.fullName,
    };

    this.state.records.push(newRecord);
    this.save();

    this.addAuditLog({
      actorUserId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'RECORD_CREATED',
      entityType: 'patient_record',
      entityId: newRecord.id,
      changeSummary: `Emergency record #${newRecord.serialNumber} created for IP ${newRecord.ipNumber} (${newRecord.patientName}, ${newRecord.age}/${newRecord.sex}) - Diagnosis: ${newRecord.diagnosis}.`,
    });

    return newRecord;
  }

  public getRecords(query: {
    search?: string;
    specialtyCategory?: string;
    diagnosis?: string;
    ageInterval?: string;
    medicolegalCategory?: string;
    transferredOut?: string;
    startDate?: string;
    endDate?: string;
    includeArchived?: boolean;
    nurseId?: string; // If filtered to specific nurse or if nurse is reading
    sortBy?: keyof PatientRecord;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): { records: PatientRecord[]; total: number; page: number; totalPages: number } {
    let result = [...this.state.records];

    // Archive filter
    if (!query.includeArchived) {
      result = result.filter((r) => !r.archivedAt);
    }

    // Nurse restriction: If user is nurse, show only non-archived records
    if (query.nurseId) {
      result = result.filter((r) => r.createdBy === query.nurseId);
    }

    // Search filter across S NO, IP NO, Name, Diagnosis, Nurse Name
    if (query.search) {
      const q = query.search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          String(r.serialNumber).includes(q) ||
          r.ipNumber.toLowerCase().includes(q) ||
          r.patientName.toLowerCase().includes(q) ||
          r.diagnosis.toLowerCase().includes(q) ||
          r.createdByName.toLowerCase().includes(q)
      );
    }

    // Exact or partial category filters
    if (query.specialtyCategory && query.specialtyCategory !== 'ALL') {
      result = result.filter((r) => r.specialtyCategory === query.specialtyCategory);
    }
    if (query.diagnosis && query.diagnosis !== 'ALL') {
      result = result.filter((r) => r.diagnosis.toLowerCase().includes(query.diagnosis!.toLowerCase()));
    }
    if (query.ageInterval && query.ageInterval !== 'ALL') {
      result = result.filter((r) => r.ageInterval === query.ageInterval);
    }
    if (query.medicolegalCategory && query.medicolegalCategory !== 'ALL') {
      result = result.filter((r) => r.medicolegalCategory === query.medicolegalCategory);
    }
    if (query.transferredOut && query.transferredOut !== 'ALL') {
      result = result.filter((r) => r.transferredOut === query.transferredOut);
    }

    // Date filters (admissionDatetime or createdAt)
    if (query.startDate) {
      result = result.filter((r) => r.admissionDatetime >= query.startDate! || r.createdAt >= query.startDate!);
    }
    if (query.endDate) {
      result = result.filter((r) => r.admissionDatetime <= query.endDate! || r.createdAt <= query.endDate!);
    }

    // Sorting
    const sortBy = query.sortBy || 'serialNumber';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * sortOrder;
      }
      return String(valA).localeCompare(String(valB)) * sortOrder;
    });

    const total = result.length;
    const page = Math.max(1, query.page || 1);
    const limit = query.limit || 50;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = result.slice((page - 1) * limit, page * limit);

    return { records: paginated, total, page, totalPages };
  }

  public getRecordById(id: string): PatientRecord | undefined {
    return this.state.records.find((r) => r.id === id);
  }

  public updatePatientRecord(
    id: string,
    updates: Partial<PatientRecord>,
    adminUser: UserProfile
  ): PatientRecord | null {
    const index = this.state.records.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const existing = this.state.records[index];
    const changes: string[] = [];

    // Track field level changes for audit
    Object.keys(updates).forEach((k) => {
      const key = k as keyof PatientRecord;
      if (updates[key] !== undefined && updates[key] !== existing[key]) {
        changes.push(`${key}: "${existing[key]}" -> "${updates[key]}"`);
      }
    });

    const updated: PatientRecord = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
      serialNumber: existing.serialNumber, // Keep original serial number intact
      updatedBy: adminUser.id,
      updatedByName: adminUser.fullName,
      updatedAt: new Date().toISOString(),
    };

    this.state.records[index] = updated;
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'RECORD_UPDATED',
      entityType: 'patient_record',
      entityId: id,
      changeSummary: `Admin modified record #${updated.serialNumber} (IP ${updated.ipNumber}): ${changes.slice(0, 3).join(', ')}${changes.length > 3 ? '...' : ''}`,
    });

    return updated;
  }

  public archivePatientRecord(id: string, reason: string, adminUser: UserProfile): boolean {
    const record = this.state.records.find((r) => r.id === id);
    if (!record) return false;

    record.archivedAt = new Date().toISOString();
    record.archivedBy = adminUser.id;
    record.archiveReason = reason || 'Archived by administrator';
    record.updatedAt = new Date().toISOString();
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'RECORD_ARCHIVED',
      entityType: 'patient_record',
      entityId: id,
      changeSummary: `Admin archived record #${record.serialNumber} (IP ${record.ipNumber}). Reason: ${reason}`,
    });

    return true;
  }

  public restorePatientRecord(id: string, adminUser: UserProfile): boolean {
    const record = this.state.records.find((r) => r.id === id);
    if (!record || !record.archivedAt) return false;

    delete record.archivedAt;
    delete record.archivedBy;
    delete record.archiveReason;
    record.updatedAt = new Date().toISOString();
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'RECORD_RESTORED',
      entityType: 'patient_record',
      entityId: id,
      changeSummary: `Admin restored previously archived record #${record.serialNumber} (IP ${record.ipNumber}).`,
    });

    return true;
  }

  public permanentlyDeleteRecord(id: string, adminUser: UserProfile): boolean {
    const index = this.state.records.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const removed = this.state.records.splice(index, 1)[0];
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'RECORD_PERMANENTLY_DELETED',
      entityType: 'patient_record',
      entityId: id,
      changeSummary: `Admin permanently removed record #${removed.serialNumber} (IP ${removed.ipNumber}, ${removed.patientName}).`,
    });

    return true;
  }

  public copyPatientRecord(id: string, adminUser: UserProfile): PatientRecord | null {
    const source = this.state.records.find((r) => r.id === id);
    if (!source) return null;

    const nextSerial = this.getNextSerialNumber();
    const cloned: PatientRecord = {
      ...source,
      id: `rec_${crypto.randomUUID()}`,
      serialNumber: nextSerial,
      createdAt: new Date().toISOString(),
      createdBy: adminUser.id,
      createdByName: adminUser.fullName,
      updatedAt: undefined,
      updatedBy: undefined,
      updatedByName: undefined,
      archivedAt: undefined,
      archivedBy: undefined,
      archiveReason: undefined,
    };

    this.state.records.push(cloned);
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'RECORD_COPIED',
      entityType: 'patient_record',
      entityId: cloned.id,
      changeSummary: `Admin cloned record #${source.serialNumber} into new record #${cloned.serialNumber}.`,
    });

    return cloned;
  }

  public movePatientRecord(id: string, targetWard: string, adminUser: UserProfile): boolean {
    const record = this.state.records.find((r) => r.id === id);
    if (!record) return false;

    const previousWard = record.transferredOut;
    record.transferredOut = targetWard;
    record.transferredOutTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    record.updatedAt = new Date().toISOString();
    record.updatedBy = adminUser.id;
    record.updatedByName = adminUser.fullName;
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'RECORD_MOVED',
      entityType: 'patient_record',
      entityId: id,
      changeSummary: `Admin relocated patient #${record.serialNumber} from ${previousWard || 'Unassigned'} to ${targetWard}.`,
    });

    return true;
  }

  public submitCorrectionRequest(id: string, note: string, nurse: UserProfile): boolean {
    const record = this.state.records.find((r) => r.id === id);
    if (!record) return false;

    record.correctionRequest = {
      nurseId: nurse.id,
      nurseName: nurse.fullName,
      note,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    this.save();

    this.addAuditLog({
      actorUserId: nurse.id,
      actorName: nurse.fullName,
      actorRole: 'nurse',
      action: 'CORRECTION_REQUESTED',
      entityType: 'patient_record',
      entityId: id,
      changeSummary: `Nurse ${nurse.fullName} submitted correction request for record #${record.serialNumber}: "${note}"`,
    });

    return true;
  }

  // --- Audit & Config Operations ---

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `audit_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    // Keep last 10,000 logs
    if (this.state.auditLogs.length > 10000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 10000);
    }
    this.save();
    return log;
  }

  public getAuditLogs(limit = 200, action?: string): AuditLog[] {
    let list = this.state.auditLogs;
    if (action && action !== 'ALL') {
      list = list.filter((l) => l.action === action);
    }
    return list.slice(0, limit);
  }

  public getConfig(): HospitalConfig {
    return this.state.config;
  }

  public updateConfig(newConfig: Partial<HospitalConfig>, adminUser: UserProfile): HospitalConfig {
    this.state.config = {
      ...this.state.config,
      ...newConfig,
    };
    this.save();

    this.addAuditLog({
      actorUserId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: 'CONFIG_UPDATED',
      entityType: 'hospital_config',
      changeSummary: 'Admin updated clinical configuration / dropdown values.',
    });

    return this.state.config;
  }

  public getOverviewStats() {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const totalRecords = this.state.records.filter((r) => !r.archivedAt).length;
    const archivedRecords = this.state.records.filter((r) => r.archivedAt).length;
    const registeredNurses = this.state.users.filter((u) => u.role === 'nurse').length;
    const pendingApprovalNurses = this.state.users.filter((u) => u.role === 'nurse' && u.accountStatus === 'pending_approval').length;

    // Currently logged-in nurses based on active session & recent heartbeat
    const activeNurseIds = new Set(
      this.state.sessions
        .filter((s) => s.userRole === 'nurse' && s.sessionStatus === 'active' && new Date(s.lastActivityAt).getTime() > tenMinutesAgo)
        .map((s) => s.userId)
    );
    const currentlyActiveNurses = activeNurseIds.size;

    // Nurses who logged in during last 24h
    const loggedIn24hNurses = new Set(
      this.state.sessions
        .filter((s) => s.userRole === 'nurse' && new Date(s.loginAt).getTime() > oneDayAgo)
        .map((s) => s.userId)
    ).size;

    // Entry count per nurse
    const nurseStats: { [nurseId: string]: { name: string; count: number; email: string } } = {};
    this.state.records.forEach((r) => {
      if (!nurseStats[r.createdBy]) {
        nurseStats[r.createdBy] = { name: r.createdByName, count: 0, email: '' };
      }
      nurseStats[r.createdBy].count += 1;
    });

    // Populate emails
    this.state.users.forEach((u) => {
      if (nurseStats[u.id]) {
        nurseStats[u.id].email = u.email;
      }
    });

    // Date-wise record count (e.g. daily counts)
    const dateCounts: { [date: string]: number } = {};
    this.state.records.forEach((r) => {
      const dateKey = r.admissionDatetime ? r.admissionDatetime.slice(0, 10) : r.createdAt.slice(0, 10);
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    // Recent submissions
    const recentRecords = [...this.state.records]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    return {
      totalRecords,
      archivedRecords,
      registeredNurses,
      pendingApprovalNurses,
      currentlyActiveNurses,
      loggedIn24hNurses,
      nurseEntryBreakdown: Object.entries(nurseStats).map(([id, info]) => ({
        nurseId: id,
        name: info.name,
        email: info.email,
        count: info.count,
      })),
      dailyCounts: Object.entries(dateCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 14),
      recentRecords,
    };
  }
}

export const db = new HospitalDatabase();
