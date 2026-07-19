/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from './src/db.js';
import { pullDataFromSupabase } from './src/supabaseClient.js';
import {
  pgUpsertSchool, pgUpsertAdminUser, pgUpsertSession,
  pgUpsertClass, pgDeleteClass,
  pgUpsertSection, pgDeleteSection,
  pgUpsertSubject, pgDeleteSubject,
  pgUpsertClassSubject, pgDeleteClassSubject,
  pgUpsertStudent, pgDeleteStudent,
  pgUpsertFamily, pgDeleteFamily,
  pgUpsertStaff, pgDeleteStaff,
  pgUpsertStaffAssignment,
  pgUpsertExam, pgDeleteExam,
  pgUpsertExamAssignment,
  pgUpsertExamResult,
  pgUpsertFeeHead,
  pgUpsertPayment,
  pgUpsertAttendance,
  pgUpsertStaffAttendance,
  pgUpsertExpense, pgDeleteExpense,
  pgUpsertIncome, pgDeleteIncome,
  pgUpsertLedgerEntry,
  pgUpsertBadDebt,
  pgUpsertStationery, pgDeleteStationery,
  pgUpsertInventory, pgDeleteInventory,
  pgUpsertCalendarDay
} from './src/syncToPostgres.js';
import {
  readDatabase,
  writeDatabase,
  ensureDatabaseExists,
  fillDummyData,
  clearAllData,
  postToLedger
} from './src/dbStore.js';
import {
  School,
  AdminUser,
  Student,
  Family,
  Staff,
  Class,
  Section,
  Subject,
  ClassSubject,
  Exam,
  ExamAssignment,
  FeeHead,
  Payment,
  Attendance,
  StaffAttendance,
  CalendarDay,
  Expense,
  Income,
  BadDebt,
  LedgerEntry,
  StationeryItem,
  InventoryItem,
  ExamResult,
  Session
} from './src/types.js';

// Standard environment setup
const PORT = 3000;
const app = express();

// Middleware to parse json requests
app.use(express.json());

// Initialize database at startup
ensureDatabaseExists();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Login ID and password are required.' });
    }

    const db = readDatabase();
    const loginStr = String(email).toLowerCase();

    // 1. Check Admin
    const adminUser = db.admin_users.find(user => user.email.toLowerCase() === loginStr);
    if (adminUser) {
      let isValid = await bcrypt.compare(password, adminUser.password_hash);
      if (!isValid && adminUser.password_hash === password) isValid = true; // Fallback
      if (isValid) {
        return res.json({
          status: 'success',
          user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, school_id: adminUser.school_id, role: 'admin' },
          school: db.schools.find(s => s.id === adminUser.school_id) || db.schools[0] || null,
        });
      }
    }

    // 2. Check Staff
    const staffUser = db.staff.find(user => user.login_id?.toLowerCase() === loginStr);
    if (staffUser) {
      let isValid = await bcrypt.compare(password, staffUser.password_hash);
      if (!isValid && staffUser.password_hash === password) isValid = true;
      if (isValid) {
        if (staffUser.status === 'pending') {
          return res.status(403).json({ error: 'Your account is pending admin approval.' });
        }
        return res.json({
          status: 'success',
          user: { id: staffUser.id, name: staffUser.name, email: staffUser.login_id, school_id: staffUser.school_id, role: 'staff' },
          school: db.schools.find(s => s.id === staffUser.school_id) || db.schools[0] || null,
        });
      }
    }

    // 3. Check Student
    const studentUser = db.students.find(user => user.login_id?.toLowerCase() === loginStr);
    if (studentUser) {
      let isValid = await bcrypt.compare(password, studentUser.password_hash);
      if (!isValid && studentUser.password_hash === password) isValid = true;
      if (isValid) {
        if (studentUser.status === 'pending') {
          return res.status(403).json({ error: 'Your account is pending admin approval.' });
        }
        return res.json({
          status: 'success',
          user: { id: studentUser.id, name: studentUser.name, email: studentUser.login_id, school_id: studentUser.school_id, role: 'student' },
          school: db.schools.find(s => s.id === studentUser.school_id) || db.schools[0] || null,
        });
      }
    }

    return res.status(401).json({ error: 'Invalid credentials.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { role, name, login_id, password, contact, gender } = req.body;
    if (!role || !name || !login_id || !password) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const db = readDatabase();
    const school = getActiveSchool(db);
    
    // Check if login_id already exists
    if (
      db.admin_users.some(u => u.email.toLowerCase() === login_id.toLowerCase()) ||
      db.staff.some(s => s.login_id?.toLowerCase() === login_id.toLowerCase()) ||
      db.students.some(s => s.login_id?.toLowerCase() === login_id.toLowerCase())
    ) {
      return res.status(400).json({ error: 'Login ID is already taken.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (role === 'staff') {
      const newStaff = {
        id: newId,
        school_id: school.id,
        employee_id: `EMP-REQ-${Date.now().toString().slice(-4)}`,
        login_id,
        password_hash,
        name,
        father_name: '',
        cnic: '',
        contact: contact || '',
        gender: gender || 'other',
        dob: '',
        joining_date: new Date().toISOString().split('T')[0],
        salary: 0,
        qualification: '',
        address: '',
        status: 'pending' as const
      };
      db.staff.push(newStaff);
      writeDatabase(db);
      await pgUpsertStaff(newStaff);
    } else if (role === 'student') {
      const newStudent = {
        id: newId,
        school_id: school.id,
        reg_no: `RS-REQ-${Date.now().toString().slice(-4)}`,
        login_id,
        password_hash,
        name,
        father_name: '',
        gender: gender || 'other',
        dob: '',
        contact: contact || '',
        alt_phone: '',
        address: '',
        emergency_contact: '',
        guardian_name: '',
        guardian_contact: '',
        class_id: '',
        section_id: '',
        admission_date: new Date().toISOString().split('T')[0],
        billing_mode: 'individual' as const,
        family_id: 'fam_none',
        manual_monthly_fee: 0,
        status: 'pending' as const
      };
      db.students.push(newStudent);
      writeDatabase(db);
      await pgUpsertStudent(newStudent);
    } else {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    return res.json({ status: 'success', message: 'Account created successfully and is pending admin approval.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Signup failed.' });
  }
});

app.post('/api/approve-user', async (req, res) => {
  try {
    const { id, type, action } = req.body; // type = 'staff' | 'student', action = 'approve' | 'reject'
    if (!id || !type || !action) return res.status(400).json({ error: 'Missing parameters.' });

    const db = readDatabase();
    
    if (type === 'staff') {
      const idx = db.staff.findIndex(s => s.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Staff not found.' });
      if (action === 'approve') {
        db.staff[idx].status = 'active';
        writeDatabase(db);
        await pgUpsertStaff(db.staff[idx]);
      } else if (action === 'reject') {
        db.staff.splice(idx, 1);
        writeDatabase(db);
        await pgDeleteStaff(id);
      }
    } else if (type === 'student') {
      const idx = db.students.findIndex(s => s.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Student not found.' });
      if (action === 'approve') {
        db.students[idx].status = 'active';
        writeDatabase(db);
        await pgUpsertStudent(db.students[idx]);
      } else if (action === 'reject') {
        db.students.splice(idx, 1);
        writeDatabase(db);
        await pgDeleteStudent(id);
      }
    }

    return res.json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Action failed.' });
  }
});

app.post('/api/assignments', async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id, title, description, due_date } = req.body;
    if (!class_id || !subject_id || !title) return res.status(400).json({ error: 'Missing required fields.' });

    const db = readDatabase();
    const school = getActiveSchool(db);
    const newAssignment = {
      id: `assgn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      school_id: school.id,
      class_id,
      subject_id,
      teacher_id,
      title,
      description: description || '',
      due_date: due_date || '',
      created_at: new Date().toISOString()
    };
    db.assignments.push(newAssignment);
    writeDatabase(db);
    return res.json({ status: 'success', data: newAssignment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create assignment.' });
  }
});

app.post('/api/assignments/submit', async (req, res) => {
  try {
    const { assignment_id, student_id, content } = req.body;
    if (!assignment_id || !student_id || !content) return res.status(400).json({ error: 'Missing required fields.' });

    const db = readDatabase();
    const existing = db.assignment_submissions.findIndex(s => s.assignment_id === assignment_id && s.student_id === student_id);
    
    if (existing >= 0) {
      db.assignment_submissions[existing].content = content;
      db.assignment_submissions[existing].submitted_at = new Date().toISOString();
    } else {
      const newSubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        assignment_id,
        student_id,
        content,
        submitted_at: new Date().toISOString()
      };
      db.assignment_submissions.push(newSubmission);
    }
    
    writeDatabase(db);
    return res.json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to submit assignment.' });
  }
});

app.post('/api/logout', async (req, res) => {
  res.json({ status: 'success', message: 'Logged out successfully.' });
});

// Helper to get active school (multi-tenant ready, defaulting to first school)
function getActiveSchool(db: any): School {
  return db.schools[0] || {
    id: 'school_1',
    name: 'Rana School',
    phone: '03035608778',
    email: 'rana@school.com',
    address: 'Lahore, Lahore, Pakistan',
    tagline: 'Excellence in Education',
    logo_url: '',
    signature_url: '',
    active_session_id: 'session_1'
  };
}

// -----------------------------------------------------------------------------
// AI ENDPOINTS: 30-Day Growth Roadmap using Gemini 3.5 Flash
// -----------------------------------------------------------------------------
app.post('/api/ai/growth-roadmap', async (req, res) => {
  try {
    const db = readDatabase();
    const activeSchool = getActiveSchool(db);
    
    // Compile some high level metrics to feed the AI
    const studentCount = db.students.filter(s => s.status === 'active').length;
    const staffCount = db.staff.filter(s => s.status === 'active').length;
    
    // Calculate total pending fee
    const totalPendingFee = db.fee_heads.reduce((sum, fh) => sum + fh.pending_amount, 0);
    const totalCollected = db.payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate attendance rate (last 10 records)
    const totalAttendanceCount = db.attendance.length;
    const presentCount = db.attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalAttendanceCount > 0 ? (presentCount / totalAttendanceCount) * 100 : 85;

    // Build standard Pakistan context prompts
    const prompt = `
      You are the Principal and Strategy consultant for "${activeSchool.name}", a school in Lahore, Pakistan.
      We need a customized, highly professional "30-Day Growth Roadmap" broken down into Week 1, Week 2, Week 3, and Week 4.
      
      Here are our current school metrics:
      - Active Students: ${studentCount} (Max capacity configured is 150)
      - Enrolled Teachers: ${staffCount}
      - Total Outstanding (Uncollected) Fees: Rs. ${totalPendingFee}
      - Fees Collected This Month: Rs. ${totalCollected}
      - Student Attendance Rate: ${attendanceRate.toFixed(1)}%

      Based on these exact numbers (e.g., if uncollected fees are high, push hard on collection; if active students are low, push hard on enrollment outreach; if attendance is low, push on parent alerts), generate a JSON array with exactly 4 entries, one for each week.
      
      You must respond with raw JSON in the following schema:
      [
        {
          "week": 1,
          "title": "Short catchy Urdu/English bilingual focus title",
          "recommendation": "A detailed 1-2 sentence recommendation in Urdu-infused professional English (Roman Urdu micro-phrases are highly encouraged, e.g., 'Parents ko notify karein', 'Fee recovery drive shuru karein')."
        },
        ...
      ]

      Do not wrap the JSON in markdown blocks like \`\`\`json. Return only the raw JSON.
    `;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Fallback roadmap if API key is not set
      console.warn('GEMINI_API_KEY is not defined, returning default calculated roadmap');
      const fallbackRoadmap = generateDefaultRoadmap(totalPendingFee, studentCount, attendanceRate);
      return res.json(fallbackRoadmap);
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
    const parsedData = JSON.parse(text.trim());
    res.json(parsedData);

  } catch (error) {
    console.error('Gemini API Error in Roadmap Generation:', error);
    // Safe fallback to keep application fully working
    const db = readDatabase();
    const studentCount = db.students.filter(s => s.status === 'active').length;
    const totalPendingFee = db.fee_heads.reduce((sum, fh) => sum + fh.pending_amount, 0);
    const fallback = generateDefaultRoadmap(totalPendingFee, studentCount, 90);
    res.json(fallback);
  }
});

function generateDefaultRoadmap(totalPending: number, studentCount: number, attRate: number) {
  return [
    {
      week: 1,
      title: totalPending > 20000 ? "Fee Recovery & Alerts Drive" : "Admission Counseling Warm-up",
      recommendation: totalPending > 20000
        ? "Top pending families ki check-list prepare karein. Send personalized alerts via WhatsApp Center to clear outstanding dues immediately."
        : "Conduct 1-on-1 counseling with prospective parents to fill remaining seats. Direct staff to prepare brochures."
    },
    {
      week: 2,
      title: studentCount < 50 ? "Bilingual Social Marketing & Referral Plan" : "Academic Progress Review",
      recommendation: studentCount < 50
        ? "Launch neighborhood referral program: 'Sarkari ya private, behtareen taleem' targeting local families with active discounts on admission."
        : "Organize parent-teacher feedback sessions. Review mid-term curriculum progress with teachers."
    },
    {
      week: 3,
      title: attRate < 85 ? "Attendance Punctuality Tracking Campaign" : "Staff Evaluation & Lesson Plans",
      recommendation: attRate < 85
        ? "Monitor daily attendance trends. Unannounced absent students ke parents ko call karke status confirm karein to restore baseline."
        : "Evaluate teaching methodologies. Map student subject deficiencies in Grade 5 and Grade 8."
    },
    {
      week: 4,
      title: "Co-curricular Spotlight & Admission Push",
      recommendation: "Host a small student project display (Science exhibition). Share pictures on social media to build strong brand recognition."
    }
  ];
}


// -----------------------------------------------------------------------------
// CORE SYSTEM CONFIG / GENERAL GET ENDPOINT
// -----------------------------------------------------------------------------
app.get('/api/db', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const { success, data, error } = await pullDataFromSupabase(supabaseUrl, supabaseKey);
    if (!success || !data) {
      throw new Error(error || 'Failed to pull data from Supabase');
    }

    res.json(data);
  } catch (err) {
    console.error('Supabase connection failed or not initialized, falling back to in-memory dbStore:', err);
    res.json(readDatabase());
  }
});

app.post('/api/db/overwrite', async (req, res) => {
  try {
    const newDb = req.body;
    if (!newDb || typeof newDb !== 'object') {
      return res.status(400).json({ error: 'Invalid database payload' });
    }
    await writeDatabase(newDb);
    res.json({ status: 'success', message: 'Database overwritten successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/school-branding', (req, res) => {
  const db = readDatabase();
  res.json(getActiveSchool(db));
});

app.put('/api/school-branding', async (req, res) => {
  const db = readDatabase();
  const index = db.schools.findIndex(s => s.id === 'school_1');
  if (index !== -1) {
    db.schools[index] = { ...db.schools[index], ...req.body };
    await writeDatabase(db);
    res.json({ status: 'success', school: db.schools[index] });
  } else {
    res.status(404).json({ error: 'School not found' });
  }
});

app.post('/api/dummy-data', async (req, res) => {
  fillDummyData();
  res.json({ status: 'success', message: 'Demo data filled successfully!' });
});

app.post('/api/erase-all', async (req, res) => {
  clearAllData();
  res.json({ status: 'success', message: 'Database cleared completely.' });
});

// -----------------------------------------------------------------------------
// SNAPSHOTS & BACKUPS ENDPOINTS
// -----------------------------------------------------------------------------
const SNAPSHOTS_DIR = path.join(process.cwd(), 'data', 'snapshots');

function ensureSnapshotsDirExists() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

app.get('/api/backups/snapshots', (req, res) => {
  try {
    ensureSnapshotsDirExists();
    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const snapshots = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(SNAPSHOTS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime || stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(snapshots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backups/snapshots', async (req, res) => {
  try {
    ensureSnapshotsDirExists();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const label = req.body.label ? `_${req.body.label.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = `snapshot_${timestamp}${label}.json`;
    const destPath = path.join(SNAPSHOTS_DIR, filename);
    
    fs.writeFileSync(destPath, JSON.stringify(readDatabase(), null, 2), 'utf-8');
    
    const stats = fs.statSync(destPath);
    res.json({
      status: 'success',
      snapshot: {
        filename,
        size: stats.size,
        createdAt: stats.birthtime || stats.mtime
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backups/snapshots/restore', async (req, res) => {
  try {
    ensureSnapshotsDirExists();
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required to restore' });
    }
    const sourcePath = path.join(SNAPSHOTS_DIR, filename);
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Snapshot file not found' });
    }
    
    // Create an automatic pre-restore backup just in case!
    const preRestoreFilename = `pre_restore_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(SNAPSHOTS_DIR, preRestoreFilename), JSON.stringify(readDatabase(), null, 2), 'utf-8');
    const snapshotData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    await writeDatabase(snapshotData);
    
    res.json({ status: 'success', message: 'Database successfully restored from snapshot!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/backups/snapshots/:filename', async (req, res) => {
  try {
    ensureSnapshotsDirExists();
    const filename = req.params.filename;
    const filePath = path.join(SNAPSHOTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ status: 'success', message: 'Snapshot deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// CLASS, SECTION, SUBJECT CRUD
// -----------------------------------------------------------------------------
app.get('/api/classes', (req, res) => {
  res.json(readDatabase().classes);
});

app.post('/api/classes', async (req, res) => {
  const db = readDatabase();
  const newClass: Class = {
    id: `class_${Date.now()}`,
    school_id: 'school_1',
    name: req.body.name
  };
  db.classes.push(newClass);
  await writeDatabase(db);
  await pgUpsertClass(newClass);
  res.json({ status: 'success', class: newClass });
});

app.delete('/api/classes/:id', async (req, res) => {
  const db = readDatabase();
  db.classes = db.classes.filter(c => c.id !== req.params.id);
  // clean up sections/subjects mapping
  db.sections = db.sections.filter(s => s.class_id !== req.params.id);
  db.class_subjects = db.class_subjects.filter(cs => cs.class_id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteClass(req.params.id);
  res.json({ status: 'success' });
});

app.get('/api/sections', (req, res) => {
  res.json(readDatabase().sections);
});

app.post('/api/sections', async (req, res) => {
  const db = readDatabase();
  const newSection: Section = {
    id: `sec_${Date.now()}`,
    class_id: req.body.class_id,
    name: req.body.name
  };
  db.sections.push(newSection);
  await writeDatabase(db);
  await pgUpsertSection(newSection);
  res.json({ status: 'success', section: newSection });
});

app.delete('/api/sections/:id', async (req, res) => {
  const db = readDatabase();
  db.sections = db.sections.filter(s => s.id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteSection(req.params.id);
  res.json({ status: 'success' });
});

app.get('/api/subjects', (req, res) => {
  res.json(readDatabase().subjects);
});

app.post('/api/subjects', async (req, res) => {
  const db = readDatabase();
  const newSubj: Subject = {
    id: `subj_${Date.now()}`,
    school_id: 'school_1',
    name: req.body.name
  };
  db.subjects.push(newSubj);
  await writeDatabase(db);
  await pgUpsertSubject(newSubj);
  res.json({ status: 'success', subject: newSubj });
});

app.delete('/api/subjects/:id', async (req, res) => {
  const db = readDatabase();
  db.subjects = db.subjects.filter(s => s.id !== req.params.id);
  db.class_subjects = db.class_subjects.filter(cs => cs.subject_id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteSubject(req.params.id);
  res.json({ status: 'success' });
});

app.get('/api/class-subjects', (req, res) => {
  res.json(readDatabase().class_subjects);
});

app.post('/api/class-subjects', async (req, res) => {
  const db = readDatabase();
  const { class_id, subject_ids } = req.body;
  
  // Clear existing mappings for this class first
  db.class_subjects = db.class_subjects.filter(cs => cs.class_id !== class_id);
  
  // Create new mappings
  if (Array.isArray(subject_ids)) {
    subject_ids.forEach(sid => {
      db.class_subjects.push({ class_id, subject_id: sid });
    });
  }
  
  await writeDatabase(db);
  // Sync new class-subject mappings to Postgres
  for (const sid of (Array.isArray(subject_ids) ? subject_ids : [])) {
    await pgUpsertClassSubject(class_id, sid);
  }
  res.json({ status: 'success' });
});

// -----------------------------------------------------------------------------
// SESSIONS
// -----------------------------------------------------------------------------
app.get('/api/sessions', (req, res) => {
  res.json(readDatabase().sessions);
});

app.post('/api/sessions', async (req, res) => {
  const db = readDatabase();
  const newSession: Session = {
    id: `session_${Date.now()}`,
    school_id: 'school_1',
    label: req.body.label,
    start_date: req.body.start_date || '2026-03-01',
    end_date: req.body.end_date || '2027-02-28',
    is_active: req.body.is_active || false
  };
  
  if (newSession.is_active) {
    db.sessions.forEach(s => s.is_active = false);
  }
  db.sessions.push(newSession);
  await writeDatabase(db);
  await pgUpsertSession(newSession);
  res.json({ status: 'success', session: newSession });
});

// -----------------------------------------------------------------------------
// ADMISSIONS & STUDENT WORKSPACE
// -----------------------------------------------------------------------------
app.get('/api/students', (req, res) => {
  res.json(readDatabase().students);
});

app.post('/api/students', async (req, res) => {
  const db = readDatabase();
  const regNoSuffix = String(db.students.length + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  const reg_no = `RS-${year}-${regNoSuffix}`;

  const defaultPassword = Math.random().toString(36).slice(-6);
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const newStudent: Student = {
    id: `stud_${Date.now()}`,
    school_id: 'school_1',
    reg_no,
    login_id: req.body.name.toLowerCase().replace(/\s+/g, '_') + '_' + regNoSuffix,
    password_hash: passwordHash,
    name: req.body.name,
    father_name: req.body.father_name,
    gender: req.body.gender || 'male',
    dob: req.body.dob || '2016-01-01',
    contact: req.body.contact,
    alt_phone: req.body.alt_phone || '',
    address: req.body.address || '',
    emergency_contact: req.body.emergency_contact || req.body.contact,
    guardian_name: req.body.guardian_name || req.body.father_name,
    guardian_contact: req.body.guardian_contact || req.body.contact,
    class_id: req.body.class_id,
    section_id: req.body.section_id,
    admission_date: req.body.admission_date || new Date().toISOString().split('T')[0],
    billing_mode: req.body.billing_mode || 'individual',
    family_id: req.body.family_id || '',
    manual_monthly_fee: Number(req.body.manual_monthly_fee) || 0,
    status: req.body.status || 'active'
  };

  db.students.push(newStudent);

  // Auto-generate standard starting fees for this child
  // Expected monthly fee logic: use class-configured fee unless custom override is set
  const classObj = db.classes.find(c => c.id === newStudent.class_id);
  const classDefaultFee = classObj?.name.includes('8') ? 3500 : 2500; // Mock fee rules per class
  const tuitionFee = newStudent.manual_monthly_fee > 0 ? newStudent.manual_monthly_fee : classDefaultFee;

  // Monthly Tuition Fee
  const monthlyFee: FeeHead = {
    id: `fh_${Date.now()}_1`,
    student_id: newStudent.id,
    type: 'monthly',
    title: 'Current Month Fee (April 2026)',
    period_label: 'April 2026',
    configured_amount: tuitionFee,
    expected_amount: tuitionFee,
    pending_amount: tuitionFee,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING'
  };

  // Admission Fee
  const admissionFeeAmount = Number(req.body.admission_fee) || 2250;
  const admissionFee: FeeHead = {
    id: `fh_${Date.now()}_2`,
    student_id: newStudent.id,
    type: 'one_time',
    title: 'Admission Fee Due',
    period_label: 'March 2026',
    configured_amount: admissionFeeAmount,
    expected_amount: admissionFeeAmount,
    pending_amount: admissionFeeAmount,
    charge_date: newStudent.admission_date,
    due_date: '2026-04-10',
    status: 'PENDING'
  };

  db.fee_heads.push(monthlyFee, admissionFee);
  await writeDatabase(db);
  await pgUpsertStudent(newStudent);
  await pgUpsertFeeHead(monthlyFee);
  await pgUpsertFeeHead(admissionFee);
  res.json({ status: 'success', student: newStudent });
});

app.put('/api/students/:id', async (req, res) => {
  const db = readDatabase();
  const idx = db.students.findIndex(s => s.id === req.params.id);
  if (idx !== -1) {
    db.students[idx] = { ...db.students[idx], ...req.body };
    await writeDatabase(db);
    await pgUpsertStudent(db.students[idx]);
    res.json({ status: 'success', student: db.students[idx] });
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const db = readDatabase();
  db.students = db.students.filter(s => s.id !== req.params.id);
  db.fee_heads = db.fee_heads.filter(fh => fh.student_id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteStudent(req.params.id);
  res.json({ status: 'success' });
});

// -----------------------------------------------------------------------------
// FAMILIES CRUD
// -----------------------------------------------------------------------------
app.get('/api/families', (req, res) => {
  res.json(readDatabase().families);
});

app.post('/api/families', async (req, res) => {
  const db = readDatabase();
  const randomSuffix = String(Math.floor(10000000 + Math.random() * 90000000));
  const family_key = req.body.guardian_contact ? `FAM-${req.body.guardian_contact}` : `FAM-${randomSuffix}`;

  const newFamily: Family = {
    id: `fam_${Date.now()}`,
    school_id: 'school_1',
    family_key,
    guardian_name: req.body.guardian_name,
    guardian_contact: req.body.guardian_contact,
    note: req.body.note || '',
    is_active: true
  };

  db.families.push(newFamily);
  await writeDatabase(db);
  await pgUpsertFamily(newFamily);
  res.json({ status: 'success', family: newFamily });
});

app.delete('/api/families/:id', async (req, res) => {
  const db = readDatabase();
  db.families = db.families.filter(f => f.id !== req.params.id);
  // Unlink students in family mode
  db.students.forEach(s => {
    if (s.family_id === req.params.id) {
      s.family_id = '';
      s.billing_mode = 'individual';
    }
  });
  await writeDatabase(db);
  await pgDeleteFamily(req.params.id);
  res.json({ status: 'success' });
});

// -----------------------------------------------------------------------------
// STAFF / TEACHERS
// -----------------------------------------------------------------------------
app.get('/api/staff', (req, res) => {
  res.json(readDatabase().staff);
});

app.post('/api/staff', async (req, res) => {
  const db = readDatabase();
  const suffix = String(db.staff.length + 1).padStart(4, '0');
  const employee_id = `EMP-2026-${suffix}`;
  
  const passwordHash = await bcrypt.hash('staff123', 10);

  const newStaff: Staff = {
    id: `staff_${Date.now()}`,
    school_id: 'school_1',
    employee_id,
    login_id: req.body.name.toLowerCase().replace(/\s+/g, '_') + '_' + suffix,
    password_hash: passwordHash,
    name: req.body.name,
    father_name: req.body.father_name,
    cnic: req.body.cnic,
    contact: req.body.contact,
    gender: req.body.gender || 'male',
    dob: req.body.dob || '1990-01-01',
    joining_date: req.body.joining_date || new Date().toISOString().split('T')[0],
    salary: Number(req.body.salary) || 30000,
    qualification: req.body.qualification || '',
    address: req.body.address || '',
    status: 'active'
  };

  db.staff.push(newStaff);
  await writeDatabase(db);
  await pgUpsertStaff(newStaff);
  res.json({ status: 'success', staff: newStaff });
});

app.delete('/api/staff/:id', async (req, res) => {
  const db = readDatabase();
  db.staff = db.staff.filter(s => s.id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteStaff(req.params.id);
  res.json({ status: 'success' });
});

app.get('/api/staff-assignments', (req, res) => {
  res.json(readDatabase().staff_assignments);
});

app.post('/api/staff-assignments', async (req, res) => {
  const db = readDatabase();
  const { staff_id, class_id, subject_id } = req.body;
  
  // Clear any identical assignments first
  db.staff_assignments = db.staff_assignments.filter(
    sa => !(sa.staff_id === staff_id && sa.class_id === class_id && sa.subject_id === subject_id)
  );

  db.staff_assignments.push({ staff_id, class_id, subject_id });
  await writeDatabase(db);
  await pgUpsertStaffAssignment(staff_id, class_id, subject_id);
  res.json({ status: 'success' });
});

// -----------------------------------------------------------------------------
// ATTENDANCE MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/attendance', (req, res) => {
  res.json(readDatabase().attendance);
});

app.post('/api/attendance', async (req, res) => {
  const db = readDatabase();
  const { class_id, date, records } = req.body; // records is array of { student_id, status }

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Records must be array.' });
  }

  // Check if calendar day exists and is a working day
  const calDay = db.calendar_days.find(d => d.date === date);
  if (calDay && !calDay.is_working_day) {
    return res.status(400).json({ error: 'Cannot mark attendance on holidays/non-working days.' });
  }

  // Clear existing attendance records for this class on this date to support updates/saves
  db.attendance = db.attendance.filter(a => !(a.class_id === class_id && a.date === date));

  // Push new rows
  records.forEach(rec => {
    db.attendance.push({
      id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      student_id: rec.student_id,
      class_id,
      date,
      status: rec.status // 'present' | 'absent' | 'leave'
    });
  });

  await writeDatabase(db);
  for (const rec of db.attendance.filter(a => a.class_id === class_id && a.date === date)) {
    await pgUpsertAttendance(rec);
  }
  res.json({ status: 'success', message: 'Student attendance saved successfully!' });
});

app.post('/api/attendance/scan', async (req, res) => {
  try {
    const db = readDatabase();
    const { reg_no, date, status } = req.body;
    
    if (!reg_no) {
      return res.status(400).json({ error: 'Registration number is required.' });
    }
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const student = db.students.find(s => s.reg_no.trim().toLowerCase() === reg_no.trim().toLowerCase() && s.status === 'active');
    if (!student) {
      return res.status(404).json({ error: `Active student with registration number "${reg_no}" not found.` });
    }
    
    // Check if calendar day exists and is a working day
    const calDay = db.calendar_days.find(d => d.date === targetDate);
    if (calDay && !calDay.is_working_day) {
      return res.status(400).json({ error: 'Cannot mark attendance on holidays/non-working days.' });
    }
    
    // Remove existing record for this specific student on this date to prevent duplicate rows
    db.attendance = db.attendance.filter(a => !(a.student_id === student.id && a.date === targetDate));
    
    // Push new attendance record
    const newRecord = {
      id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      student_id: student.id,
      class_id: student.class_id,
      date: targetDate,
      status: status || 'present'
    };
    
    db.attendance.push(newRecord);
    await writeDatabase(db);
    await pgUpsertAttendance(newRecord);
    
    res.json({
      status: 'success',
      student,
      record: newRecord,
      message: `${student.name} marked as ${status || 'present'} successfully!`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during scan attendance.' });
  }
});

app.get('/api/staff-attendance', (req, res) => {
  res.json(readDatabase().staff_attendance);
});

app.post('/api/staff-attendance', async (req, res) => {
  const db = readDatabase();
  const { date, records } = req.body; // records is array of { staff_id, status }

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Records must be array.' });
  }

  db.staff_attendance = db.staff_attendance.filter(sa => sa.date !== date);

  records.forEach(rec => {
    db.staff_attendance.push({
      id: `satt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      staff_id: rec.staff_id,
      date,
      status: rec.status
    });
  });

  await writeDatabase(db);
  for (const rec of db.staff_attendance.filter(sa => sa.date === date)) {
    await pgUpsertStaffAttendance(rec);
  }
  res.json({ status: 'success', message: 'Staff attendance saved successfully!' });
});

app.get('/api/calendar', (req, res) => {
  res.json(readDatabase().calendar_days);
});

app.post('/api/calendar', async (req, res) => {
  const db = readDatabase();
  const { date, is_working_day } = req.body;
  
  db.calendar_days = db.calendar_days.filter(d => d.date !== date);
  db.calendar_days.push({
    id: `cal_${Date.now()}`,
    school_id: 'school_1',
    date,
    is_working_day: Boolean(is_working_day)
  });

  const calEntry = db.calendar_days.find(d => d.date === date)!;
  await writeDatabase(db);
  await pgUpsertCalendarDay(calEntry);
  res.json({ status: 'success', calendar: db.calendar_days });
});

// -----------------------------------------------------------------------------
// EXAMS MANAGEMENT
// -----------------------------------------------------------------------------
app.get('/api/exams', (req, res) => {
  res.json(readDatabase().exams);
});

app.post('/api/exams', async (req, res) => {
  const db = readDatabase();
  const newExam: Exam = {
    id: `exam_${Date.now()}`,
    school_id: 'school_1',
    name: req.body.name,
    term: req.body.term,
    date_start: req.body.date_start,
    date_end: req.body.date_end
  };
  db.exams.push(newExam);
  await writeDatabase(db);
  await pgUpsertExam(newExam);
  res.json({ status: 'success', exam: newExam });
});

app.get('/api/exam-assignments', (req, res) => {
  res.json(readDatabase().exam_assignments);
});

app.post('/api/exam-assignments', async (req, res) => {
  const db = readDatabase();
  const { exam_id, class_id, subject_id } = req.body;
  db.exam_assignments.push({ exam_id, class_id, subject_id });
  await writeDatabase(db);
  await pgUpsertExamAssignment(exam_id, class_id, subject_id);
  res.json({ status: 'success' });
});

app.get('/api/exam-results', (req, res) => {
  res.json(readDatabase().exam_results);
});

app.post('/api/exam-results', async (req, res) => {
  const db = readDatabase();
  const { exam_id, student_id, subject_id, marks_obtained, marks_total } = req.body;
  
  db.exam_results = db.exam_results.filter(
    er => !(er.exam_id === exam_id && er.student_id === student_id && er.subject_id === subject_id)
  );

  const newResult: ExamResult = {
    id: `res_${Date.now()}`,
    exam_id,
    student_id,
    subject_id,
    marks_obtained: Number(marks_obtained),
    marks_total: Number(marks_total)
  };
  
  db.exam_results.push(newResult);
  await writeDatabase(db);
  await pgUpsertExamResult(newResult);
  res.json({ status: 'success', result: newResult });
});

// -----------------------------------------------------------------------------
// FEE heads, RECORD PAYMENT AND LEDGER AUTO-SYNC
// -----------------------------------------------------------------------------
app.get('/api/fee-heads', (req, res) => {
  res.json(readDatabase().fee_heads);
});

function getMonthlyPeriodInfo(referenceDate = new Date()) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[referenceDate.getMonth()];
  const year = referenceDate.getFullYear();
  return {
    periodLabel: `${month} ${year}`,
    chargeDate: `${year}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}-01`,
    dueDate: `${year}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}-10`
  };
}

function getClassDefaultFee(className: string, manualMonthlyFee: number) {
  if (manualMonthlyFee > 0) return manualMonthlyFee;
  if (/8/i.test(className)) return 3500;
  if (/5/i.test(className)) return 3000;
  return 2500;
}

app.post('/api/generate-bills', async (req, res) => {
  const db = readDatabase();
  const { class_id } = req.body || {};
  const { periodLabel, chargeDate, dueDate } = getMonthlyPeriodInfo();

  const targetStudents = db.students.filter(student => {
    const isActive = student.status === 'active';
    if (!isActive) return false;
    if (class_id && class_id !== 'all') return student.class_id === class_id;
    return true;
  });

  let generatedCount = 0;
  const createdHeads: FeeHead[] = [];

  for (const student of targetStudents) {
    const alreadyGenerated = db.fee_heads.some(
      feeHead =>
        feeHead.student_id === student.id &&
        feeHead.type === 'monthly' &&
        feeHead.period_label === periodLabel
    );

    if (alreadyGenerated) continue;

    const classRecord = db.classes.find(item => item.id === student.class_id);
    const className = classRecord?.name || 'Grade 1';
    const monthlyAmount = getClassDefaultFee(className, Number(student.manual_monthly_fee) || 0);

    const newFeeHead: FeeHead = {
      id: `fh_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      student_id: student.id,
      type: 'monthly',
      title: `Current Month Fee (${periodLabel})`,
      period_label: periodLabel,
      configured_amount: monthlyAmount,
      expected_amount: monthlyAmount,
      pending_amount: monthlyAmount,
      charge_date: chargeDate,
      due_date: dueDate,
      status: 'PENDING'
    };

    db.fee_heads.push(newFeeHead);
    createdHeads.push(newFeeHead);
    generatedCount += 1;
  }

  if (generatedCount > 0) {
    await writeDatabase(db);
    for (const fh of createdHeads) {
      await pgUpsertFeeHead(fh);
    }
  }

  res.json({
    status: 'success',
    generated_count: generatedCount,
    created_heads: createdHeads,
    period_label: periodLabel
  });
});

app.post('/api/fee-heads', async (req, res) => {
  const db = readDatabase();
  const { student_id, type, title, configured_amount } = req.body;

  const newFeeHead: FeeHead = {
    id: `fh_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    student_id,
    type, // 'monthly' | 'one_time' | 'credit' | 'custom'
    title,
    period_label: 'April 2026',
    configured_amount: Number(configured_amount),
    expected_amount: Number(configured_amount),
    pending_amount: Number(configured_amount),
    charge_date: new Date().toISOString().split('T')[0],
    due_date: '2026-04-30',
    status: 'PENDING'
  };

  db.fee_heads.push(newFeeHead);
  await writeDatabase(db);
  await pgUpsertFeeHead(newFeeHead);
  res.json({ status: 'success', fee_head: newFeeHead, message: 'Student expense added successfully!' });
});

// Main Fee Collection Payment processing (with split payments and Ledger entries posting)
app.post('/api/payments', async (req, res) => {
  const db = readDatabase();
  const { student_id, amount, method, fee_head_id, note, receipt_type } = req.body;
  const payAmount = Number(amount);

  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ error: 'Invalid payment amount.' });
  }

  const student = db.students.find(s => s.id === student_id);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const payDate = new Date().toISOString().split('T')[0];
  const receipt_no = `RCPT-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8)}-${String(Math.floor(100000 + Math.random() * 900000))}`;

  // Process partial or full allocations
  let remainingPay = payAmount;
  const targetFeeHeads = db.fee_heads.filter(fh => fh.student_id === student_id && fh.status === 'PENDING');

  // Sort them so that we clear older or critical dues first (monthly and one-time)
  targetFeeHeads.sort((a, b) => {
    if (a.type === 'one_time') return -1;
    if (b.type === 'one_time') return 1;
    return 0;
  });

  // If a specific fee head was highlighted by the user:
  if (fee_head_id) {
    const selectedFh = db.fee_heads.find(fh => fh.id === fee_head_id);
    if (selectedFh && selectedFh.status === 'PENDING') {
      const allocate = Math.min(remainingPay, selectedFh.pending_amount);
      selectedFh.pending_amount -= allocate;
      remainingPay -= allocate;
      if (selectedFh.pending_amount <= 0) {
        selectedFh.status = 'PAID';
      }

      // Record a single payment record for reference
      const payment: Payment = {
        id: `pay_${Date.now()}`,
        student_id,
        fee_head_id: selectedFh.id,
        amount: allocate,
        payment_date: payDate,
        method: method || 'Cash',
        receipt_no,
        txn_ref: '',
        note: note || '',
        receipt_type: receipt_type || 'invoice'
      };
      db.payments.push(payment);
    }
  } else {
    // Split across all open dues
    for (const fh of targetFeeHeads) {
      if (remainingPay <= 0) break;
      const allocate = Math.min(remainingPay, fh.pending_amount);
      fh.pending_amount -= allocate;
      remainingPay -= allocate;
      if (fh.pending_amount <= 0) {
        fh.status = 'PAID';
      }

      const payment: Payment = {
        id: `pay_${Date.now()}_${fh.id}`,
        student_id,
        fee_head_id: fh.id,
        amount: allocate,
        payment_date: payDate,
        method: method || 'Cash',
        receipt_no,
        txn_ref: '',
        note: note || '',
        receipt_type: receipt_type || 'invoice'
      };
      db.payments.push(payment);
    }
  }

  // AUTO LEDGER Posting
  postToLedger(
    db,
    'school_1',
    payDate,
    'Fee Payment',
    `${student.name} (${student.reg_no})`,
    0, // debit (no expense)
    payAmount // credit (income received)
  );

  await writeDatabase(db);
  // Sync updated fee heads and new payments to Postgres
  for (const fh of db.fee_heads.filter(f => f.student_id === student_id)) {
    await pgUpsertFeeHead(fh);
  }
  for (const pay of db.payments.filter(p => p.receipt_no === receipt_no)) {
    await pgUpsertPayment(pay);
  }
  // Sync new ledger entries
  const lastLedger = db.ledger_entries[db.ledger_entries.length - 1];
  if (lastLedger) await pgUpsertLedgerEntry(lastLedger);
  res.json({
    status: 'success',
    receipt_no,
    amount_paid: payAmount,
    message: 'Payment received and recorded successfully.'
  });
});

// -----------------------------------------------------------------------------
// EXPENSES & INCOME (ACCOUNTING)
// -----------------------------------------------------------------------------
app.get('/api/expenses', (req, res) => {
  res.json(readDatabase().expenses);
});

app.post('/api/expenses', async (req, res) => {
  const db = readDatabase();
  const { description, category, amount, date } = req.body;
  const expAmount = Number(amount);

  const newExp: Expense = {
    id: `exp_${Date.now()}`,
    school_id: 'school_1',
    description,
    category, // Salaries, Utilities, Maintenance, Supplies, Misc
    amount: expAmount,
    date: date || new Date().toISOString().split('T')[0]
  };

  db.expenses.push(newExp);

  // AUTO POST to Ledger as a Debit!
  postToLedger(
    db,
    'school_1',
    newExp.date,
    'Expense',
    `${description} [${category}]`,
    expAmount, // debit
    0 // credit
  );

  await writeDatabase(db);
  await pgUpsertExpense(newExp);
  const lastLedgerExp = db.ledger_entries[db.ledger_entries.length - 1];
  if (lastLedgerExp) await pgUpsertLedgerEntry(lastLedgerExp);
  res.json({ status: 'success', expense: newExp });
});

app.delete('/api/expenses/:id', async (req, res) => {
  const db = readDatabase();
  // Find expense to reverse or remove ledger if necessary (or simply remove from array)
  db.expenses = db.expenses.filter(e => e.id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteExpense(req.params.id);
  res.json({ status: 'success' });
});

app.get('/api/income', (req, res) => {
  res.json(readDatabase().income);
});

app.post('/api/income', async (req, res) => {
  const db = readDatabase();
  const { description, source, amount, date } = req.body;
  const incAmount = Number(amount);

  const newInc: Income = {
    id: `inc_${Date.now()}`,
    school_id: 'school_1',
    description,
    source, // Donations, Sales, etc.
    amount: incAmount,
    date: date || new Date().toISOString().split('T')[0]
  };

  db.income.push(newInc);

  // AUTO POST to Ledger as a Credit!
  postToLedger(
    db,
    'school_1',
    newInc.date,
    'Income',
    `${description} [${source}]`,
    0, // debit
    incAmount // credit
  );

  await writeDatabase(db);
  await pgUpsertIncome(newInc);
  const lastLedgerInc = db.ledger_entries[db.ledger_entries.length - 1];
  if (lastLedgerInc) await pgUpsertLedgerEntry(lastLedgerInc);
  res.json({ status: 'success', income: newInc });
});

app.delete('/api/income/:id', async (req, res) => {
  const db = readDatabase();
  db.income = db.income.filter(i => i.id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteIncome(req.params.id);
  res.json({ status: 'success' });
});

app.get('/api/ledger', (req, res) => {
  res.json(readDatabase().ledger_entries);
});

// -----------------------------------------------------------------------------
// BAD DEBTS
// -----------------------------------------------------------------------------
app.get('/api/bad-debts', (req, res) => {
  res.json(readDatabase().bad_debts);
});

app.post('/api/bad-debts', async (req, res) => {
  const db = readDatabase();
  const { student_id, amount, reason, date } = req.body;
  const bdAmount = Number(amount);

  const newBd: BadDebt = {
    id: `bd_${Date.now()}`,
    student_id,
    amount: bdAmount,
    reason,
    date: date || new Date().toISOString().split('T')[0]
  };

  db.bad_debts.push(newBd);

  // AUTO POST to Ledger as a Debit!
  postToLedger(
    db,
    'school_1',
    newBd.date,
    'Bad Debt',
    `Written off: ${reason}`,
    bdAmount, // debit
    0 // credit
  );

  await writeDatabase(db);
  await pgUpsertBadDebt(newBd);
  const lastLedgerBd = db.ledger_entries[db.ledger_entries.length - 1];
  if (lastLedgerBd) await pgUpsertLedgerEntry(lastLedgerBd);
  res.json({ status: 'success', bad_debt: newBd });
});

// -----------------------------------------------------------------------------
// STATIONERY
// -----------------------------------------------------------------------------
app.get('/api/stationery', (req, res) => {
  res.json(readDatabase().stationery_items);
});

app.post('/api/stationery', async (req, res) => {
  const db = readDatabase();
  const { item_name, quantity, unit_price } = req.body;

  const newItem: StationeryItem = {
    id: `stat_${Date.now()}`,
    school_id: 'school_1',
    item_name,
    quantity: Number(quantity),
    unit_price: Number(unit_price)
  };

  db.stationery_items.push(newItem);
  await writeDatabase(db);
  await pgUpsertStationery(newItem);
  res.json({ status: 'success', item: newItem });
});

app.delete('/api/stationery/:id', async (req, res) => {
  const db = readDatabase();
  db.stationery_items = db.stationery_items.filter(i => i.id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteStationery(req.params.id);
  res.json({ status: 'success' });
});

// -----------------------------------------------------------------------------
// INVENTORY
// -----------------------------------------------------------------------------
app.get('/api/inventory', (req, res) => {
  res.json(readDatabase().inventory_items);
});

app.post('/api/inventory', async (req, res) => {
  const db = readDatabase();
  const { item_name, category, quantity, value } = req.body;

  const newItem: InventoryItem = {
    id: `inv_${Date.now()}`,
    school_id: 'school_1',
    item_name,
    category,
    quantity: Number(quantity),
    value: Number(value)
  };

  db.inventory_items.push(newItem);
  await writeDatabase(db);
  await pgUpsertInventory(newItem);
  res.json({ status: 'success', item: newItem });
});

app.delete('/api/inventory/:id', async (req, res) => {
  const db = readDatabase();
  db.inventory_items = db.inventory_items.filter(i => i.id !== req.params.id);
  await writeDatabase(db);
  await pgDeleteInventory(req.params.id);
  res.json({ status: 'success' });
});

// -----------------------------------------------------------------------------
// VITE DEV / PROD SERVER BOOTSTRAPPING
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createRequire } = await import('node:module');
    const metaUrl = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : (typeof __filename !== 'undefined' ? __filename : '');
    if (!metaUrl) {
      console.warn('Could not determine current file path for dev server initialization');
      return;
    }
    const _require = createRequire(metaUrl);
    const vitePkg = 'vite';
    const { createServer: createViteServer } = _require(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
