-- Rana School Management System
-- PostgreSQL schema aligned to src/types.ts and server.ts data model.
-- The current app runtime still uses the Node API in server.ts with JSON storage.
-- This file provides the SQL foundation for a production migration.

BEGIN;

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
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_school_email ON admin_users (school_id, email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sessions_school_active ON sessions (school_id, is_active);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_school_name ON classes (school_id, name);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sections_class_name ON sections (class_id, name);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_name ON subjects (school_id, name);

CREATE TABLE IF NOT EXISTS class_subjects (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exams_school_term ON exams (school_id, term);

CREATE TABLE IF NOT EXISTS exam_assignments (
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  family_key TEXT NOT NULL,
  guardian_name TEXT NOT NULL,
  guardian_contact TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_families_school_key ON families (school_id, family_key);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  reg_no TEXT NOT NULL,
  login_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  dob DATE NOT NULL,
  contact TEXT NOT NULL,
  alt_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  emergency_contact TEXT NOT NULL DEFAULT '',
  guardian_name TEXT NOT NULL DEFAULT '',
  guardian_contact TEXT NOT NULL DEFAULT '',
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  admission_date DATE NOT NULL,
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('individual', 'family')),
  family_id TEXT NOT NULL DEFAULT '' REFERENCES families(id) ON DELETE SET DEFAULT,
  manual_monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'left'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_reg_no ON students (school_id, reg_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_login_id ON students (school_id, login_id);
CREATE INDEX IF NOT EXISTS idx_students_school_class_status ON students (school_id, class_id, status);
CREATE INDEX IF NOT EXISTS idx_students_family ON students (family_id);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  login_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  cnic TEXT NOT NULL,
  contact TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  dob DATE NOT NULL,
  joining_date DATE NOT NULL,
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  qualification TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_school_employee_id ON staff (school_id, employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_school_login_id ON staff (school_id, login_id);
CREATE INDEX IF NOT EXISTS idx_staff_school_status ON staff (school_id, status);

CREATE TABLE IF NOT EXISTS staff_assignments (
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS fee_heads (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'one_time', 'credit', 'custom')),
  title TEXT NOT NULL,
  period_label TEXT NOT NULL,
  configured_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  charge_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'NONE'))
);

CREATE INDEX IF NOT EXISTS idx_fee_heads_student_status ON fee_heads (student_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_heads_due_date ON fee_heads (due_date);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_head_id TEXT NULL REFERENCES fee_heads(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  method TEXT NOT NULL,
  receipt_no TEXT NOT NULL,
  txn_ref TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  receipt_type TEXT NOT NULL CHECK (receipt_type IN ('invoice', 'record_only'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_receipt_no ON payments (receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_student_date ON payments (student_id, payment_date);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance (student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance (class_id, date);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance (staff_id, date);

CREATE TABLE IF NOT EXISTS calendar_days (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_working_day BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_school_date ON calendar_days (school_id, date);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_school_date ON expenses (school_id, date);

CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_income_school_date ON income (school_id, date);

CREATE TABLE IF NOT EXISTS bad_debts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source TEXT NOT NULL,
  reference TEXT NOT NULL,
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ledger_school_date ON ledger_entries (school_id, date);

CREATE TABLE IF NOT EXISTS stationery_items (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  value NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(12,2) NOT NULL DEFAULT 0,
  marks_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (exam_id, student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_exam_student ON exam_results (exam_id, student_id);

COMMIT;