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

// ---------------------------------------------------------------------------
// Pure in-memory database store.  No native modules, no file-system writes.
// Works identically on localhost AND on Vercel serverless functions.
// Data is seeded with dummy records on first access.
// ---------------------------------------------------------------------------

let inMemoryDb: DatabaseSchema | null = null;

function persistDatabase(dbState: DatabaseSchema): void {
  inMemoryDb = JSON.parse(JSON.stringify(dbState));
}

function loadDatabase(): DatabaseSchema {
  if (!inMemoryDb) {
    return getEmptyDatabase();
  }
  return JSON.parse(JSON.stringify(inMemoryDb));
}

export function ensureDatabaseExists(): void {
  if (!inMemoryDb || !inMemoryDb.schools || inMemoryDb.schools.length === 0) {
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
