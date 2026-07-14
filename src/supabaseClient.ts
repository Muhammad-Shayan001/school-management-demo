import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseSchema } from './types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Retrieves configuration from localStorage or Environment Variables (VITE_ prefixed for browser)
export function getSupabaseConfig(): SupabaseConfig {
  const localUrl = localStorage.getItem('RS_SUPABASE_URL') || '';
  const localKey = localStorage.getItem('RS_SUPABASE_KEY') || '';

  // Fallback to import.meta.env if available, or empty string
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem('RS_SUPABASE_URL', config.url);
  localStorage.setItem('RS_SUPABASE_KEY', config.anonKey);
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem('RS_SUPABASE_URL');
  localStorage.removeItem('RS_SUPABASE_KEY');
}

// Instantiates and returns a Supabase Client if configured
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch (err) {
    console.error('Failed to create Supabase client', err);
    return null;
  }
}

// Tests if the credentials work by querying the schools table or doing a light ping
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'Supabase URL and Anon Key are required.' };
  }
  try {
    const client = createClient(url, anonKey);
    // Attempt a simple ping request on any table (e.g. schools)
    const { data, error } = await client.from('schools').select('id').limit(1);
    if (error) {
      // Check if error is simply "table does not exist" which means connection is good but schema is missing
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected successfully! However, the database tables do not exist yet. Please run the DDL schema migration below.',
        };
      }
      return { success: false, message: `Connection failed: ${error.message} (Code: ${error.code})` };
    }
    return { success: true, message: 'Connected successfully! Database and schema verified.' };
  } catch (err: any) {
    return { success: false, message: `Network error: ${err.message || err}` };
  }
}

// SQL DDL Schema Generator to copy-paste in Supabase SQL editor
export const SUPABASE_DDL_SCHEMA = `-- Rana School Management System - Supabase PostgreSQL Schema
-- Copy and run this script in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Drop existing tables to start fresh (Optional - comment out if not needed)
-- DROP TABLE IF EXISTS exam_results CASCADE;
-- DROP TABLE IF EXISTS stationery_items CASCADE;
-- DROP TABLE IF EXISTS ledger_entries CASCADE;
-- DROP TABLE IF EXISTS bad_debts CASCADE;
-- DROP TABLE IF EXISTS income CASCADE;
-- DROP TABLE IF EXISTS expenses CASCADE;
-- DROP TABLE IF EXISTS calendar_days CASCADE;
-- DROP TABLE IF EXISTS staff_attendance CASCADE;
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS fee_heads CASCADE;
-- DROP TABLE IF EXISTS staff_assignments CASCADE;
-- DROP TABLE IF EXISTS staff CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS families CASCADE;
-- DROP TABLE IF EXISTS exam_assignments CASCADE;
-- DROP TABLE IF EXISTS exams CASCADE;
-- DROP TABLE IF EXISTS class_subjects CASCADE;
-- DROP TABLE IF EXISTS subjects CASCADE;
-- DROP TABLE IF EXISTS sections CASCADE;
-- DROP TABLE IF EXISTS classes CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS schools CASCADE;

-- 1. Schools
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  tagline TEXT,
  logo_url TEXT,
  signature_url TEXT,
  active_session_id TEXT
);

-- 2. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_active BOOLEAN DEFAULT false
);

-- 3. Classes
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 4. Sections
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 5. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 6. Class-Subjects Mapping
CREATE TABLE IF NOT EXISTS class_subjects (
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, subject_id)
);

-- 7. Exams
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term TEXT,
  date_start TEXT,
  date_end TEXT
);

-- 8. Exam Assignments
CREATE TABLE IF NOT EXISTS exam_assignments (
  exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, class_id, subject_id)
);

-- 9. Families
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  family_key TEXT UNIQUE,
  guardian_name TEXT,
  guardian_contact TEXT,
  note TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 10. Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  reg_no TEXT UNIQUE,
  login_id TEXT,
  password_hash TEXT,
  name TEXT NOT NULL,
  father_name TEXT,
  gender TEXT,
  dob TEXT,
  contact TEXT,
  alt_phone TEXT,
  address TEXT,
  emergency_contact TEXT,
  guardian_name TEXT,
  guardian_contact TEXT,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
  admission_date TEXT,
  billing_mode TEXT DEFAULT 'individual',
  family_id TEXT,
  manual_monthly_fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active'
);

-- 11. Staff / Teachers
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  login_id TEXT,
  password_hash TEXT,
  name TEXT NOT NULL,
  father_name TEXT,
  cnic TEXT,
  contact TEXT,
  gender TEXT,
  dob TEXT,
  joining_date TEXT,
  salary NUMERIC DEFAULT 0,
  qualification TEXT,
  address TEXT,
  status TEXT DEFAULT 'active'
);

-- 12. Staff Assignments
CREATE TABLE IF NOT EXISTS staff_assignments (
  staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, class_id, subject_id)
);

-- 13. Fee Heads
CREATE TABLE IF NOT EXISTS fee_heads (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT NOT NULL,
  period_label TEXT,
  configured_amount NUMERIC DEFAULT 0,
  expected_amount NUMERIC DEFAULT 0,
  pending_amount NUMERIC DEFAULT 0,
  charge_date TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'PENDING'
);

-- 14. Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  fee_head_id TEXT,
  amount NUMERIC DEFAULT 0,
  payment_date TEXT,
  method TEXT,
  receipt_no TEXT,
  txn_ref TEXT,
  note TEXT,
  receipt_type TEXT
);

-- 15. Student Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  UNIQUE(student_id, class_id, date)
);

-- 16. Staff Attendance
CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,
  staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  UNIQUE(staff_id, date)
);

-- 17. Working/Calendar Days
CREATE TABLE IF NOT EXISTS calendar_days (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  is_working_day BOOLEAN DEFAULT true,
  UNIQUE(school_id, date)
);

-- 18. Expenses (Accounting)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC DEFAULT 0,
  date TEXT NOT NULL
);

-- 19. Income (Accounting)
CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  source TEXT,
  amount NUMERIC DEFAULT 0,
  date TEXT NOT NULL
);

-- 20. Bad Debts
CREATE TABLE IF NOT EXISTS bad_debts (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 0,
  reason TEXT,
  date TEXT NOT NULL
);

-- 21. School Financial Ledger Entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  reference TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  running_balance NUMERIC DEFAULT 0
);

-- 22. Stationery Items Shop
CREATE TABLE IF NOT EXISTS stationery_items (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  unit_price NUMERIC DEFAULT 0
);

-- 23. Examination Results Records
CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  marks_obtained NUMERIC DEFAULT 0,
  marks_total NUMERIC DEFAULT 0,
  UNIQUE (exam_id, student_id, subject_id)
);
`;

// Helper to push full database state to Supabase
export async function pushDataToSupabase(
  db: DatabaseSchema,
  url: string,
  anonKey: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url, anonKey);
    const tables: Array<{ name: keyof DatabaseSchema; label: string }> = [
      { name: 'schools', label: 'Schools' },
      { name: 'sessions', label: 'Sessions' },
      { name: 'classes', label: 'Classes' },
      { name: 'sections', label: 'Sections' },
      { name: 'subjects', label: 'Subjects' },
      { name: 'class_subjects', label: 'Class Subjects' },
      { name: 'exams', label: 'Exams' },
      { name: 'exam_assignments', label: 'Exam Assignments' },
      { name: 'families', label: 'Families' },
      { name: 'students', label: 'Students' },
      { name: 'staff', label: 'Staff' },
      { name: 'staff_assignments', label: 'Staff Assignments' },
      { name: 'fee_heads', label: 'Fee Heads' },
      { name: 'payments', label: 'Payments' },
      { name: 'attendance', label: 'Attendance' },
      { name: 'staff_attendance', label: 'Staff Attendance' },
      { name: 'calendar_days', label: 'Calendar Days' },
      { name: 'expenses', label: 'Expenses' },
      { name: 'income', label: 'Income' },
      { name: 'bad_debts', label: 'Bad Debts' },
      { name: 'ledger_entries', label: 'Ledger Entries' },
      { name: 'stationery_items', label: 'Stationery Items' },
      { name: 'exam_results', label: 'Exam Results' },
    ];

    for (const table of tables) {
      const records = db[table.name] as any[];
      if (!records || records.length === 0) {
        onProgress?.(`Skipping empty table: ${table.label}`);
        continue;
      }

      onProgress?.(`Syncing ${records.length} records to table '${table.name}'...`);

      // Clear existing records first (cascade should handle foreign dependencies where appropriate, or we delete in order)
      // Because we delete in reverse/proper order, we clear tables cleanly
      // Supabase uses upsert, which is much safer and avoids foreign key delete locks!
      const { error: upsertError } = await client.from(table.name as string).upsert(records);
      
      if (upsertError) {
        throw new Error(`Failed to upsert table '${table.name}': ${upsertError.message}`);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in pushDataToSupabase:', err);
    return { success: false, error: err.message || String(err) };
  }
}

// Helper to pull database state from Supabase
export async function pullDataFromSupabase(
  url: string,
  anonKey: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; data?: DatabaseSchema; error?: string }> {
  try {
    const client = createClient(url, anonKey);
    const tables: Array<keyof DatabaseSchema> = [
      'schools',
      'sessions',
      'classes',
      'sections',
      'subjects',
      'class_subjects',
      'exams',
      'exam_assignments',
      'families',
      'students',
      'staff',
      'staff_assignments',
      'fee_heads',
      'payments',
      'attendance',
      'staff_attendance',
      'calendar_days',
      'expenses',
      'income',
      'bad_debts',
      'ledger_entries',
      'stationery_items',
      'exam_results',
    ];

    const pulledDb: any = {};

    for (const table of tables) {
      onProgress?.(`Pulling data from table '${table}'...`);
      const { data, error } = await client.from(table as string).select('*');
      if (error) {
        throw new Error(`Failed to fetch table '${table}': ${error.message}`);
      }
      pulledDb[table] = data || [];
    }

    return { success: true, data: pulledDb as DatabaseSchema };
  } catch (err: any) {
    console.error('Error in pullDataFromSupabase:', err);
    return { success: false, error: err.message || String(err) };
  }
}
