import React, { useState } from 'react';
import { DatabaseSchema, Student, Staff } from '../types';
import { addToast } from './Toast';
import { Check, X, User, Briefcase, GraduationCap } from 'lucide-react';

interface ApprovalsViewProps {
  db: DatabaseSchema;
  refreshDatabase: () => void;
}

export default function ApprovalsView({ db, refreshDatabase }: ApprovalsViewProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const pendingStudents = db.students.filter(s => s.status === 'pending');
  const pendingStaff = db.staff.filter(s => s.status === 'pending');

  const handleAction = async (id: string, type: 'student' | 'staff', action: 'approve' | 'reject') => {
    setLoading(id);
    try {
      const res = await fetch('/api/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, action })
      });
      if (res.ok) {
        addToast('success', `User successfully ${action}d!`);
        refreshDatabase();
      } else {
        const data = await res.json();
        addToast('error', data.error || `Failed to ${action} user`);
      }
    } catch (err) {
      addToast('error', 'Network error');
    } finally {
      setLoading(null);
    }
  };

  if (pendingStudents.length === 0 && pendingStaff.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">All Caught Up!</h2>
        <p className="text-slate-500 mt-2">There are no pending user registrations to approve.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">User Approvals</h2>
        <p className="text-sm text-slate-500 mt-1">Review and approve new student and teacher accounts before they can access the system.</p>
      </div>

      {pendingStaff.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800">Pending Teachers ({pendingStaff.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingStaff.map(staff => (
              <div key={staff.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="flex gap-4">
                  <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{staff.name}</h4>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 mt-1">
                      <span><strong className="text-slate-700">Login ID:</strong> {staff.login_id}</span>
                      <span><strong className="text-slate-700">Contact:</strong> {staff.contact || 'N/A'}</span>
                      <span><strong className="text-slate-700">Applied:</strong> {staff.joining_date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                  <button
                    disabled={loading === staff.id}
                    onClick={() => handleAction(staff.id, 'staff', 'reject')}
                    className="flex-1 md:flex-none px-4 py-2 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-medium text-sm transition"
                  >
                    Reject (Delete)
                  </button>
                  <button
                    disabled={loading === staff.id}
                    onClick={() => handleAction(staff.id, 'staff', 'approve')}
                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-medium text-sm transition shadow-sm"
                  >
                    {loading === staff.id ? 'Saving...' : 'Approve Teacher'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingStudents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">Pending Students ({pendingStudents.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingStudents.map(student => (
              <div key={student.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="flex gap-4">
                  <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{student.name}</h4>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 mt-1">
                      <span><strong className="text-slate-700">Login ID:</strong> {student.login_id}</span>
                      <span><strong className="text-slate-700">Contact:</strong> {student.contact || 'N/A'}</span>
                      <span><strong className="text-slate-700">Applied:</strong> {student.admission_date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                  <button
                    disabled={loading === student.id}
                    onClick={() => handleAction(student.id, 'student', 'reject')}
                    className="flex-1 md:flex-none px-4 py-2 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-medium text-sm transition"
                  >
                    Reject (Delete)
                  </button>
                  <button
                    disabled={loading === student.id}
                    onClick={() => handleAction(student.id, 'student', 'approve')}
                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-medium text-sm transition shadow-sm"
                  >
                    {loading === student.id ? 'Saving...' : 'Approve Student'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
