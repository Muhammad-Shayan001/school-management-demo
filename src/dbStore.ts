import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  DatabaseSchema,
  School,
  Session,
  Class,
  Section,
  Subject,
  ClassSubject,
  Student,
  Family,
  Staff,
  StaffAssignment,
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
  Exam,
  ExamAssignment,
  ExamResult,
} from './types';

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'school_backend.sqlite');
const SCHEMA_FILE = path.join(process.cwd(), 'sql', 'schema.postgres.sql');

let sqliteDb: Database.Database | null = null;
let schemaInitialized = false;
let inMemoryDb: DatabaseSchema | null = null;

function ensureDataDir(): void {
  if (IS_VERCEL) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDb(): Database.Database {
  if (IS_VERCEL) return null as any;
  ensureDataDir();
  if (!sqliteDb) {
    sqliteDb = new Database(DB_FILE);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    initializeSchema(sqliteDb);
  }
  return sqliteDb;
}

function initializeSchema(db: Database.Database): void {
  if (schemaInitialized || !db) return;

  if (fs.existsSync(SCHEMA_FILE)) {
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    db.exec(schemaSql);
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        tagline TEXT NOT NULL,
        logo_url TEXT NOT NULL DEFAULT '',
        signature_url TEXT NOT NULL DEFAULT '',
        active_session_id TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        label TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS class_subjects (
        class_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        PRIMARY KEY (class_id, subject_id)
      );

      CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        term TEXT NOT NULL,
        date_start TEXT NOT NULL,
        date_end TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS exam_assignments (
        exam_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        PRIMARY KEY (exam_id, class_id, subject_id)
      );

      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        family_key TEXT NOT NULL,
        guardian_name TEXT NOT NULL,
        guardian_contact TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        reg_no TEXT NOT NULL,
        login_id TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        father_name TEXT NOT NULL,
        gender TEXT NOT NULL,
        dob TEXT NOT NULL,
        contact TEXT NOT NULL,
        alt_phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        emergency_contact TEXT NOT NULL DEFAULT '',
        guardian_name TEXT NOT NULL DEFAULT '',
        guardian_contact TEXT NOT NULL DEFAULT '',
        class_id TEXT NOT NULL,
        section_id TEXT NOT NULL,
        admission_date TEXT NOT NULL,
        billing_mode TEXT NOT NULL,
        family_id TEXT NOT NULL DEFAULT '',
        manual_monthly_fee REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        login_id TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        father_name TEXT NOT NULL,
        cnic TEXT NOT NULL,
        contact TEXT NOT NULL,
        gender TEXT NOT NULL,
        dob TEXT NOT NULL,
        joining_date TEXT NOT NULL,
        salary REAL NOT NULL DEFAULT 0,
        qualification TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS staff_assignments (
        staff_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        PRIMARY KEY (staff_id, class_id, subject_id)
      );

      CREATE TABLE IF NOT EXISTS fee_heads (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        period_label TEXT NOT NULL,
        configured_amount REAL NOT NULL DEFAULT 0,
        expected_amount REAL NOT NULL DEFAULT 0,
        pending_amount REAL NOT NULL DEFAULT 0,
        charge_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        fee_head_id TEXT,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        method TEXT NOT NULL,
        receipt_no TEXT NOT NULL,
        txn_ref TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        receipt_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS staff_attendance (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS calendar_days (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        date TEXT NOT NULL,
        is_working_day INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS income (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        description TEXT NOT NULL,
        source TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bad_debts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        date TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        date TEXT NOT NULL,
        source TEXT NOT NULL,
        reference TEXT NOT NULL,
        debit REAL NOT NULL DEFAULT 0,
        credit REAL NOT NULL DEFAULT 0,
        running_balance REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS stationery_items (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit_price REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        value REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS exam_results (
        id TEXT PRIMARY KEY,
        exam_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        marks_obtained REAL NOT NULL DEFAULT 0,
        marks_total REAL NOT NULL DEFAULT 0
      );
    `);
  }

  schemaInitialized = true;
}

function dbHasSeedData(db: Database.Database): boolean {
  if (IS_VERCEL) {
    return Boolean(inMemoryDb && inMemoryDb.schools && inMemoryDb.schools.length > 0);
  }
  const row = db.prepare('SELECT COUNT(*) AS count FROM schools').get() as { count: number } | undefined;
  return Boolean(row && row.count > 0);
}

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function mapRows<T>(rows: unknown[]): T[] {
  return rows as T[];
}

function selectAll<T>(db: Database.Database, table: string): T[] {
  return mapRows<T>(db.prepare(`SELECT * FROM ${table}`).all());
}

function deleteAllData(db: Database.Database): void {
  const tables = [
    'exam_results',
    'inventory_items',
    'stationery_items',
    'ledger_entries',
    'bad_debts',
    'income',
    'expenses',
    'calendar_days',
    'staff_attendance',
    'attendance',
    'payments',
    'fee_heads',
    'staff_assignments',
    'staff',
    'students',
    'families',
    'exam_assignments',
    'exams',
    'class_subjects',
    'subjects',
    'sections',
    'classes',
    'sessions',
    'admin_users',
    'schools'
  ];

  const transaction = db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  });

  transaction();
}

function insertMany<T extends Record<string, any>>(db: Database.Database, table: string, rows: T[]): void {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map((column) => `@${column}`).join(', ');
  const columnsSql = columns.join(', ');
  const stmt = db.prepare(`INSERT INTO ${table} (${columnsSql}) VALUES (${placeholders})`);
  const transaction = db.transaction((items: T[]) => {
    for (const item of items) {
      stmt.run(item);
    }
  });
  transaction(rows);
}

function persistDatabase(dbState: DatabaseSchema): void {
  if (IS_VERCEL) {
    inMemoryDb = JSON.parse(JSON.stringify(dbState));
    return;
  }
  const db = getDb();
  deleteAllData(db);

  const normalize = (value: any) => (value === undefined ? null : value);

  insertMany(db, 'schools', dbState.schools.map((row) => ({ ...row })));
  insertMany(db, 'admin_users', dbState.admin_users.map((row) => ({ ...row })));
  insertMany(db, 'sessions', dbState.sessions.map((row) => ({ ...row, is_active: row.is_active ? 1 : 0 })));
  insertMany(db, 'classes', dbState.classes.map((row) => ({ ...row })));
  insertMany(db, 'sections', dbState.sections.map((row) => ({ ...row })));
  insertMany(db, 'subjects', dbState.subjects.map((row) => ({ ...row })));
  insertMany(db, 'class_subjects', dbState.class_subjects.map((row) => ({ ...row })));
  insertMany(db, 'exams', dbState.exams.map((row) => ({ ...row })));
  insertMany(db, 'exam_assignments', dbState.exam_assignments.map((row) => ({ ...row })));
  insertMany(db, 'families', dbState.families.map((row) => ({ ...row, is_active: row.is_active ? 1 : 0 })));
  insertMany(db, 'students', dbState.students.map((row) => ({ ...row, family_id: normalize(row.family_id), manual_monthly_fee: Number(row.manual_monthly_fee) || 0 })));
  insertMany(db, 'staff', dbState.staff.map((row) => ({ ...row })));
  insertMany(db, 'staff_assignments', dbState.staff_assignments.map((row) => ({ ...row })));
  insertMany(db, 'fee_heads', dbState.fee_heads.map((row) => ({ ...row })));
  insertMany(db, 'payments', dbState.payments.map((row) => ({ ...row })));
  insertMany(db, 'attendance', dbState.attendance.map((row) => ({ ...row })));
  insertMany(db, 'staff_attendance', dbState.staff_attendance.map((row) => ({ ...row })));
  insertMany(db, 'calendar_days', dbState.calendar_days.map((row) => ({ ...row, is_working_day: row.is_working_day ? 1 : 0 })));
  insertMany(db, 'expenses', dbState.expenses.map((row) => ({ ...row })));
  insertMany(db, 'income', dbState.income.map((row) => ({ ...row })));
  insertMany(db, 'bad_debts', dbState.bad_debts.map((row) => ({ ...row })));
  insertMany(db, 'ledger_entries', dbState.ledger_entries.map((row) => ({ ...row })));
  insertMany(db, 'stationery_items', dbState.stationery_items.map((row) => ({ ...row })));
  insertMany(db, 'inventory_items', dbState.inventory_items.map((row) => ({ ...row })));
  insertMany(db, 'exam_results', dbState.exam_results.map((row) => ({ ...row })));
}

function loadDatabase(): DatabaseSchema {
  if (IS_VERCEL) {
    if (!inMemoryDb) {
      return getEmptyDatabase();
    }
    return JSON.parse(JSON.stringify(inMemoryDb));
  }
  const db = getDb();

  const schools = selectAll<School>(db, 'schools');
  const admin_users = selectAll(db, 'admin_users');
  const sessions = selectAll<Session>(db, 'sessions').map((row: any) => ({ ...row, is_active: toBool(row.is_active) }));
  const classes = selectAll<Class>(db, 'classes');
  const sections = selectAll<Section>(db, 'sections');
  const subjects = selectAll<Subject>(db, 'subjects');
  const class_subjects = selectAll<ClassSubject>(db, 'class_subjects');
  const exams = selectAll<Exam>(db, 'exams');
  const exam_assignments = selectAll<ExamAssignment>(db, 'exam_assignments');
  const families = selectAll<Family>(db, 'families').map((row: any) => ({ ...row, is_active: toBool(row.is_active) }));
  const students = selectAll<Student>(db, 'students').map((row: any) => ({ ...row, manual_monthly_fee: Number(row.manual_monthly_fee) || 0 }));
  const staff = selectAll<Staff>(db, 'staff');
  const staff_assignments = selectAll<StaffAssignment>(db, 'staff_assignments');
  const fee_heads = selectAll<FeeHead>(db, 'fee_heads').map((row: any) => ({
    ...row,
    configured_amount: Number(row.configured_amount) || 0,
    expected_amount: Number(row.expected_amount) || 0,
    pending_amount: Number(row.pending_amount) || 0,
  }));
  const payments = selectAll<Payment>(db, 'payments').map((row: any) => ({ ...row, amount: Number(row.amount) || 0 }));
  const attendance = selectAll<Attendance>(db, 'attendance');
  const staff_attendance = selectAll<StaffAttendance>(db, 'staff_attendance');
  const calendar_days = selectAll<CalendarDay>(db, 'calendar_days').map((row: any) => ({ ...row, is_working_day: toBool(row.is_working_day) }));
  const expenses = selectAll<Expense>(db, 'expenses').map((row: any) => ({ ...row, amount: Number(row.amount) || 0 }));
  const income = selectAll<Income>(db, 'income').map((row: any) => ({ ...row, amount: Number(row.amount) || 0 }));
  const bad_debts = selectAll<BadDebt>(db, 'bad_debts').map((row: any) => ({ ...row, amount: Number(row.amount) || 0 }));
  const ledger_entries = selectAll<LedgerEntry>(db, 'ledger_entries').map((row: any) => ({
    ...row,
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    running_balance: Number(row.running_balance) || 0,
  }));
  const stationery_items = selectAll<StationeryItem>(db, 'stationery_items').map((row: any) => ({ ...row, quantity: Number(row.quantity) || 0, unit_price: Number(row.unit_price) || 0 }));
  const inventory_items = selectAll<InventoryItem>(db, 'inventory_items').map((row: any) => ({ ...row, quantity: Number(row.quantity) || 0, value: Number(row.value) || 0 }));
  const exam_results = selectAll<ExamResult>(db, 'exam_results').map((row: any) => ({
    ...row,
    marks_obtained: Number(row.marks_obtained) || 0,
    marks_total: Number(row.marks_total) || 0,
  }));

  return {
    schools,
    admin_users,
    sessions,
    classes,
    sections,
    subjects,
    class_subjects,
    exams,
    exam_assignments,
    students,
    families,
    staff,
    staff_assignments,
    fee_heads,
    payments,
    attendance,
    staff_attendance,
    calendar_days,
    expenses,
    income,
    bad_debts,
    ledger_entries,
    stationery_items,
    inventory_items,
    exam_results,
  };
}

export function ensureDatabaseExists(): void {
  ensureDataDir();
  getDb();
  if (!dbHasSeedData(getDb())) {
    fillDummyData();
  }
}

export function getEmptyDatabase(): DatabaseSchema {
  return {
    schools: [
      {
        id: 'school_1',
        name: 'Rana School',
        phone: '03035608778',
        email: 'rana@school.com',
        address: 'Lahore, Lahore, Pakistan',
        tagline: 'Excellence in Education',
        logo_url: '',
        signature_url: '',
        active_session_id: 'session_1',
      },
    ],
    admin_users: [
      {
        id: 'admin_1',
        school_id: 'school_1',
        name: 'Admin User',
        email: 'rana@school.com',
        password_hash: 'admin123',
      },
    ],
    sessions: [
      {
        id: 'session_1',
        school_id: 'school_1',
        label: '2026-27 — Session 1',
        start_date: '2026-03-01',
        end_date: '2027-02-28',
        is_active: true,
      },
    ],
    classes: [],
    sections: [],
    subjects: [],
    class_subjects: [],
    exams: [],
    exam_assignments: [],
    students: [],
    families: [],
    staff: [],
    staff_assignments: [],
    fee_heads: [],
    payments: [],
    attendance: [],
    staff_attendance: [],
    calendar_days: [],
    expenses: [],
    income: [],
    bad_debts: [],
    ledger_entries: [],
    stationery_items: [],
    inventory_items: [],
    exam_results: [],
  };
}

export function readDatabase(): DatabaseSchema {
  ensureDatabaseExists();
  return loadDatabase();
}

export function writeDatabase(dbState: DatabaseSchema): void {
  persistDatabase(dbState);
}

export function postToLedger(
  dbState: DatabaseSchema,
  schoolId: string,
  date: string,
  source: string,
  reference: string,
  debit: number,
  credit: number
): void {
  const entries = dbState.ledger_entries.filter((entry) => entry.school_id === schoolId);
  const currentTotalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const currentTotalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const closingBalance = currentTotalCredit - currentTotalDebit;
  const newRunningBalance = closingBalance + credit - debit;

  const newEntry: LedgerEntry = {
    id: `led_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    school_id: schoolId,
    date,
    source,
    reference,
    debit,
    credit,
    running_balance: newRunningBalance,
  };

  dbState.ledger_entries.push(newEntry);
}

export function clearAllData(): void {
  const db = getEmptyDatabase();
  writeDatabase(db);
}

export function fillDummyData(): void {
  const db = getEmptyDatabase();
  const schoolId = 'school_1';

  const session1: Session = {
    id: 'session_1',
    school_id: schoolId,
    label: '2026-27 — Session 1',
    start_date: '2026-03-01',
    end_date: '2027-02-28',
    is_active: true,
  };
  db.sessions = [session1];

  const grade1: Class = { id: 'class_g1', school_id: schoolId, name: 'Grade 1' };
  const grade5: Class = { id: 'class_g5', school_id: schoolId, name: 'Grade 5' };
  const grade8: Class = { id: 'class_g8', school_id: schoolId, name: 'Grade 8' };
  db.classes = [grade1, grade5, grade8];

  const secA: Section = { id: 'sec_a', class_id: 'class_g1', name: 'A' };
  const secB: Section = { id: 'sec_b', class_id: 'class_g5', name: 'A' };
  const secC: Section = { id: 'sec_c', class_id: 'class_g5', name: 'B' };
  const secD: Section = { id: 'sec_d', class_id: 'class_g8', name: 'A' };
  db.sections = [secA, { id: 'sec_1b', class_id: 'class_g1', name: 'B' }, secB, secC, secD];

  const eng: Subject = { id: 'subj_eng', school_id: schoolId, name: 'English' };
  const urd: Subject = { id: 'subj_urd', school_id: schoolId, name: 'Urdu' };
  const math: Subject = { id: 'subj_math', school_id: schoolId, name: 'Mathematics' };
  const sci: Subject = { id: 'subj_sci', school_id: schoolId, name: 'Science' };
  const isl: Subject = { id: 'subj_isl', school_id: schoolId, name: 'Islamiat' };
  const comp: Subject = { id: 'subj_comp', school_id: schoolId, name: 'Computer' };
  db.subjects = [eng, urd, math, sci, isl, comp];

  db.class_subjects = [
    { class_id: 'class_g1', subject_id: 'subj_eng' },
    { class_id: 'class_g1', subject_id: 'subj_urd' },
    { class_id: 'class_g1', subject_id: 'subj_math' },
    { class_id: 'class_g5', subject_id: 'subj_eng' },
    { class_id: 'class_g5', subject_id: 'subj_urd' },
    { class_id: 'class_g5', subject_id: 'subj_math' },
    { class_id: 'class_g5', subject_id: 'subj_sci' },
    { class_id: 'class_g5', subject_id: 'subj_isl' },
    { class_id: 'class_g8', subject_id: 'subj_eng' },
    { class_id: 'class_g8', subject_id: 'subj_urd' },
    { class_id: 'class_g8', subject_id: 'subj_math' },
    { class_id: 'class_g8', subject_id: 'subj_sci' },
    { class_id: 'class_g8', subject_id: 'subj_isl' },
    { class_id: 'class_g8', subject_id: 'subj_comp' },
  ];

  const midTerm: Exam = {
    id: 'exam_mid',
    school_id: schoolId,
    name: 'Mid Term Exam',
    term: 'First Term',
    date_start: '2026-05-15',
    date_end: '2026-05-25',
  };
  db.exams = [midTerm];

  db.exam_assignments = [
    { exam_id: 'exam_mid', class_id: 'class_g1', subject_id: 'subj_eng' },
    { exam_id: 'exam_mid', class_id: 'class_g1', subject_id: 'subj_urd' },
    { exam_id: 'exam_mid', class_id: 'class_g1', subject_id: 'subj_math' },
    { exam_id: 'exam_mid', class_id: 'class_g5', subject_id: 'subj_eng' },
    { exam_id: 'exam_mid', class_id: 'class_g5', subject_id: 'subj_math' },
    { exam_id: 'exam_mid', class_id: 'class_g8', subject_id: 'subj_math' },
    { exam_id: 'exam_mid', class_id: 'class_g8', subject_id: 'subj_comp' },
  ];

  db.calendar_days = [
    { id: 'cal_1', school_id: schoolId, date: '2026-04-24', is_working_day: true },
    { id: 'cal_2', school_id: schoolId, date: '2026-04-25', is_working_day: true },
    { id: 'cal_3', school_id: schoolId, date: '2026-04-26', is_working_day: false },
  ];

  const famAhmed: Family = {
    id: 'fam_ahmed',
    school_id: schoolId,
    family_key: 'FAM-03001112233',
    guardian_name: 'Raza Ahmed',
    guardian_contact: '03001112233',
    note: 'Sons study here, payment usually prompt.',
    is_active: true,
  };
  const famNaveed: Family = {
    id: 'fam_naveed',
    school_id: schoolId,
    family_key: 'FAM-03223334455',
    guardian_name: 'Sara Naveed',
    guardian_contact: '03223334455',
    note: 'Mother of Fatima Noor.',
    is_active: true,
  };
  db.families = [famAhmed, famNaveed];

  const aliRaza: Student = {
    id: 'stud_ali',
    school_id: schoolId,
    reg_no: 'RS-2026-0001',
    login_id: 'ali_raza',
    password_hash: 'ali123',
    name: 'Ali Raza',
    father_name: 'Raza Ahmed',
    gender: 'male',
    dob: '2019-03-12',
    contact: '03001112233',
    alt_phone: '03035608778',
    address: 'Model Town, Lahore',
    emergency_contact: '03001112233',
    guardian_name: 'Raza Ahmed',
    guardian_contact: '03001112233',
    class_id: 'class_g1',
    section_id: 'sec_a',
    admission_date: '2026-03-01',
    billing_mode: 'family',
    family_id: 'fam_ahmed',
    manual_monthly_fee: 0,
    status: 'active',
  };

  const ayeshaRaza: Student = {
    id: 'stud_ayesha',
    school_id: schoolId,
    reg_no: 'RS-2026-0002',
    login_id: 'ayesha_raza',
    password_hash: 'ayesha123',
    name: 'Ayesha Raza',
    father_name: 'Raza Ahmed',
    gender: 'female',
    dob: '2015-09-08',
    contact: '03001112233',
    alt_phone: '03001112233',
    address: 'Model Town, Lahore',
    emergency_contact: '03001112233',
    guardian_name: 'Raza Ahmed',
    guardian_contact: '03001112233',
    class_id: 'class_g5',
    section_id: 'sec_b',
    admission_date: '2015-03-12',
    billing_mode: 'family',
    family_id: 'fam_ahmed',
    manual_monthly_fee: 5000,
    status: 'active',
  };

  const hamzaKhan: Student = {
    id: 'stud_hamza',
    school_id: schoolId,
    reg_no: 'RS-2026-0003',
    login_id: 'hamza_khan',
    password_hash: 'hamza123',
    name: 'Hamza Khan',
    father_name: 'Imran Khan',
    gender: 'male',
    dob: '2016-01-20',
    contact: '03112233444',
    alt_phone: '03112233444',
    address: 'Johar Town, Lahore',
    emergency_contact: '03112233444',
    guardian_name: 'Imran Khan',
    guardian_contact: '03112233444',
    class_id: 'class_g5',
    section_id: 'sec_c',
    admission_date: '2026-01-20',
    billing_mode: 'individual',
    family_id: '',
    manual_monthly_fee: 0,
    status: 'active',
  };

  const fatimaNoor: Student = {
    id: 'stud_fatima',
    school_id: schoolId,
    reg_no: 'RS-2026-0004',
    login_id: 'fatima_noor',
    password_hash: 'fatima123',
    name: 'Fatima Noor',
    father_name: 'Sajid Noor',
    gender: 'female',
    dob: '2014-06-11',
    contact: '03223334455',
    alt_phone: '03223334455',
    address: 'Cantt, Lahore',
    emergency_contact: '03223334455',
    guardian_name: 'Sara Naveed',
    guardian_contact: '03223334455',
    class_id: 'class_g8',
    section_id: 'sec_d',
    admission_date: '2026-03-01',
    billing_mode: 'family',
    family_id: 'fam_naveed',
    manual_monthly_fee: 0,
    status: 'active',
  };

  const bilalAhmed: Student = {
    id: 'stud_bilal',
    school_id: schoolId,
    reg_no: 'RS-2026-0005',
    login_id: 'bilal_ahmed',
    password_hash: 'bilal123',
    name: 'Bilal Ahmed',
    father_name: 'Tariq Ahmed',
    gender: 'male',
    dob: '2013-12-02',
    contact: '03334445566',
    alt_phone: '03334445566',
    address: 'Gulberg, Lahore',
    emergency_contact: '03334445566',
    guardian_name: 'Tariq Ahmed',
    guardian_contact: '03334445566',
    class_id: 'class_g8',
    section_id: 'sec_d',
    admission_date: '2026-03-01',
    billing_mode: 'individual',
    family_id: '',
    manual_monthly_fee: 3500,
    status: 'active',
  };

  db.students = [aliRaza, ayeshaRaza, hamzaKhan, fatimaNoor, bilalAhmed];

  const staff1: Staff = {
    id: 'staff_1',
    school_id: schoolId,
    employee_id: 'EMP-2026-0001',
    login_id: 'teacher_nida',
    password_hash: 'nida123',
    name: 'Nida Fatima',
    father_name: 'Aslam Khan',
    cnic: '35202-1234567-8',
    contact: '03214567890',
    gender: 'female',
    dob: '1992-05-14',
    joining_date: '2024-08-01',
    salary: 35000,
    qualification: 'M.Sc Mathematics',
    address: 'Wapda Town, Lahore',
    status: 'active',
  };

  const staff2: Staff = {
    id: 'staff_2',
    school_id: schoolId,
    employee_id: 'EMP-2026-0002',
    login_id: 'teacher_asim',
    password_hash: 'asim123',
    name: 'Asim Raza',
    father_name: 'Munir Ahmed',
    cnic: '35201-9876543-1',
    contact: '03009876543',
    gender: 'male',
    dob: '1988-11-20',
    joining_date: '2025-01-15',
    salary: 40000,
    qualification: 'M.A English',
    address: 'Iqbal Town, Lahore',
    status: 'active',
  };
  db.staff = [staff1, staff2];

  db.staff_assignments = [
    { staff_id: 'staff_1', class_id: 'class_g5', subject_id: 'subj_math' },
    { staff_id: 'staff_2', class_id: 'class_g8', subject_id: 'subj_eng' },
  ];

  const feeAliMonthly: FeeHead = {
    id: 'fee_ali_1',
    student_id: 'stud_ali',
    type: 'monthly',
    title: 'Current Month Fee (April 2026)',
    period_label: 'April 2026',
    configured_amount: 2500,
    expected_amount: 2500,
    pending_amount: 2500,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeAliAdm: FeeHead = {
    id: 'fee_ali_2',
    student_id: 'stud_ali',
    type: 'one_time',
    title: 'Admission Fee Due',
    period_label: 'March 2026',
    configured_amount: 2250,
    expected_amount: 2250,
    pending_amount: 2250,
    charge_date: '2026-03-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };

  const feeAyeshaMonthly: FeeHead = {
    id: 'fee_aye_1',
    student_id: 'stud_ayesha',
    type: 'monthly',
    title: 'Current Month Fee (April 2026)',
    period_label: 'April 2026',
    configured_amount: 5000,
    expected_amount: 5000,
    pending_amount: 5000,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeAyeshaAdm: FeeHead = {
    id: 'fee_aye_2',
    student_id: 'stud_ayesha',
    type: 'one_time',
    title: 'Admission Fee Due',
    period_label: 'March 2026',
    configured_amount: 2250,
    expected_amount: 2250,
    pending_amount: 2250,
    charge_date: '2026-03-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeAyeshaStat: FeeHead = {
    id: 'fee_aye_3',
    student_id: 'stud_ayesha',
    type: 'credit',
    title: 'Stationery Borrow',
    period_label: 'April 2026',
    configured_amount: 250,
    expected_amount: 250,
    pending_amount: 250,
    charge_date: '2026-04-15',
    due_date: '2026-04-24',
    status: 'PENDING',
  };

  const feeHamzaMonthly: FeeHead = {
    id: 'fee_ham_1',
    student_id: 'stud_hamza',
    type: 'monthly',
    title: 'Current Month Fee (April 2026)',
    period_label: 'April 2026',
    configured_amount: 2500,
    expected_amount: 2500,
    pending_amount: 2500,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeHamzaAdm: FeeHead = {
    id: 'fee_ham_2',
    student_id: 'stud_hamza',
    type: 'one_time',
    title: 'Admission Fee Due',
    period_label: 'March 2026',
    configured_amount: 2250,
    expected_amount: 2250,
    pending_amount: 2250,
    charge_date: '2026-03-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeHamzaExp: FeeHead = {
    id: 'fee_ham_3',
    student_id: 'stud_hamza',
    type: 'custom',
    title: 'Student Extra Expense: books',
    period_label: 'April 2026',
    configured_amount: 100,
    expected_amount: 100,
    pending_amount: 100,
    charge_date: '2026-04-24',
    due_date: '2026-04-30',
    status: 'PENDING',
  };

  const feeFatimaMonthly: FeeHead = {
    id: 'fee_fat_1',
    student_id: 'stud_fatima',
    type: 'monthly',
    title: 'Current Month Fee (April 2026)',
    period_label: 'April 2026',
    configured_amount: 2500,
    expected_amount: 2500,
    pending_amount: 2500,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeFatimaAdm: FeeHead = {
    id: 'fee_fat_2',
    student_id: 'stud_fatima',
    type: 'one_time',
    title: 'Admission Fee Due',
    period_label: 'March 2026',
    configured_amount: 2250,
    expected_amount: 2250,
    pending_amount: 2250,
    charge_date: '2026-03-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeFatimaComp: FeeHead = {
    id: 'fee_fat_3',
    student_id: 'stud_fatima',
    type: 'credit',
    title: 'Computer Lab (April 2026)',
    period_label: 'April 2026',
    configured_amount: 580,
    expected_amount: 580,
    pending_amount: 580,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeFatimaExtra: FeeHead = {
    id: 'fee_fat_4',
    student_id: 'stud_fatima',
    type: 'custom',
    title: 'Admission Fee Balance',
    period_label: 'April 2026',
    configured_amount: 3670,
    expected_amount: 3670,
    pending_amount: 3670,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };

  const feeBilalMonthly: FeeHead = {
    id: 'fee_bil_1',
    student_id: 'stud_bilal',
    type: 'monthly',
    title: 'Current Month Fee (April 2026)',
    period_label: 'April 2026',
    configured_amount: 3500,
    expected_amount: 3500,
    pending_amount: 3500,
    charge_date: '2026-04-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeBilalAdm: FeeHead = {
    id: 'fee_bil_2',
    student_id: 'stud_bilal',
    type: 'one_time',
    title: 'Admission Fee Due',
    period_label: 'March 2026',
    configured_amount: 2500,
    expected_amount: 2500,
    pending_amount: 2500,
    charge_date: '2026-03-01',
    due_date: '2026-04-10',
    status: 'PENDING',
  };
  const feeBilalExam: FeeHead = {
    id: 'fee_bil_3',
    student_id: 'stud_bilal',
    type: 'custom',
    title: 'Term Exam Stationery Fee',
    period_label: 'April 2026',
    configured_amount: 650,
    expected_amount: 650,
    pending_amount: 650,
    charge_date: '2026-04-15',
    due_date: '2026-04-24',
    status: 'PENDING',
  };

  db.fee_heads = [
    feeAliMonthly, feeAliAdm,
    feeAyeshaMonthly, feeAyeshaAdm, feeAyeshaStat,
    feeHamzaMonthly, feeHamzaAdm, feeHamzaExp,
    feeFatimaMonthly, feeFatimaAdm, feeFatimaComp, feeFatimaExtra,
    feeBilalMonthly, feeBilalAdm, feeBilalExam,
  ];

  db.stationery_items = [
    { id: 'stat_item_1', school_id: schoolId, item_name: 'English Notebook', quantity: 150, unit_price: 100 },
    { id: 'stat_item_2', school_id: schoolId, item_name: 'Science Notebook', quantity: 200, unit_price: 120 },
    { id: 'stat_item_3', school_id: schoolId, item_name: 'Pencil Box', quantity: 80, unit_price: 50 },
  ];

  db.attendance = [
    { id: 'att_1', student_id: 'stud_ali', class_id: 'class_g1', date: '2026-04-23', status: 'present' },
    { id: 'att_2', student_id: 'stud_ayesha', class_id: 'class_g5', date: '2026-04-23', status: 'present' },
    { id: 'att_3', student_id: 'stud_hamza', class_id: 'class_g5', date: '2026-04-23', status: 'present' },
    { id: 'att_4', student_id: 'stud_fatima', class_id: 'class_g8', date: '2026-04-23', status: 'present' },
    { id: 'att_5', student_id: 'stud_bilal', class_id: 'class_g8', date: '2026-04-23', status: 'present' },
  ];

  const payment1: Payment = {
    id: 'pay_1',
    student_id: 'stud_ali',
    fee_head_id: 'fee_ali_1',
    amount: 100,
    payment_date: '2026-04-24',
    method: 'Cash',
    receipt_no: 'RCPT-20260424-00000001',
    txn_ref: '',
    note: 'Initial partial payment',
    receipt_type: 'invoice',
  };
  db.payments = [payment1];

  feeAliMonthly.pending_amount = 2400;
  const feeIdx = db.fee_heads.findIndex((feeHead) => feeHead.id === 'fee_ali_1');
  if (feeIdx !== -1) {
    db.fee_heads[feeIdx].pending_amount = 2400;
  }

  postToLedger(db, schoolId, '2026-04-24', 'Fee Payment', 'Ali Raza (RS-2026-0001)', 0, 100);

  writeDatabase(db);
}
