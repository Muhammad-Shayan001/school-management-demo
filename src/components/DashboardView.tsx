/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Briefcase,
  BookOpen,
  Calendar,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowRight,
  RefreshCw,
  Clock,
  Database
} from 'lucide-react';
import { DatabaseSchema, Student, Staff, FeeHead, Payment, Attendance, Expense, Income } from '../types';

interface DashboardViewProps {
  db: DatabaseSchema;
  onNavigate: (page: string, tab?: string) => void;
  onRefresh: () => void;
}

export default function DashboardView({ db, onNavigate, onRefresh }: DashboardViewProps) {
  const activeStudents = db.students.filter(s => s.status === 'active');
  const activeStaff = db.staff.filter(s => s.status === 'active');
  const classesCount = db.classes.length;
  const subjectsCount = db.subjects.length;
  const examsCount = db.exams.length;

  // Compute total pending fees
  const totalPendingFees = db.fee_heads.reduce((sum, fh) => sum + fh.pending_amount, 0);

  // Compute this month net (April 2026 is the seeded month/year)
  const totalExpensesThisMonth = db.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalFeeCollectedThisMonth = db.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOtherIncomeThisMonth = db.income.reduce((sum, i) => sum + i.amount, 0);
  const netIncomeThisMonth = (totalFeeCollectedThisMonth + totalOtherIncomeThisMonth) - totalExpensesThisMonth;

  // Compute present rate for today (seeded to April 24, 2026)
  const todayDate = '2026-04-24';
  const todayAttendance = db.attendance.filter(a => a.date === todayDate);
  const totalEnrolled = activeStudents.length;
  const presentTodayCount = todayAttendance.filter(a => a.status === 'present').length;
  const absentTodayCount = todayAttendance.filter(a => a.status === 'absent').length;
  const leaveTodayCount = todayAttendance.filter(a => a.status === 'leave').length;
  
  const presentRate = todayAttendance.length > 0 
    ? (presentTodayCount / todayAttendance.length) * 100 
    : 0;

  // Attendance alerts
  // Let's check which classes are missing attendance for today
  // Grade 1 (class_g1), Grade 5 (class_g5), Grade 8 (class_g8)
  const classesWithAttendance = new Set(todayAttendance.map(a => a.class_id));
  const pendingClasses = db.classes.filter(c => !classesWithAttendance.has(c.id));
  const attendancePendingStudents = pendingClasses.length > 0
    ? pendingClasses.reduce((sum, c) => sum + db.students.filter(s => s.class_id === c.id && s.status === 'active').length, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* 3.1 Attendance Alert Banner */}
      {pendingClasses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FEF3C7] border border-[#FCD34D] p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          id="attendance-alert-banner"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#D97706] mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-[#92400E] text-sm md:text-base">
                Student attendance pending: {attendancePendingStudents} student(s) for today ({todayDate}).
              </h4>
              <p className="text-xs text-[#B45309] mt-0.5 font-medium">
                Missing rows ko absent treat nahi kiya jayega. Inhen review karr ke attendance save karein.
              </p>
              <div className="flex gap-2 flex-wrap mt-1.5">
                <span className="text-xs font-semibold text-[#B45309] bg-[#FEF3C7] border border-[#FCD34D] px-2.5 py-0.5 rounded-full">
                  Pending classes: {pendingClasses.map(c => c.name).join(', ')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('Attendance')}
            className="no-print inline-flex items-center gap-1.5 px-4 py-2 bg-[#111827] hover:bg-black text-white font-medium text-xs rounded-md shadow-sm transition-colors cursor-pointer shrink-0"
            id="btn-open-attendance"
          >
            Open Attendance
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {/* 3.2 School Summary Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block">School Dashboard</span>
          <h2 className="text-2xl font-bold text-[#111827] mt-0.5">Rana School Management</h2>
          <p className="text-sm text-[#6B7280] mt-1 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" />
            Active Session: <strong className="text-[#111827] font-semibold">2026-27 — Session 1</strong>
            <span className="text-[#E5E7EB]">|</span>
            Today: <strong className="text-[#111827] font-semibold">Friday, April 24, 2026</strong>
          </p>
        </div>
        <div className="flex items-center gap-2.5 no-print">
          <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] text-xs font-semibold rounded-full">
            Demo Active
          </span>
          <button
            onClick={onRefresh}
            className="p-2 border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] rounded-lg transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => onNavigate('Backup / Import')}
            className="px-4 py-2 bg-[#111827] hover:bg-black text-white font-medium text-xs rounded-md shadow-sm transition-colors cursor-pointer"
          >
            Backup
          </button>
        </div>
      </div>

      {/* 3.3 KPI Stat Cards - Row 1 & Row 2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div 
          onClick={() => onNavigate('Admissions', 'All Students')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#2563EB]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#2563EB] group-hover:opacity-100 transition-all">
            <Users className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#2563EB] transition-colors">Total Students</span>
          <div className="text-2xl font-bold mt-1 text-[#111827] font-mono">{activeStudents.length}</div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">
            {db.students.filter(s => s.status === 'inactive').length} inactive | {db.students.filter(s => s.status === 'left').length} left
          </p>
        </div>

        {/* Staff */}
        <div 
          onClick={() => onNavigate('Staff')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#10B981]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#10B981] group-hover:opacity-100 transition-all">
            <Briefcase className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#10B981] transition-colors">Staff Members</span>
          <div className="text-2xl font-bold mt-1 text-[#111827] font-mono">{activeStaff.length}</div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">
            {db.staff.filter(s => s.status === 'active').length} active teachers
          </p>
        </div>

        {/* Classes / Subjects */}
        <div 
          onClick={() => onNavigate('Settings', 'Core Management')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#4F46E5]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#4F46E5] group-hover:opacity-100 transition-all">
            <BookOpen className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#4F46E5] transition-colors">Classes / Subjects</span>
          <div className="text-2xl font-bold mt-1 text-[#111827] font-mono">
            {classesCount} / {subjectsCount}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">Core mapping status: Active</p>
        </div>

        {/* Exams */}
        <div 
          onClick={() => onNavigate('Exam Management')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#9333EA]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#9333EA] group-hover:opacity-100 transition-all">
            <Calendar className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#9333EA] transition-colors">Exams</span>
          <div className="text-2xl font-bold mt-1 text-[#111827] font-mono">{examsCount}</div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">
            {db.exam_assignments.length} papers mapped this session
          </p>
        </div>

        {/* Attendance Pending */}
        <div 
          onClick={() => onNavigate('Attendance')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#D97706]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#D97706] group-hover:opacity-100 transition-all">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#D97706] transition-colors">Attendance Pending</span>
          <div className="text-2xl font-bold mt-1 text-[#111827] font-mono">
            {attendancePendingStudents}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">
            {pendingClasses.length} classes pending out of {classesCount}
          </p>
        </div>

        {/* Present Today */}
        <div 
          onClick={() => onNavigate('Attendance')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#0D9488]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#0D9488] group-hover:opacity-100 transition-all">
            <Activity className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#0D9488] transition-colors">Present Today</span>
          <div className="text-2xl font-bold mt-1 text-[#111827] font-mono">
            {presentTodayCount} <span className="text-base font-normal text-[#6B7280]">({presentRate.toFixed(0)}%)</span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">
            {absentTodayCount} absent | {leaveTodayCount} on leave
          </p>
        </div>

        {/* Pending Fees */}
        <div 
          onClick={() => onNavigate('Fee Management')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#E11D48]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#E11D48] group-hover:opacity-100 transition-all">
            <DollarSign className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#E11D48] transition-colors">Pending Fees</span>
          <div className="text-2xl font-bold mt-1 text-[#111827] font-mono">
            Rs. {totalPendingFees.toLocaleString()}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">
            Across {db.students.filter(s => db.fee_heads.some(fh => fh.student_id === s.id && fh.status === 'PENDING')).length} students
          </p>
        </div>

        {/* This Month Net */}
        <div 
          onClick={() => onNavigate('Accounting')}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#059669]/50 hover:shadow-md transition-all"
        >
          <div className="absolute right-4 top-4 text-[#9CA3AF] opacity-40 group-hover:scale-110 group-hover:text-[#059669] group-hover:opacity-100 transition-all">
            <TrendingUp className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider group-hover:text-[#059669] transition-colors">This Month Net</span>
          <div className={`text-2xl font-bold mt-1 font-mono ${netIncomeThisMonth >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            Rs. {netIncomeThisMonth.toLocaleString()}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2 font-medium">
            Collection Rs. {totalFeeCollectedThisMonth.toLocaleString()} | Exp Rs. {totalExpensesThisMonth.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Grid for Smart Alerts & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3.4 Smart Alerts Panel */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5 lg:col-span-2">
          <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB]">
            <div>
              <h3 className="font-bold text-[#111827] text-base">Smart Alerts</h3>
              <p className="text-xs text-[#9CA3AF]">Important items needing attention.</p>
            </div>
            <button 
              onClick={onRefresh}
              className="p-1.5 hover:bg-[#F9FAFB] text-[#9CA3AF] hover:text-[#111827] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#E5E7EB]"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {pendingClasses.length > 0 && (
              <div className="p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#92400E]">Attendance Pending</span>
                  <p className="text-xs text-[#B45309] mt-0.5 font-medium">
                    Grade {pendingClasses.map(c => c.name.replace('Grade ', '')).join(' & ')} attendance must be marked today.
                  </p>
                </div>
              </div>
            )}

            {totalPendingFees > 20000 && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl flex items-start gap-2.5">
                <DollarSign className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#991B1B]">High Defaulter Balance</span>
                  <p className="text-xs text-[#B91C1C] mt-0.5 font-medium">
                    Outstanding fee collections reached Rs. {totalPendingFees.toLocaleString()}. Run a recovery campaign immediately.
                  </p>
                </div>
              </div>
            )}

            {db.staff.length === 0 && (
              <div className="p-3 bg-[#DBEAFE] border border-[#93C5FD] rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#1E40AF]">No Teachers Setup</span>
                  <p className="text-xs text-[#1D4ED8] mt-0.5 font-medium">
                    Ensure teachers are added to class-subject mapping to enable automatic assignments.
                  </p>
                </div>
              </div>
            )}

            {/* Default healthy placeholder */}
            {pendingClasses.length === 0 && totalPendingFees <= 20000 && db.staff.length > 0 && (
              <div className="p-6 text-center text-[#9CA3AF] text-sm">
                <Activity className="h-10 w-10 text-[#10B981] mx-auto mb-2 opacity-50" />
                No critical action alerts today. School is running in healthy parameters!
              </div>
            )}
          </div>
        </div>

        {/* 3.5 System Health Panel */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
          <div className="pb-4 border-b border-[#E5E7EB] mb-4">
            <h3 className="font-bold text-[#111827] text-base">System Health</h3>
            <p className="text-xs text-[#9CA3AF]">Database & environment status.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6B7280] flex items-center gap-1.5 font-medium">
                <Database className="h-4 w-4 text-[#9CA3AF]" /> Database Storage
              </span>
              <span className="font-semibold text-[#10B981]">File JSON (Online)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6B7280] flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4 text-[#9CA3AF]" /> Active Session
              </span>
              <span className="font-semibold text-[#111827]">2026-27 — S1</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6B7280] flex items-center gap-1.5 font-medium">
                <Activity className="h-4 w-4 text-[#9CA3AF]" /> Active API Key
              </span>
              <span className="font-mono text-xs px-2 py-0.5 bg-[#F3F4F6] border border-[#E5E7EB] rounded-md text-[#6B7280]">
                AI Studio Secrets
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6B7280] flex items-center gap-1.5 font-medium">
                <Users className="h-4 w-4 text-[#9CA3AF]" /> Total Accounts
              </span>
              <span className="font-semibold text-[#111827]">{db.students.length + db.staff.length} profiles</span>
            </div>
          </div>

          <div className="mt-6 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-center text-xs text-[#6B7280] font-semibold">
            Last Backup: <span className="text-[#111827]">Today, 04:11 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
