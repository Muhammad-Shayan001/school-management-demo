import React, { useState, useEffect, useRef } from 'react';
import { DatabaseSchema, School, Student } from '../types';
import { addToast } from './Toast';
import {
  LogOut, GraduationCap, LayoutDashboard, UserCircle, Calendar,
  FileText, Wallet, CreditCard, Bell, ChevronRight, BookOpen,
  CheckCircle2, AlertCircle, Clock, Send, X, Menu, TrendingUp,
  Award, QrCode, Download, Phone, MapPin, Hash, CalendarDays,
  BarChart3, BookMarked, Check, AlertTriangle, Info
} from 'lucide-react';

interface StudentDashboardViewProps {
  user: any;
  db: DatabaseSchema | null;
  school: School;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserCircle },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'results', label: 'Results', icon: Award },
  { id: 'fee', label: 'Fee Details', icon: Wallet },
  { id: 'idcard', label: 'ID Card', icon: CreditCard },
];

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboardView({ user, db: initialDb, school, onLogout }: StudentDashboardViewProps) {
  const [db, setDb] = useState<DatabaseSchema | null>(initialDb);

  useEffect(() => {
    setDb(initialDb);
  }, [initialDb]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  
  // Profile Setup State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    image_url: user.image_url || '',
    contact: user.contact || user.emergency_contact || '',
    blood_group: user.blood_group || '',
    address: user.address || '',
    password: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const idCardRef = useRef<HTMLDivElement>(null);

  if (!db) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="h-10 w-10 mx-auto border-4 border-[#182D66] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading your portal...</p>
      </div>
    </div>
  );

  const student = db.students.find(s => s.id === user.id) || ({} as Student);
  const cls = db.classes.find(c => c.id === student.class_id);
  const section = db.sections.find(s => s.id === student.section_id);
  const feeHeads = db.fee_heads.filter(f => f.student_id === student.id);
  const pendingFees = feeHeads.filter(f => f.status === 'PENDING').reduce((acc, curr) => acc + curr.pending_amount, 0);
  const paidFees = feeHeads.filter(f => f.status === 'PAID').reduce((acc, curr) => acc + curr.expected_amount, 0);

  const classAssignments = (db.assignments || []).filter(a => a.class_id === student.class_id);
  const mySubmissions = (db.assignment_submissions || []).filter(s => s.student_id === student.id);
  const pendingAssignments = classAssignments.filter(a => !mySubmissions.find(s => s.assignment_id === a.id));

  // Attendance
  const myAttendance = db.attendance.filter(a => a.student_id === student.id);
  const presentCount = myAttendance.filter(a => a.status === 'present').length;
  const absentCount = myAttendance.filter(a => a.status === 'absent').length;
  const totalDays = myAttendance.length;
  const attendancePct = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  // Results
  const myResults = db.exam_results?.filter(r => r.student_id === student.id) || [];
  const totalMarksObtained = myResults.reduce((s, r) => s + (r.marks_obtained || 0), 0);
  const totalMarksMax = myResults.reduce((s, r) => s + (r.marks_total || 0), 0);
  const overallPct = totalMarksMax > 0 ? Math.round((totalMarksObtained / totalMarksMax) * 100) : 0;

  // Filter attendance by month
  const filteredAttendance = myAttendance.filter(a => a.date?.startsWith(attendanceMonth));

  const handleSubmitAssignment = async (e: React.FormEvent, assignmentId: string) => {
    e.preventDefault();
    if (!submissionText.trim()) return;
    try {
      const res = await fetch('/api/assignments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId, student_id: student.id, content: submissionText })
      });
      if (res.ok) {
        addToast('Assignment submitted!', 'success');
        const newSub = {
          id: `sub_${Date.now()}`,
          assignment_id: assignmentId,
          student_id: student.id,
          content: submissionText,
          submitted_at: new Date().toISOString()
        };
        const updatedSubs = [...(db.assignment_submissions || []).filter(s => s.assignment_id !== assignmentId), newSub];
        setDb({ ...db, assignment_submissions: updatedSubs });
        setSubmittingId(null);
        setSubmissionText('');
      } else {
        addToast('Failed to submit.', 'error');
      }
    } catch {
      addToast('Network error.', 'error');
    }
  };

  const getGrade = (pct: number) => {
    if (pct >= 90) return { grade: 'A+', color: 'text-emerald-600' };
    if (pct >= 80) return { grade: 'A', color: 'text-emerald-500' };
    if (pct >= 70) return { grade: 'B', color: 'text-blue-600' };
    if (pct >= 60) return { grade: 'C', color: 'text-amber-500' };
    if (pct >= 50) return { grade: 'D', color: 'text-orange-500' };
    return { grade: 'F', color: 'text-rose-600' };
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#182D66] via-[#1e3a7a] to-[#0f1d38] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 -mb-10 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden">
            {student.image_url ? (
              <img src={student.image_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-white/80">{student.name?.[0] || 'S'}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Welcome back</p>
            <h2 className="text-2xl sm:text-3xl font-black mt-1">{student.name || 'Student'}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">{cls?.name || 'N/A'}</span>
              <span className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">Section {section?.name || 'N/A'}</span>
              <span className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-mono font-semibold">{student.reg_no}</span>
            </div>
          </div>
          <div className="flex sm:flex-col gap-3">
            <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/15 min-w-[100px]">
              <p className="text-2xl font-black">{attendancePct}%</p>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider mt-1">Attendance</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/15 min-w-[100px]">
              <p className="text-2xl font-black">{pendingAssignments.length}</p>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider mt-1">Tasks Due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Present Days" value={presentCount} icon={CheckCircle2} color="bg-emerald-500" sub={`of ${totalDays} days`} />
        <StatCard label="Absent Days" value={absentCount} icon={AlertCircle} color="bg-rose-500" sub={`${100 - attendancePct}% rate`} />
        <StatCard label="Pending Fees" value={`Rs ${pendingFees.toLocaleString()}`} icon={Wallet} color="bg-amber-500" sub="Due balance" />
        <StatCard label="Overall Score" value={`${overallPct}%`} icon={TrendingUp} color="bg-blue-600" sub={myResults.length > 0 ? getGrade(overallPct).grade : 'No results'} />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'My Attendance', icon: Calendar, tab: 'attendance', color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { label: 'Assignments', icon: FileText, tab: 'assignments', color: 'bg-violet-50 text-violet-700 border-violet-100' },
            { label: 'Results', icon: Award, tab: 'results', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { label: 'ID Card', icon: CreditCard, tab: 'idcard', color: 'bg-amber-50 text-amber-700 border-amber-100' },
          ].map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${item.color} hover:shadow-md transition-all font-semibold text-sm`}>
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Assignments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-600" />Pending Assignments</h3>
            <button onClick={() => setActiveTab('assignments')} className="text-xs text-[#182D66] font-semibold hover:underline">View all</button>
          </div>
          {pendingAssignments.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <CheckCircle2 className="h-10 w-10 mb-2 text-emerald-400" />
              <p className="font-medium">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAssignments.slice(0, 3).map(a => {
                const sub = db.subjects.find(s => s.id === a.subject_id);
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sub?.name} • Due: {a.due_date || 'No date'}</p>
                    </div>
                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">Pending</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fee Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Wallet className="h-4 w-4 text-amber-600" />Fee Summary</h3>
            <button onClick={() => setActiveTab('fee')} className="text-xs text-[#182D66] font-semibold hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="font-semibold text-sm text-emerald-800">Total Paid</span></div>
              <span className="font-black text-emerald-700">Rs {paidFees.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-600" /><span className="font-semibold text-sm text-amber-800">Pending Due</span></div>
              <span className="font-black text-amber-700">Rs {pendingFees.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-sm text-slate-700">Fee Records</span>
              <span className="font-bold text-slate-900">{feeHeads.length} items</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#182D66] to-[#2a4a9f]" />
        <div className="px-8 pb-8 -mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg bg-white overflow-hidden shrink-0">
              {student.image_url ? (
                <img src={student.image_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[#182D66] flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{student.name?.[0] || 'S'}</span>
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <h2 className="text-2xl font-black text-slate-900">{student.name}</h2>
              <p className="text-slate-500 font-medium">{cls?.name} • Section {section?.name}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{student.reg_no}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{student.status?.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition shadow-sm border border-slate-200">
                Setup Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><UserCircle className="h-4 w-4 text-[#182D66]" />Personal Information</h3>
          {[
            { label: 'Full Name', value: student.name },
            { label: "Father's Name", value: student.father_name },
            { label: 'Guardian Name', value: student.guardian_name },
            { label: 'Gender', value: student.gender },
            { label: 'Date of Birth', value: student.dob },
            { label: 'Blood Group', value: student.blood_group || 'N/A' },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 shrink-0">{item.label}</span>
              <span className="font-semibold text-slate-900 text-sm text-right">{item.value || 'N/A'}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#182D66]" />Academic Information</h3>
          {[
            { label: 'Registration #', value: student.reg_no },
            { label: 'Class', value: cls?.name },
            { label: 'Section', value: section?.name },
            { label: 'School', value: school.name },
            { label: 'Admission Date', value: student.admission_date },
            { label: 'Status', value: student.status },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 shrink-0">{item.label}</span>
              <span className="font-semibold text-slate-900 text-sm text-right">{item.value || 'N/A'}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><Phone className="h-4 w-4 text-[#182D66]" />Contact Information</h3>
          {[
            { label: 'Mobile', value: student.contact },
            { label: 'Alt Phone', value: student.alt_phone },
            { label: 'Guardian Contact', value: student.guardian_contact },
            { label: 'Emergency', value: student.emergency_contact },
            { label: 'Address', value: student.address },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 shrink-0">{item.label}</span>
              <span className="font-semibold text-slate-900 text-sm text-right">{item.value || 'N/A'}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#182D66]" />Academic Stats</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-slate-600">Attendance</span>
                <span className="text-xs font-bold text-slate-900">{attendancePct}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${attendancePct >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${attendancePct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-slate-600">Overall Score</span>
                <span className="text-xs font-bold text-slate-900">{overallPct}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-slate-600">Assignments Done</span>
                <span className="text-xs font-bold text-slate-900">{mySubmissions.length}/{classAssignments.length}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: classAssignments.length > 0 ? `${(mySubmissions.length / classAssignments.length) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => {
    const [year, month] = attendanceMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const monthPresent = filteredAttendance.filter(a => a.status === 'present').length;
    const monthAbsent = filteredAttendance.filter(a => a.status === 'absent').length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Attendance Record</h2>
          <input type="month" value={attendanceMonth} onChange={e => setAttendanceMonth(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#182D66]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Days', value: filteredAttendance.length, color: 'bg-slate-600' },
            { label: 'Present', value: monthPresent, color: 'bg-emerald-500' },
            { label: 'Absent', value: monthAbsent, color: 'bg-rose-500' },
            { label: 'Percentage', value: filteredAttendance.length > 0 ? `${Math.round((monthPresent / filteredAttendance.length) * 100)}%` : '0%', color: 'bg-blue-600' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
              <div className={`h-10 w-10 rounded-xl ${item.color} mx-auto flex items-center justify-center mb-3`}>
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-black text-slate-900">{item.value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4">Monthly Calendar</h3>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-xs font-bold text-slate-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${attendanceMonth}-${String(dayNum).padStart(2, '0')}`;
              const rec = filteredAttendance.find(a => a.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              let bg = 'bg-slate-50 text-slate-400';
              if (rec?.status === 'present') bg = 'bg-emerald-100 text-emerald-700 font-bold';
              else if (rec?.status === 'absent') bg = 'bg-rose-100 text-rose-700 font-bold';
              else if (rec?.status === 'leave') bg = 'bg-amber-100 text-amber-700 font-bold';
              if (isToday) bg += ' ring-2 ring-[#182D66]';
              return (
                <div key={dayNum} className={`aspect-square flex items-center justify-center rounded-xl text-xs ${bg} relative`}>
                  {dayNum}
                  {rec?.status === 'present' && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-100 border border-emerald-300" /><span className="text-xs text-slate-600 font-medium">Present</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-rose-100 border border-rose-300" /><span className="text-xs text-slate-600 font-medium">Absent</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-amber-100 border border-amber-300" /><span className="text-xs text-slate-600 font-medium">Leave</span></div>
          </div>
        </div>
      </div>
    );
  };

  const renderAssignments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">My Assignments</h2>
        <div className="flex gap-2 text-xs font-bold">
          <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full">{pendingAssignments.length} Pending</span>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">{mySubmissions.length} Done</span>
        </div>
      </div>

      {classAssignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <FileText className="h-16 w-16 mx-auto text-slate-200 mb-4" />
          <p className="font-bold text-slate-500 text-lg">No assignments yet</p>
          <p className="text-slate-400 text-sm mt-1">Your teacher hasn't posted any assignments for your class.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classAssignments.map(assignment => {
            const sub = db.subjects.find(s => s.id === assignment.subject_id);
            const teacher = db.staff.find(t => t.id === assignment.teacher_id);
            const submission = mySubmissions.find(s => s.assignment_id === assignment.id);
            const isSubmitting = submittingId === assignment.id;
            const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && !submission;

            return (
              <div key={assignment.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#182D66] bg-blue-50 px-2 py-0.5 rounded-full">{sub?.name}</span>
                        {isOverdue && <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Overdue</span>}
                      </div>
                      <h3 className="font-black text-slate-900 text-lg">{assignment.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">By {teacher?.name || 'Teacher'} • Due: <span className="font-semibold text-slate-700">{assignment.due_date || 'No date set'}</span></p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${submission ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {submission ? '✓ Submitted' : 'Pending'}
                    </span>
                  </div>
                  {assignment.description && (
                    <p className="text-sm text-slate-700 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">{assignment.description}</p>
                  )}
                </div>

                <div className="px-5 pb-5">
                  {submission && !isSubmitting ? (
                    <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-emerald-800 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Your Submission</span>
                        <button onClick={() => { setSubmittingId(assignment.id); setSubmissionText(submission.content); }}
                          className="text-xs text-[#182D66] font-bold hover:underline">Edit</button>
                      </div>
                      <p className="text-sm text-emerald-900 whitespace-pre-wrap">{submission.content}</p>
                      <p className="text-[10px] text-emerald-600 mt-2 font-medium">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSubmitAssignment(e, assignment.id)} className="space-y-3">
                      <textarea
                        rows={isSubmitting ? 4 : 2}
                        value={submittingId === assignment.id ? submissionText : ''}
                        onFocus={() => { if (submittingId !== assignment.id) { setSubmittingId(assignment.id); setSubmissionText(submission?.content || ''); } }}
                        onChange={e => { setSubmittingId(assignment.id); setSubmissionText(e.target.value); }}
                        className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#182D66] resize-none bg-slate-50"
                        placeholder="Type your answer or submission here..."
                      />
                      {isSubmitting && (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => { setSubmittingId(null); setSubmissionText(''); }}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                          <button type="submit" disabled={!submissionText.trim()}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#182D66] hover:bg-[#1e3a84] rounded-xl flex items-center gap-2 disabled:opacity-50">
                            <Send className="h-4 w-4" />Submit Work
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderResults = () => {
    const exams = db.exams || [];
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black text-slate-900">My Results</h2>

        {myResults.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <Award className="h-16 w-16 mx-auto text-slate-200 mb-4" />
            <p className="font-bold text-slate-500 text-lg">No results yet</p>
            <p className="text-slate-400 text-sm mt-1">Results will appear here once your teacher enters marks.</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-[#182D66] to-[#2a4a9f] rounded-2xl p-6 text-white">
              <p className="text-blue-200 text-sm font-semibold mb-1">Overall Performance</p>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-5xl font-black">{overallPct}%</p>
                  <p className="text-blue-200 mt-1">Based on {myResults.length} results</p>
                </div>
                <div className={`text-6xl font-black ml-auto ${overallPct >= 60 ? 'text-white/90' : 'text-rose-300'}`}>
                  {getGrade(overallPct).grade}
                </div>
              </div>
              <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>

            <div className="space-y-4">
              {exams.map(exam => {
                const examResults = myResults.filter(r => r.exam_id === exam.id);
                if (examResults.length === 0) return null;
                const total = examResults.reduce((s, r) => s + r.marks_obtained, 0);
                const max = examResults.reduce((s, r) => s + r.marks_total, 0);
                const pct = max > 0 ? Math.round((total / max) * 100) : 0;

                return (
                  <div key={exam.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-slate-900">{exam.name}</h3>
                        <p className="text-sm text-slate-500">{exam.term} • {exam.date_start}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#182D66]">{pct}%</p>
                        <p className={`text-sm font-bold ${getGrade(pct).color}`}>{getGrade(pct).grade}</p>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {examResults.map(r => {
                        const subject = db.subjects.find(s => s.id === r.subject_id);
                        const subPct = r.marks_total > 0 ? Math.round((r.marks_obtained / r.marks_total) * 100) : 0;
                        return (
                          <div key={r.id} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <BookMarked className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{subject?.name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500">{r.marks_obtained}/{r.marks_total} marks</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-black text-sm ${getGrade(subPct).color}`}>{getGrade(subPct).grade}</p>
                              <p className="text-xs text-slate-500">{subPct}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFee = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900">Fee Details</h2>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
          <p className="text-2xl font-black text-emerald-700">Rs {paidFees.toLocaleString()}</p>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">Total Paid</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
          <p className="text-2xl font-black text-amber-700">Rs {pendingFees.toLocaleString()}</p>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-1">Pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
          <Wallet className="h-8 w-8 mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-black text-blue-700">{feeHeads.length}</p>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">Total Records</p>
        </div>
      </div>

      {feeHeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Wallet className="h-16 w-16 mx-auto text-slate-200 mb-4" />
          <p className="font-bold text-slate-500">No fee records found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Fee Records</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {feeHeads.map(fee => (
              <div key={fee.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${fee.status === 'PAID' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {fee.status === 'PAID' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5 text-amber-600" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{fee.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fee.period_label} • Due: {fee.due_date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">Rs {fee.expected_amount.toLocaleString()}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fee.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {fee.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderIDCard = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900">Digital ID Card</h2>

      <div className="flex justify-center">
        <div ref={idCardRef} className="w-full max-w-sm">
          {/* Front of ID Card */}
          <div className="bg-gradient-to-br from-[#182D66] to-[#1a3b8a] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden mb-4">
            <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 h-28 w-28 bg-white/5 rounded-full -ml-10 -mb-10" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-black text-lg">{school.name}</p>
                  <p className="text-blue-200 text-xs">Student Identity Card</p>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center shrink-0">
                  {student.image_url ? (
                    <img src={student.image_url} alt="Student" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-white/70">{student.name?.[0] || 'S'}</span>
                  )}
                </div>
                <div>
                  <p className="font-black text-xl leading-tight">{student.name}</p>
                  <p className="text-blue-200 text-sm mt-1">{student.father_name ? `S/o ${student.father_name}` : ''}</p>
                  <p className="text-white/80 text-xs mt-2 font-mono bg-white/10 px-2 py-0.5 rounded-full inline-block">{student.reg_no}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Class', value: cls?.name || 'N/A' },
                  { label: 'Section', value: section?.name || 'N/A' },
                  { label: 'Status', value: student.status || 'Active' },
                ].map(item => (
                  <div key={item.label} className="bg-white/10 rounded-xl p-2">
                    <p className="text-[9px] text-blue-200 uppercase font-bold">{item.label}</p>
                    <p className="font-black text-sm mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-blue-200 uppercase font-bold">Admission Date</p>
                  <p className="text-xs font-semibold">{student.admission_date || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-blue-200 uppercase font-bold">Contact</p>
                  <p className="text-xs font-semibold">{student.contact || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Back of ID Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-[#182D66] shadow-xl">
            <div className="text-center mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scan QR for verification</p>
            </div>
            <div className="flex justify-center mb-4">
              <div className="h-28 w-28 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-slate-200">
                <QrCode className="h-16 w-16 text-[#182D66]" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-slate-900">{student.name}</p>
              <p className="text-sm font-mono text-[#182D66]">{student.reg_no}</p>
              <p className="text-xs text-slate-500">{school.name}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">Emergency: {student.emergency_contact || student.contact || 'N/A'}</p>
              <p className="text-xs text-slate-400 mt-1">If found, please return to {school.name}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#182D66] text-white rounded-xl font-semibold text-sm hover:bg-[#1e3a84] transition">
              <Download className="h-4 w-4" /> Print / Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'profile': return renderProfile();
      case 'attendance': return renderAttendance();
      case 'assignments': return renderAssignments();
      case 'results': return renderResults();
      case 'fee': return renderFee();
      case 'idcard': return renderIDCard();
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen w-64 bg-[#182D66] flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* School Brand */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-tight">{school.name}</p>
              <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider">Student Portal</p>
            </div>
          </div>
        </div>

        {/* Student Mini Profile */}
        <div className="p-4 mx-3 mt-3 rounded-2xl bg-white/10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
            {student.image_url ? (
              <img src={student.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-black text-white text-lg">{student.name?.[0] || 'S'}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{student.name}</p>
            <p className="text-blue-300 text-xs font-mono truncate">{student.reg_no}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-3">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-white text-[#182D66] shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition">
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
            <div>
              <h1 className="font-black text-slate-900 text-sm sm:text-base capitalize">{NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Dashboard'}</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Student Portal • {school.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${attendancePct >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {attendancePct}% Attendance
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
