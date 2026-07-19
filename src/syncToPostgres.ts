/**
 * src/syncToPostgres.ts
 * Provides async upsert/delete helpers that write to Supabase.
 * Uses @supabase/supabase-js which connects via HTTPS — no local Postgres needed.
 * All calls silently catch errors so the in-memory store remains the source of truth
 * when Supabase is unreachable.
 */
import { getClient } from './db.js';

// ── Generic helpers ──────────────────────────────────────────────────────────

async function upsert(table: string, row: Record<string, any>) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from(table).upsert(row, { onConflict: 'id' });
    if (error) console.error(`[Supabase] upsert ${table} error:`, error.message);
  } catch (e) {
    console.error(`[Supabase] upsert ${table} failed:`, e);
  }
}

async function deleteRow(table: string, id: string) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) console.error(`[Supabase] delete ${table} error:`, error.message);
  } catch (e) {
    console.error(`[Supabase] delete ${table} failed:`, e);
  }
}

// ── Schools ──────────────────────────────────────────────────────────────────
export async function pgUpsertSchool(row: Record<string, any>) { await upsert('schools', row); }

// ── Admin Users ───────────────────────────────────────────────────────────────
export async function pgUpsertAdminUser(row: Record<string, any>) { await upsert('admin_users', row); }

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function pgUpsertSession(row: Record<string, any>) { await upsert('sessions', row); }

// ── Classes ───────────────────────────────────────────────────────────────────
export async function pgUpsertClass(row: Record<string, any>) { await upsert('classes', row); }
export async function pgDeleteClass(id: string) { await deleteRow('classes', id); }

// ── Sections ──────────────────────────────────────────────────────────────────
export async function pgUpsertSection(row: Record<string, any>) { await upsert('sections', row); }
export async function pgDeleteSection(id: string) { await deleteRow('sections', id); }

// ── Subjects ──────────────────────────────────────────────────────────────────
export async function pgUpsertSubject(row: Record<string, any>) { await upsert('subjects', row); }
export async function pgDeleteSubject(id: string) { await deleteRow('subjects', id); }

// ── Class Subjects (composite primary key) ────────────────────────────────────
export async function pgUpsertClassSubject(class_id: string, subject_id: string) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('class_subjects').upsert({ class_id, subject_id }, { onConflict: 'class_id,subject_id' });
    if (error) console.error('[Supabase] upsert class_subjects error:', error.message);
  } catch (e) { console.error('[Supabase] upsert class_subjects failed:', e); }
}
export async function pgDeleteClassSubject(class_id: string, subject_id: string) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('class_subjects').delete().eq('class_id', class_id).eq('subject_id', subject_id);
    if (error) console.error('[Supabase] delete class_subjects error:', error.message);
  } catch (e) { console.error('[Supabase] delete class_subjects failed:', e); }
}

// ── Students ──────────────────────────────────────────────────────────────────
export async function pgUpsertStudent(row: Record<string, any>) { await upsert('students', row); }
export async function pgDeleteStudent(id: string) { await deleteRow('students', id); }

// ── Families ──────────────────────────────────────────────────────────────────
export async function pgUpsertFamily(row: Record<string, any>) { await upsert('families', row); }
export async function pgDeleteFamily(id: string) { await deleteRow('families', id); }

// ── Staff ─────────────────────────────────────────────────────────────────────
export async function pgUpsertStaff(row: Record<string, any>) { await upsert('staff', row); }
export async function pgDeleteStaff(id: string) { await deleteRow('staff', id); }

// ── Staff Assignments ─────────────────────────────────────────────────────────
export async function pgUpsertStaffAssignment(staff_id: string, class_id: string, subject_id: string) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('staff_assignments').upsert({ staff_id, class_id, subject_id }, { onConflict: 'staff_id,class_id,subject_id' });
    if (error) console.error('[Supabase] upsert staff_assignments error:', error.message);
  } catch (e) { console.error('[Supabase] upsert staff_assignments failed:', e); }
}

// ── Exams ─────────────────────────────────────────────────────────────────────
export async function pgUpsertExam(row: Record<string, any>) { await upsert('exams', row); }
export async function pgDeleteExam(id: string) { await deleteRow('exams', id); }

// ── Exam Assignments ──────────────────────────────────────────────────────────
export async function pgUpsertExamAssignment(exam_id: string, class_id: string, subject_id: string) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('exam_assignments').upsert({ exam_id, class_id, subject_id }, { onConflict: 'exam_id,class_id,subject_id' });
    if (error) console.error('[Supabase] upsert exam_assignments error:', error.message);
  } catch (e) { console.error('[Supabase] upsert exam_assignments failed:', e); }
}

// ── Exam Results ──────────────────────────────────────────────────────────────
export async function pgUpsertExamResult(row: Record<string, any>) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('exam_results').upsert(row, { onConflict: 'exam_id,student_id,subject_id' });
    if (error) console.error('[Supabase] upsert exam_results error:', error.message);
  } catch (e) { console.error('[Supabase] upsert exam_results failed:', e); }
}

// ── Fee Heads ─────────────────────────────────────────────────────────────────
export async function pgUpsertFeeHead(row: Record<string, any>) { await upsert('fee_heads', row); }

// ── Payments ──────────────────────────────────────────────────────────────────
export async function pgUpsertPayment(row: Record<string, any>) { await upsert('payments', row); }

// ── Attendance ────────────────────────────────────────────────────────────────
export async function pgUpsertAttendance(row: Record<string, any>) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('attendance').upsert(row, { onConflict: 'student_id,date' });
    if (error) console.error('[Supabase] upsert attendance error:', error.message);
  } catch (e) { console.error('[Supabase] upsert attendance failed:', e); }
}

// ── Staff Attendance ──────────────────────────────────────────────────────────
export async function pgUpsertStaffAttendance(row: Record<string, any>) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('staff_attendance').upsert(row, { onConflict: 'staff_id,date' });
    if (error) console.error('[Supabase] upsert staff_attendance error:', error.message);
  } catch (e) { console.error('[Supabase] upsert staff_attendance failed:', e); }
}

// ── Calendar Days ─────────────────────────────────────────────────────────────
export async function pgUpsertCalendarDay(row: Record<string, any>) {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.from('calendar_days').upsert(row, { onConflict: 'school_id,date' });
    if (error) console.error('[Supabase] upsert calendar_days error:', error.message);
  } catch (e) { console.error('[Supabase] upsert calendar_days failed:', e); }
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export async function pgUpsertExpense(row: Record<string, any>) { await upsert('expenses', row); }
export async function pgDeleteExpense(id: string) { await deleteRow('expenses', id); }

// ── Income ────────────────────────────────────────────────────────────────────
export async function pgUpsertIncome(row: Record<string, any>) { await upsert('income', row); }
export async function pgDeleteIncome(id: string) { await deleteRow('income', id); }

// ── Ledger Entries ────────────────────────────────────────────────────────────
export async function pgUpsertLedgerEntry(row: Record<string, any>) { await upsert('ledger_entries', row); }

// ── Bad Debts ─────────────────────────────────────────────────────────────────
export async function pgUpsertBadDebt(row: Record<string, any>) { await upsert('bad_debts', row); }

// ── Stationery ────────────────────────────────────────────────────────────────
export async function pgUpsertStationery(row: Record<string, any>) { await upsert('stationery_items', row); }
export async function pgDeleteStationery(id: string) { await deleteRow('stationery_items', id); }

// ── Inventory ─────────────────────────────────────────────────────────────────
export async function pgUpsertInventory(row: Record<string, any>) { await upsert('inventory_items', row); }
export async function pgDeleteInventory(id: string) { await deleteRow('inventory_items', id); }
