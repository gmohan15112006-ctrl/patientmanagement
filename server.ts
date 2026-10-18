import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './src/server/db.ts';
import { generatePatientExcel } from './src/services/excelExport.ts';
import { UserProfile, UserRole } from './src/types/hospital.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Session extraction middleware
interface AuthRequest extends Request {
  user?: UserProfile;
  sessionId?: string;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const session = db.getSession(token);
  if (!session || session.sessionStatus !== 'active') {
    return next();
  }

  const user = db.getUserById(session.userId);
  if (user && user.accountStatus === 'active') {
    req.user = user;
    req.sessionId = session.id;
  }
  next();
}

app.use(authMiddleware);

// Role check helpers
function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (req.user.role !== 'doctor_admin') {
    db.addAuditLog({
      actorUserId: req.user.id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action: 'LOGIN_FAILED',
      entityType: 'user',
      changeSummary: `Security Alert: Nurse '${req.user.fullName}' attempted unauthorized administrative access to ${req.method} ${req.originalUrl}.`,
    });
    return res.status(403).json({ error: 'Access denied: Administrative privileges required.' });
  }
  next();
}

// --- Auth Routes ---
app.post('/api/auth/login', (req, res) => {
  const { identifier, password, portalRole } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please provide both username/email and password.' });
  }

  const result = db.authenticateUser(identifier, password, portalRole as UserRole);
  if (result.error || !result.user) {
    return res.status(401).json({ error: result.error || 'Authentication failed.' });
  }

  const userAgent = req.headers['user-agent'] || 'Browser';
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const session = db.createSession(result.user, userAgent, ip);

  res.json({
    token: session.id,
    user: result.user,
    session,
  });
});

app.post('/api/auth/register-nurse', (req, res) => {
  const { fullName, email, username, password, staffId, department } = req.body;
  if (!fullName || !email || !username || !password) {
    return res.status(400).json({ error: 'Full name, email, username, and password are required.' });
  }

  const result = db.registerNurse({ fullName, email, username, password, staffId, department });
  if (result.error || !result.user) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    message: 'Nurse account requested successfully. It is currently pending Doctor/Admin approval.',
    user: result.user,
  });
});

app.post('/api/auth/heartbeat', requireAuth, (req: AuthRequest, res) => {
  if (req.sessionId) {
    db.touchSession(req.sessionId);
  }
  res.json({ ok: true });
});

app.post('/api/auth/logout', requireAuth, (req: AuthRequest, res) => {
  if (req.sessionId) {
    db.endSession(req.sessionId, req.user?.id);
  }
  res.json({ ok: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({
    user: req.user,
    sessionId: req.sessionId,
  });
});

// --- Patient Records Routes ---

// List records with search, filter, pagination
app.get('/api/records', requireAuth, (req: AuthRequest, res) => {
  const {
    search,
    specialtyCategory,
    diagnosis,
    ageInterval,
    medicolegalCategory,
    transferredOut,
    startDate,
    endDate,
    includeArchived,
    onlyMyRecords,
    sortBy,
    sortOrder,
    page,
    limit,
  } = req.query;

  // If user is a nurse:
  // - Cannot view archived records
  // - If onlyMyRecords requested, filter to nurse's own records
  const isNurse = req.user?.role === 'nurse';
  const nurseFilter = isNurse && onlyMyRecords === 'true' ? req.user?.id : undefined;

  const result = db.getRecords({
    search: search as string,
    specialtyCategory: specialtyCategory as string,
    diagnosis: diagnosis as string,
    ageInterval: ageInterval as string,
    medicolegalCategory: medicolegalCategory as string,
    transferredOut: transferredOut as string,
    startDate: startDate as string,
    endDate: endDate as string,
    includeArchived: isNurse ? false : includeArchived === 'true',
    nurseId: nurseFilter,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 50,
  });

  res.json(result);
});

// Create new record
app.post('/api/records', requireAuth, (req: AuthRequest, res) => {
  const {
    ipNumber,
    patientName,
    age,
    sex,
    admissionDatetime,
    patientReceivedTime,
    specialtyCategory,
    diagnosis,
    ageInterval,
    taeiCategory,
    medicolegalCategory,
    transferredOut,
    transferredOutTime,
    emergencyResponseTime,
  } = req.body;

  // Validation
  if (!patientName || !ipNumber || age === undefined || !sex) {
    return res.status(400).json({ error: 'IP Number, Patient Name, Age, and Sex are mandatory fields.' });
  }

  const numericAge = Number(age);
  if (isNaN(numericAge) || numericAge < 0 || numericAge > 130) {
    return res.status(400).json({ error: 'Please enter a valid patient age between 0 and 130.' });
  }

  const record = db.insertPatientRecord(
    {
      ipNumber: String(ipNumber).trim(),
      patientName: String(patientName).trim(),
      age: numericAge,
      sex: sex,
      admissionDatetime: admissionDatetime || new Date().toLocaleString(),
      patientReceivedTime: patientReceivedTime || '',
      specialtyCategory: specialtyCategory || 'SURGERY CASES',
      diagnosis: String(diagnosis || '').trim().toUpperCase(),
      ageInterval: ageInterval || (numericAge > 60 ? '>60' : '12-60'),
      taeiCategory: taeiCategory || 'PILLAR',
      medicolegalCategory: medicolegalCategory || 'MLC',
      transferredOut: transferredOut || '',
      transferredOutTime: transferredOutTime || '',
      emergencyResponseTime: emergencyResponseTime || '',
    },
    req.user!
  );

  res.status(201).json({
    message: `Patient record #${record.serialNumber} (IP: ${record.ipNumber}) saved permanently.`,
    record,
  });
});

// Update record (Admin only)
app.put('/api/records/:id', requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const updated = db.updatePatientRecord(id, req.body, req.user!);
  if (!updated) {
    return res.status(404).json({ error: 'Patient record not found.' });
  }
  res.json({ message: `Record #${updated.serialNumber} updated successfully.`, record: updated });
});

// Archive (soft delete) or permanently delete (Admin only)
app.delete('/api/records/:id', requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === 'true';
  const reason = (req.query.reason as string) || 'Removed by administrator';

  if (isPermanent) {
    const success = db.permanentlyDeleteRecord(id, req.user!);
    if (!success) return res.status(404).json({ error: 'Record not found.' });
    return res.json({ message: 'Patient record permanently deleted from database.' });
  } else {
    const success = db.archivePatientRecord(id, reason, req.user!);
    if (!success) return res.status(404).json({ error: 'Record not found.' });
    return res.json({ message: 'Patient record moved to archive.' });
  }
});

// Restore archived record (Admin only)
app.post('/api/records/:id/restore', requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const success = db.restorePatientRecord(id, req.user!);
  if (!success) return res.status(404).json({ error: 'Record not found or not archived.' });
  res.json({ message: 'Record restored to active register.' });
});

// Duplicate / Copy record (Admin only)
app.post('/api/records/:id/copy', requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const cloned = db.copyPatientRecord(id, req.user!);
  if (!cloned) return res.status(404).json({ error: 'Record not found.' });
  res.json({ message: `Record copied. New Record #${cloned.serialNumber} created.`, record: cloned });
});

// Move patient record to destination ward (Admin only)
app.post('/api/records/:id/move', requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { targetWard } = req.body;
  if (!targetWard) return res.status(400).json({ error: 'Target ward destination is required.' });

  const success = db.movePatientRecord(id, targetWard, req.user!);
  if (!success) return res.status(404).json({ error: 'Record not found.' });
  res.json({ message: `Patient transferred to ${targetWard} successfully.` });
});

// Nurse correction request
app.post('/api/records/:id/correction-request', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Correction note explanation is required.' });

  const success = db.submitCorrectionRequest(id, note, req.user!);
  if (!success) return res.status(404).json({ error: 'Record not found.' });
  res.json({ message: 'Correction request submitted to Doctor/Admin for review.' });
});

// --- Admin Overview Stats ---
app.get('/api/overview', requireAdmin, (req: AuthRequest, res) => {
  const stats = db.getOverviewStats();
  res.json(stats);
});

// --- Excel Export (Doctor/Admin only) ---
app.post('/api/export-excel', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { recordIds, filters, splitByDate } = req.body || {};

    let recordsToExport = [];
    if (recordIds && Array.isArray(recordIds) && recordIds.length > 0) {
      recordsToExport = recordIds
        .map((id: string) => db.getRecordById(id))
        .filter((r): r is NonNullable<typeof r> => !!r);
    } else {
      // Export filtered or all
      const result = db.getRecords({
        search: filters?.search,
        specialtyCategory: filters?.specialtyCategory,
        diagnosis: filters?.diagnosis,
        ageInterval: filters?.ageInterval,
        medicolegalCategory: filters?.medicolegalCategory,
        transferredOut: filters?.transferredOut,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        includeArchived: filters?.includeArchived === true,
        limit: 100000, // Export all matching
      });
      recordsToExport = result.records;
    }

    if (recordsToExport.length === 0) {
      return res.status(400).json({ error: 'No patient records found matching the export criteria.' });
    }

    const config = db.getConfig();
    const blob = await generatePatientExcel(recordsToExport, {
      hospitalName: config.hospitalName,
      splitByDate: !!splitByDate,
      fileName: `Hospital_Patient_Export_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    db.addAuditLog({
      actorUserId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      action: 'EXCEL_EXPORTED',
      entityType: 'patient_record',
      changeSummary: `Doctor/Admin exported ${recordsToExport.length} patient record(s) to Excel. Split by date: ${splitByDate ? 'Yes' : 'No'}.`,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Hospital_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Export Excel failed:', error);
    res.status(500).json({ error: 'Failed to generate Excel file: ' + (error.message || 'Server error') });
  }
});

// --- Nurse Management (Doctor/Admin only) ---
app.get('/api/nurses', requireAdmin, (req: AuthRequest, res) => {
  const nurses = db.getAllNurses();
  res.json(nurses);
});

app.post('/api/nurses/:id/status', requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !['active', 'deactivated'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or deactivated.' });
  }

  const updated = db.updateNurseStatus(id, status, req.user!);
  if (!updated) return res.status(404).json({ error: 'Nurse not found.' });

  res.json({ message: `Nurse status updated to ${status}.`, nurse: updated });
});

app.post('/api/nurses', requireAdmin, (req: AuthRequest, res) => {
  const { fullName, email, username, password, staffId, department } = req.body;
  if (!fullName || !email || !username || !password) {
    return res.status(400).json({ error: 'Full name, email, username, and password are required.' });
  }

  const result = db.createNurseDirectly({ fullName, email, username, password, staffId, department }, req.user!);
  if (result.error || !result.user) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json({ message: 'Nurse account created successfully and activated.', nurse: result.user });
});

app.post('/api/nurses/:id/revoke-session', requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const count = db.revokeUserSessions(id, req.user!);
  res.json({ message: `Revoked ${count} active session(s) for this nurse.` });
});

// --- Audit Logs (Doctor/Admin only) ---
app.get('/api/audit-logs', requireAdmin, (req: AuthRequest, res) => {
  const { action, limit } = req.query;
  const logs = db.getAuditLogs(limit ? parseInt(limit as string, 10) : 200, action as string);
  res.json(logs);
});

// --- Hospital Clinical Config ---
app.get('/api/config', (req, res) => {
  res.json(db.getConfig());
});

app.put('/api/config', requireAdmin, (req: AuthRequest, res) => {
  const updated = db.updateConfig(req.body, req.user!);
  res.json({ message: 'Clinical dropdown options and configuration updated.', config: updated });
});

// Vite Middleware for Frontend Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hospital Data Management Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
