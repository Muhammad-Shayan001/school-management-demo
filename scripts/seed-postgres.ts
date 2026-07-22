/**
 * scripts/seed-postgres.ts
 * Run with: npx tsx scripts/seed-postgres.ts
 *
 * Seeds the Supabase database with the same demo data as the in-memory store,
 * but with PROPERLY HASHED passwords using bcrypt.
 * Uses the Supabase JS client and the pushDataToSupabase helper.
 */
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pushDataToSupabase } from '../src/supabaseClient.js';
import { DatabaseSchema, School, AdminUser, Student, Family, Staff, StaffAssignment, Exam, ExamAssignment, ExamResult, FeeHead, Payment, Attendance, StaffAttendance, Expense, Income, LedgerEntry, BadDebt, StationeryItem, InventoryItem, CalendarDay } from '../src/types.js';

dotenv.config();

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
  }

  try {
    console.log('Hashing passwords...');
    const adminHash = await bcrypt.hash('admin123', 12);
    const staffHash1 = await bcrypt.hash('nida123', 12);
    const staffHash2 = await bcrypt.hash('asim123', 12);
    const stuHash1 = await bcrypt.hash('ali123', 12);
    const stuHash2 = await bcrypt.hash('ayesha123', 12);
    const stuHash3 = await bcrypt.hash('hamza123', 12);
    const stuHash4 = await bcrypt.hash('fatima123', 12);
    const stuHash5 = await bcrypt.hash('bilal123', 12);
    console.log('Passwords hashed.');

    // Build the mock database schema structure
    const db: DatabaseSchema = {
      schools: [
        { id: 'school_1', name: 'Rana School', phone: '03035608778', email: 'rana@school.com', address: 'Lahore, Pakistan', tagline: 'Excellence in Education', logo_url: '', signature_url: '', active_session_id: 'session_1' }
      ],
      admin_users: [
        { id: 'admin_1', school_id: 'school_1', name: 'Admin User', email: 'rana@school.com', password_hash: adminHash }
      ],
      sessions: [
        { id: 'session_1', school_id: 'school_1', label: '2026-27 — Session 1', start_date: '2026-03-01', end_date: '2027-02-28', is_active: true }
      ],
      classes: [
        { id: 'class_g1', school_id: 'school_1', name: 'Grade 1' },
        { id: 'class_g5', school_id: 'school_1', name: 'Grade 5' },
        { id: 'class_g8', school_id: 'school_1', name: 'Grade 8' }
      ],
      sections: [
        { id: 'sec_a', class_id: 'class_g1', name: 'A' },
        { id: 'sec_b', class_id: 'class_g5', name: 'B' },
        { id: 'sec_c', class_id: 'class_g5', name: 'C' },
        { id: 'sec_d', class_id: 'class_g8', name: 'D' }
      ],
      subjects: [
        { id: 'subj_math', school_id: 'school_1', name: 'Mathematics' },
        { id: 'subj_eng', school_id: 'school_1', name: 'English' },
        { id: 'subj_sci', school_id: 'school_1', name: 'Science' },
        { id: 'subj_urdu', school_id: 'school_1', name: 'Urdu' }
      ],
      class_fee_overrides: [],
      assignments: [],
      assignment_submissions: [],
      class_subjects: [
        { class_id: 'class_g1', subject_id: 'subj_math' }, { class_id: 'class_g1', subject_id: 'subj_eng' },
        { class_id: 'class_g5', subject_id: 'subj_math' }, { class_id: 'class_g5', subject_id: 'subj_eng' }, { class_id: 'class_g5', subject_id: 'subj_sci' },
        { class_id: 'class_g8', subject_id: 'subj_math' }, { class_id: 'class_g8', subject_id: 'subj_eng' }, { class_id: 'class_g8', subject_id: 'subj_sci' }, { class_id: 'class_g8', subject_id: 'subj_urdu' }
      ],
      families: [
        { id: 'fam_none', school_id: 'school_1', family_key: 'NONE', guardian_name: 'None', guardian_contact: '', note: 'No family', is_active: true },
        { id: 'fam_raza', school_id: 'school_1', family_key: 'RAZA_001', guardian_name: 'Tariq Raza', guardian_contact: '03001234567', note: 'Both siblings enrolled', is_active: true },
        { id: 'fam_naveed', school_id: 'school_1', family_key: 'NAVEED_001', guardian_name: 'Sara Naveed', guardian_contact: '03223334455', note: '', is_active: true }
      ],
      students: [
        { id: 'stud_ali', school_id: 'school_1', reg_no: 'RS-2026-0001', login_id: 'ali_raza', password_hash: stuHash1, name: 'Ali Raza', father_name: 'Tariq Raza', gender: 'male', dob: '2017-04-15', contact: '03001234567', alt_phone: '', address: 'DHA, Lahore', emergency_contact: '03001234567', guardian_name: 'Tariq Raza', guardian_contact: '03001234567', class_id: 'class_g1', section_id: 'sec_a', admission_date: '2026-03-01', billing_mode: 'individual', family_id: 'fam_none', manual_monthly_fee: 0, status: 'active' },
        { id: 'stud_ayesha', school_id: 'school_1', reg_no: 'RS-2026-0002', login_id: 'ayesha_raza', password_hash: stuHash2, name: 'Ayesha Raza', father_name: 'Tariq Raza', gender: 'female', dob: '2013-09-05', contact: '03001234567', alt_phone: '', address: 'DHA, Lahore', emergency_contact: '03001234567', guardian_name: 'Tariq Raza', guardian_contact: '03001234567', class_id: 'class_g5', section_id: 'sec_b', admission_date: '2026-03-01', billing_mode: 'family', family_id: 'fam_raza', manual_monthly_fee: 0, status: 'active' },
        { id: 'stud_hamza', school_id: 'school_1', reg_no: 'RS-2026-0003', login_id: 'hamza_khan', password_hash: stuHash3, name: 'Hamza Khan', father_name: 'Imran Khan', gender: 'male', dob: '2016-01-20', contact: '03112233444', alt_phone: '', address: 'Johar Town, Lahore', emergency_contact: '03112233444', guardian_name: 'Imran Khan', guardian_contact: '03112233444', class_id: 'class_g5', section_id: 'sec_c', admission_date: '2026-01-20', billing_mode: 'individual', family_id: 'fam_none', manual_monthly_fee: 0, status: 'active' },
        { id: 'stud_fatima', school_id: 'school_1', reg_no: 'RS-2026-0004', login_id: 'fatima_noor', password_hash: stuHash4, name: 'Fatima Noor', father_name: 'Sajid Noor', gender: 'female', dob: '2014-06-11', contact: '03223334455', alt_phone: '', address: 'Cantt, Lahore', emergency_contact: '03223334455', guardian_name: 'Sara Naveed', guardian_contact: '03223334455', class_id: 'class_g8', section_id: 'sec_d', admission_date: '2026-03-01', billing_mode: 'family', family_id: 'fam_naveed', manual_monthly_fee: 0, status: 'active' },
        { id: 'stud_bilal', school_id: 'school_1', reg_no: 'RS-2026-0005', login_id: 'bilal_ahmed', password_hash: stuHash5, name: 'Bilal Ahmed', father_name: 'Tariq Ahmed', gender: 'male', dob: '2013-12-02', contact: '03334445566', alt_phone: '', address: 'Gulberg, Lahore', emergency_contact: '03334445566', guardian_name: 'Tariq Ahmed', guardian_contact: '03334445566', class_id: 'class_g8', section_id: 'sec_d', admission_date: '2026-03-01', billing_mode: 'individual', family_id: 'fam_none', manual_monthly_fee: 3500, status: 'active' }
      ],
      staff: [
        { id: 'staff_1', school_id: 'school_1', employee_id: 'EMP-2026-0001', login_id: 'teacher_nida', password_hash: staffHash1, name: 'Nida Fatima', father_name: 'Aslam Khan', cnic: '35202-1234567-8', contact: '03214567890', gender: 'female', dob: '1992-05-14', joining_date: '2024-08-01', salary: 35000, qualification: 'M.Sc Mathematics', address: 'Wapda Town, Lahore', status: 'active' },
        { id: 'staff_2', school_id: 'school_1', employee_id: 'EMP-2026-0002', login_id: 'teacher_asim', password_hash: staffHash2, name: 'Asim Raza', father_name: 'Munir Ahmed', cnic: '35201-9876543-1', contact: '03009876543', gender: 'male', dob: '1988-11-20', joining_date: '2025-01-15', salary: 40000, qualification: 'M.A English', address: 'Iqbal Town, Lahore', status: 'active' }
      ],
      staff_assignments: [
        { staff_id: 'staff_1', class_id: 'class_g5', subject_id: 'subj_math' },
        { staff_id: 'staff_2', class_id: 'class_g8', subject_id: 'subj_eng' }
      ],
      exams: [],
      exam_assignments: [],
      exam_results: [],
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
      inventory_items: []
    };

    console.log('Pushing data to Supabase...');
    const result = await pushDataToSupabase(db, supabaseUrl, supabaseKey, (msg) => console.log('  ' + msg));

    if (result.success) {
      console.log('✅ Supabase seeded successfully with hashed passwords!');
      console.log('');
      console.log('Credentials:');
      console.log('  Admin:    rana@school.com  / admin123');
      console.log('  Staff:    teacher_nida     / nida123');
      console.log('  Staff:    teacher_asim     / asim123');
      console.log('  Student:  ali_raza         / ali123');
      console.log('  Student:  ayesha_raza      / ayesha123');
    } else {
      console.error('❌ Supabase seed failed:', result.error);
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

run();
