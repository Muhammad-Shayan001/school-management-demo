/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface School {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  tagline: string;
  logo_url: string;
  signature_url: string;
  active_session_id: string;
}

export interface AdminUser {
  id: string;
  school_id: string;
  name: string;
  email: string;
  password_hash: string;
}

export interface Session {
  id: string;
  school_id: string;
  label: string; // e.g., "2026-27 — Session 1"
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Class {
  id: string;
  school_id: string;
  name: string; // e.g., "Grade 1", "Grade 5", "Grade 8"
}

export interface Section {
  id: string;
  class_id: string;
  name: string; // e.g., "Section A", "Section B"
}

export interface Subject {
  id: string;
  school_id: string;
  name: string; // e.g., "English", "Urdu", "Mathematics", "Science", "Islamiat", "Computer"
}

export interface ClassSubject {
  class_id: string;
  subject_id: string;
}

export interface Exam {
  id: string;
  school_id: string;
  name: string; // e.g., "First Term", "Final Exam"
  term: string;
  date_start: string;
  date_end: string;
}

export interface ExamAssignment {
  exam_id: string;
  class_id: string;
  subject_id: string;
}

export type StudentStatus = 'active' | 'inactive' | 'left' | 'pending';
export type BillingMode = 'individual' | 'family';

export interface Student {
  id: string;
  school_id: string;
  reg_no: string; // RS-YYYY-NNNN
  login_id: string;
  password_hash: string;
  name: string;
  father_name: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  contact: string;
  alt_phone: string;
  address: string;
  emergency_contact: string;
  guardian_name: string;
  guardian_contact: string;
  class_id: string;
  section_id: string;
  admission_date: string;
  billing_mode: BillingMode;
  family_id: string; // references Family.id (can be empty string if individual)
  manual_monthly_fee: number; // 0 if uses default class fee
  status: StudentStatus;
  image_url?: string;
}

export interface Family {
  id: string;
  school_id: string;
  family_key: string; // FAM-XXXXXXXXXX
  guardian_name: string;
  guardian_contact: string;
  note: string;
  is_active: boolean;
}

export interface Staff {
  id: string;
  school_id: string;
  employee_id: string; // EMP-YYYY-NNNN
  login_id: string;
  password_hash: string;
  name: string;
  father_name: string;
  cnic: string;
  contact: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  joining_date: string;
  salary: number;
  qualification: string;
  address: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface StaffAssignment {
  staff_id: string;
  class_id: string;
  subject_id: string;
}

export type FeeHeadType = 'monthly' | 'one_time' | 'credit' | 'custom';
export type FeeHeadStatus = 'PENDING' | 'PAID' | 'NONE';

export interface FeeHead {
  id: string;
  student_id: string;
  type: FeeHeadType; // e.g. 'monthly' (Tuition), 'one_time' (Admission), 'credit' (Stationery), 'custom' (Extra Expenses/Fines)
  title: string; // e.g., "Monthly Tuition (April 2026)", "Admission Fee Due", "books"
  period_label: string; // e.g., "April 2026"
  configured_amount: number;
  expected_amount: number;
  pending_amount: number;
  charge_date: string;
  due_date: string;
  status: FeeHeadStatus;
}

export interface Payment {
  id: string;
  student_id: string;
  fee_head_id: string; // Can be empty if split payment
  amount: number;
  payment_date: string;
  method: string; // "Cash", "Bank Transfer", etc.
  receipt_no: string; // RCPT-YYYYMMDD-XXXXXXXX
  txn_ref: string;
  note: string;
  receipt_type: 'invoice' | 'record_only';
}

export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface CalendarDay {
  id: string;
  school_id: string;
  date: string; // YYYY-MM-DD
  is_working_day: boolean;
}

export interface Expense {
  id: string;
  school_id: string;
  description: string;
  category: string; // "Salaries", "Utilities", "Maintenance", "Supplies", "Misc"
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface Income {
  id: string;
  school_id: string;
  description: string;
  source: string; // "Donation", "Misc", etc.
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface BadDebt {
  id: string;
  student_id: string;
  amount: number;
  reason: string;
  date: string; // YYYY-MM-DD
}

export interface LedgerEntry {
  id: string;
  school_id: string;
  date: string; // YYYY-MM-DD
  source: string; // "Fee Payment", "Expense", "Income", "Bad Debt"
  reference: string; // e.g., "All Raza (RS-2026-0001)" or "Teacher Salary"
  debit: number; // expense, bad debt
  credit: number; // fee payment, other income
  running_balance: number;
}

export interface StationeryItem {
  id: string;
  school_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export interface InventoryItem {
  id: string;
  school_id: string;
  item_name: string;
  category: string;
  quantity: number;
  value: number;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  marks_total: number;
}

export interface Assignment {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  grade?: string;
  feedback?: string;
}

// Complete schema state stored in database file
export interface DatabaseSchema {
  schools: School[];
  admin_users: AdminUser[];
  sessions: Session[];
  classes: Class[];
  sections: Section[];
  subjects: Subject[];
  class_subjects: ClassSubject[];
  exams: Exam[];
  exam_assignments: ExamAssignment[];
  students: Student[];
  families: Family[];
  staff: Staff[];
  staff_assignments: StaffAssignment[];
  fee_heads: FeeHead[];
  payments: Payment[];
  attendance: Attendance[];
  staff_attendance: StaffAttendance[];
  calendar_days: CalendarDay[];
  expenses: Expense[];
  income: Income[];
  bad_debts: BadDebt[];
  ledger_entries: LedgerEntry[];
  stationery_items: StationeryItem[];
  inventory_items: InventoryItem[];
  exam_results: ExamResult[];
  assignments: Assignment[];
  assignment_submissions: AssignmentSubmission[];
}
