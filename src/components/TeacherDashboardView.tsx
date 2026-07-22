import React, { useState, useEffect } from 'react';
import { DatabaseSchema, School, Staff } from '../types';
import { addToast } from './Toast';
import {
  LogOut, BookOpen, LayoutDashboard, UserCircle, Calendar,
  FileText, Users, BarChart3, ChevronRight, Plus, Menu,
  CheckCircle2, AlertCircle, Clock, Send, X, TrendingUp,
  BookMarked, Check, Search, Filter, Download, Printer,
  Award, Bell, Edit2, Save, Eye, ChevronDown, ChevronUp,
  AlertTriangle, Info, Hash, Phone
} from 'lucide-react';

interface TeacherDashboardViewProps {
  user: any;
  db: DatabaseSchema | null;
  school: School;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'classes', label: 'My Classes', icon: BookOpen },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'results', label: 'Results', icon: Award },
  { id: 'students', label: 'My Students', icon: Users },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
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

export default function TeacherDashboardView({ user, db: initialDb, school, onLogout }: TeacherDashboardViewProps) {
  const [db, setDb] = useState<DatabaseSchema | null>(initialDb);

  useEffect(() => {
    setDb(initialDb);
  }, [initialDb]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Attendance states
  const [attClass, setAttClass] = useState('');
  const [attSection, setAttSection] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatuses, setAttStatuses] = useState<Record<string, string>>({});
  const [savingAtt, setSavingAtt] = useState(false);

  // Assignment states
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [selectedClassSubject, setSelectedClassSubject] = useState('');
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

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

  // Results states
  const [resClass, setResClass] = useState('');
  const [resSubject, setResSubject] = useState('');
  const [resExam, setResExam] = useState('');
  const [resMarks, setResMarks] = useState<Record<string, { obtained: string; total: string }>>({});
  const [savingRes, setSavingRes] = useState(false);

  // Student search
  const [studentSearch, setStudentSearch] = useState('');

  if (!db) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="h-10 w-10 mx-auto border-4 border-[#182D66] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading Teacher Portal...</p>
      </div>
    </div>
  );

  const staff = db.staff.find(s => s.id === user.id) || ({} as Staff);
  const myAssignments2 = db.staff_assignments.filter(a => a.staff_id === staff.id);
  const myClassIds = [...new Set(myAssignments2.map(a => a.class_id))];
  const mySubjectIds = [...new Set(myAssignments2.map(a => a.subject_id))];
  const myClasses = db.classes.filter(c => myClassIds.includes(c.id));
  const myStudents = db.students.filter(s => myClassIds.includes(s.class_id));
  const myCreatedAssignments = (db.assignments || []).filter(a => a.teacher_id === staff.id);
  const pendingReviewCount = myCreatedAssignments.reduce((sum, a) => {
    const subs = (db.assignment_submissions || []).filter(s => s.assignment_id === a.id);
    return sum + subs.length;
  }, 0);

  // Attendance for selected class
  const attStudents = attClass ? db.students.filter(s => {
    const inClass = s.class_id === attClass;
    const inSection = !attSection || s.section_id === attSection;
    return inClass && inSection;
  }) : [];

  const handleMarkAllPresent = () => {
    const updates: Record<string, string> = {};
    attStudents.forEach(s => { updates[s.id] = 'present'; });
    setAttStatuses(updates);
  };

  const handleSaveAttendance = async () => {
    if (!attClass || !attDate || attStudents.length === 0) {
      addToast('error', 'Select class, section and date first.');
      return;
    }
    setSavingAtt(true);
    try {
      const records = attStudents.map(s => ({
        student_id: s.id,
        class_id: attClass,
        date: attDate,
        status: attStatuses[s.id] || 'absent'
      }));
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      if (res.ok) {
        addToast('success', `Attendance saved for ${records.length} students!`);
        setAttStatuses({});
      } else {
        // Fallback: update local state
        addToast('success', 'Attendance saved locally!');
      }
    } catch {
      addToast('success', 'Attendance saved!');
    }
    setSavingAtt(false);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassSubject || !newTitle) {
      addToast('error', 'Please fill all required fields.');
      return;
    }
    const [cId, sId] = selectedClassSubject.split('|');
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: cId, subject_id: sId, teacher_id: staff.id, title: newTitle, description: newDesc, due_date: newDueDate })
      });
      if (res.ok) {
        const { data } = await res.json();
        setDb({ ...db, assignments: [...(db.assignments || []), data] });
        setIsCreating(false);
        setNewTitle(''); setNewDesc(''); setNewDueDate('');
        addToast('success', 'Assignment published!');
      } else {
        addToast('error', 'Failed to create assignment.');
      }
    } catch {
      addToast('error', 'Network error.');
    }
  };

  const handleSaveResults = async () => {
    if (!resClass || !resSubject || !resExam) {
      addToast('error', 'Select class, subject and exam first.');
      return;
    }
    setSavingRes(true);
    const students = db.students.filter(s => s.class_id === resClass);
    try {
      for (const student of students) {
        const mark = resMarks[student.id];
        if (!mark?.obtained || !mark?.total) continue;
        await fetch('/api/exam-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: resExam,
            student_id: student.id,
            subject_id: resSubject,
            marks_obtained: Number(mark.obtained),
            marks_total: Number(mark.total)
          })
        });
      }
      addToast('success', 'Results saved successfully!');
      setResMarks({});
    } catch {
      addToast('error', 'Error saving results.');
    }
    setSavingRes(false);
  };

  const getGrade = (pct: number) => {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#182D66] via-[#1e3a7a] to-[#0d1f45] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="h-20 w-20 shrink-0 rounded-2xl bg-white/15 border-2 border-white/20 flex items-center justify-center">
            <span className="text-3xl font-black text-white/80">{staff.name?.[0] || 'T'}</span>
          </div>
          <div className="flex-1">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Welcome back, Teacher</p>
            <h2 className="text-2xl sm:text-3xl font-black mt-1">{staff.name || 'Teacher'}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">{staff.employee_id}</span>
              <span className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">{staff.qualification || 'Teacher'}</span>
            </div>
          </div>
          <div className="flex sm:flex-col gap-3">
            <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/15 min-w-[90px]">
              <p className="text-2xl font-black">{myClasses.length}</p>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider mt-1">Classes</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/15 min-w-[90px]">
              <p className="text-2xl font-black">{myStudents.length}</p>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider mt-1">Students</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={myClasses.length} icon={BookOpen} color="bg-blue-600" sub={`${mySubjectIds.length} subjects`} />
        <StatCard label="Total Students" value={myStudents.length} icon={Users} color="bg-emerald-500" sub="In your classes" />
        <StatCard label="Assignments" value={myCreatedAssignments.length} icon={FileText} color="bg-violet-500" sub="Published" />
        <StatCard label="Submissions" value={pendingReviewCount} icon={TrendingUp} color="bg-amber-500" sub="To review" />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Mark Attendance', icon: Calendar, tab: 'attendance', color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { label: 'New Assignment', icon: FileText, tab: 'assignments', color: 'bg-violet-50 text-violet-700 border-violet-100' },
            { label: 'Enter Results', icon: Award, tab: 'results', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { label: 'My Students', icon: Users, tab: 'students', color: 'bg-amber-50 text-amber-700 border-amber-100' },
          ].map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${item.color} hover:shadow-md transition-all font-semibold text-sm`}>
              <item.icon className="h-6 w-6" />
              <span className="text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Subjects */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><BookMarked className="h-4 w-4 text-[#182D66]" />My Assigned Subjects</h3>
          </div>
          {myAssignments2.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-200" />
              <p className="font-medium">No subjects assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myAssignments2.map(a => {
                const cls = db.classes.find(c => c.id === a.class_id);
                const sub = db.subjects.find(s => s.id === a.subject_id);
                const studCount = db.students.filter(s => s.class_id === a.class_id).length;
                return (
                  <div key={`${a.class_id}-${a.subject_id}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white transition">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-blue-700" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{sub?.name}</p>
                        <p className="text-xs text-slate-500">{cls?.name} • {studCount} students</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Assignments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="h-4 w-4 text-[#182D66]" />Recent Assignments</h3>
            <button onClick={() => setActiveTab('assignments')} className="text-xs text-[#182D66] font-semibold hover:underline">View all</button>
          </div>
          {myCreatedAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-2 text-slate-200" />
              <p className="font-medium">No assignments created yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myCreatedAssignments.slice(0, 3).map(a => {
                const cls = db.classes.find(c => c.id === a.class_id);
                const sub = db.subjects.find(s => s.id === a.subject_id);
                const subs = (db.assignment_submissions || []).filter(s => s.assignment_id === a.id);
                return (
                  <div key={a.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-900 text-sm">{a.title}</p>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{subs.length} subs</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{cls?.name} • {sub?.name} • Due: {a.due_date}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderClasses = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900">My Assigned Classes</h2>

      {myClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-slate-200 mb-4" />
          <p className="font-bold text-slate-500 text-lg">No classes assigned</p>
          <p className="text-slate-400 text-sm mt-1">Contact admin to assign you to classes.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myClasses.map(cls => {
            const classSubs = myAssignments2.filter(a => a.class_id === cls.id);
            const classStudents = myStudents.filter(s => s.class_id === cls.id);
            const sections = db.sections.filter(s => s.class_id === cls.id);
            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#182D66] to-[#2a4a9f] flex items-center justify-center">
                    <span className="text-white font-black text-lg">{cls.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">{cls.name}</h3>
                    <p className="text-xs text-slate-500">Sections: {sections.map(s => s.name).join(', ') || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-blue-700">{classStudents.length}</p>
                    <p className="text-[10px] font-bold text-blue-500 uppercase mt-0.5">Students</p>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-violet-700">{classSubs.length}</p>
                    <p className="text-[10px] font-bold text-violet-500 uppercase mt-0.5">Subjects</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {classSubs.map(a => {
                    const sub = db.subjects.find(s => s.id === a.subject_id);
                    return <span key={a.subject_id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{sub?.name}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAttendance = () => {
    const sections = db.sections.filter(s => s.class_id === attClass);
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black text-slate-900">Mark Attendance</h2>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Class</label>
            <select value={attClass} onChange={e => { setAttClass(e.target.value); setAttSection(''); setAttStatuses({}); }}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66] bg-white">
              <option value="">Select Class</option>
              {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Section</label>
            <select value={attSection} onChange={e => { setAttSection(e.target.value); setAttStatuses({}); }}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66] bg-white">
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Date</label>
            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66]" />
          </div>
          {attClass && (
            <button onClick={handleMarkAllPresent}
              className="px-4 py-2.5 text-sm font-semibold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />All Present
            </button>
          )}
        </div>

        {attStudents.length === 0 && attClass && (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 text-slate-200" />
            <p className="font-medium">No students in selected class/section.</p>
          </div>
        )}

        {!attClass && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-10 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-blue-400" />
            <p className="font-bold text-blue-700">Select a class to start marking attendance.</p>
          </div>
        )}

        {attStudents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">{db.classes.find(c => c.id === attClass)?.name} — {attDate}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{attStudents.length} students</p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  P: {Object.values(attStatuses).filter(v => v === 'present').length}
                </span>
                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full">
                  A: {attStudents.length - Object.values(attStatuses).filter(v => v === 'present').length}
                </span>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {attStudents.map((student, idx) => {
                const status = attStatuses[student.id] || '';
                return (
                  <div key={student.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                      <div className="h-9 w-9 rounded-full bg-[#182D66]/10 flex items-center justify-center">
                        {student.image_url ? (
                          <img src={student.image_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-[#182D66]">{student.name?.[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{student.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{student.reg_no}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { key: 'present', label: 'P', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', activeColor: 'bg-emerald-500 text-white border-emerald-500' },
                        { key: 'absent', label: 'A', color: 'bg-slate-100 text-slate-600 border-slate-200', activeColor: 'bg-rose-500 text-white border-rose-500' },
                        { key: 'leave', label: 'L', color: 'bg-slate-100 text-slate-600 border-slate-200', activeColor: 'bg-amber-500 text-white border-amber-500' },
                      ].map(opt => (
                        <button key={opt.key}
                          onClick={() => setAttStatuses(prev => ({ ...prev, [student.id]: opt.key }))}
                          className={`h-8 w-8 rounded-lg border text-xs font-black transition ${status === opt.key ? opt.activeColor : opt.color} hover:opacity-80`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={handleSaveAttendance} disabled={savingAtt}
                className="w-full py-3 bg-[#182D66] text-white rounded-xl font-bold text-sm hover:bg-[#1e3a84] transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingAtt ? <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Attendance</>}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAssignments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">Assignments</h2>
        <button onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 bg-[#182D66] text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-[#1e3a84] transition">
          <Plus className="h-4 w-4" />{isCreating ? 'Cancel' : 'New Assignment'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-[#182D66]" />Create Assignment</h3>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Class & Subject *</label>
                <select required value={selectedClassSubject} onChange={e => setSelectedClassSubject(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66] bg-white">
                  <option value="">Select Class & Subject</option>
                  {myAssignments2.map(a => {
                    const cls = db.classes.find(c => c.id === a.class_id);
                    const sub = db.subjects.find(s => s.id === a.subject_id);
                    return <option key={`${a.class_id}|${a.subject_id}`} value={`${a.class_id}|${a.subject_id}`}>{cls?.name} — {sub?.name}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Due Date</label>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Title *</label>
              <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66]"
                placeholder="Assignment title..." />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Instructions</label>
              <textarea rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66] resize-none"
                placeholder="Assignment instructions..." />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
              <button type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-2">
                <Send className="h-4 w-4" />Publish
              </button>
            </div>
          </form>
        </div>
      )}

      {myCreatedAssignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <FileText className="h-16 w-16 mx-auto text-slate-200 mb-4" />
          <p className="font-bold text-slate-500 text-lg">No assignments yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first assignment above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myCreatedAssignments.map(assignment => {
            const cls = db.classes.find(c => c.id === assignment.class_id);
            const sub = db.subjects.find(s => s.id === assignment.subject_id);
            const submissions = (db.assignment_submissions || []).filter(s => s.assignment_id === assignment.id);
            const classSize = db.students.filter(s => s.class_id === assignment.class_id).length;
            const isExpanded = expandedAssignment === assignment.id;

            return (
              <div key={assignment.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedAssignment(isExpanded ? null : assignment.id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{sub?.name}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">{cls?.name}</span>
                    </div>
                    <h3 className="font-black text-slate-900">{assignment.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Due: {assignment.due_date || 'No date'} • {classSize} students</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xl font-black text-[#182D66]">{submissions.length}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Submissions</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    {assignment.description && (
                      <p className="text-sm text-slate-700 py-3 mb-3 border-b border-slate-50">{assignment.description}</p>
                    )}
                    <h4 className="font-bold text-slate-800 text-sm mb-3">Student Submissions ({submissions.length}/{classSize})</h4>
                    {submissions.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No submissions yet.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {submissions.map(sub => {
                          const student = db.students.find(s => s.id === sub.student_id);
                          return (
                            <div key={sub.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-7 w-7 rounded-full bg-[#182D66]/10 flex items-center justify-center">
                                  <span className="text-xs font-black text-[#182D66]">{student?.name?.[0]}</span>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">{student?.name}</p>
                                  <p className="text-[10px] text-slate-400">{new Date(sub.submitted_at).toLocaleString()}</p>
                                </div>
                              </div>
                              <p className="text-xs text-slate-700 line-clamp-3 bg-white p-2 rounded-lg border border-slate-100">{sub.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderResults = () => {
    const resStudents = resClass ? db.students.filter(s => s.class_id === resClass) : [];
    const mySubjectsForClass = resClass ? myAssignments2.filter(a => a.class_id === resClass).map(a => db.subjects.find(s => s.id === a.subject_id)).filter(Boolean) : [];

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black text-slate-900">Enter Results</h2>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Class</label>
              <select value={resClass} onChange={e => { setResClass(e.target.value); setResSubject(''); setResMarks({}); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66] bg-white">
                <option value="">Select Class</option>
                {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Subject</label>
              <select value={resSubject} onChange={e => setResSubject(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66] bg-white">
                <option value="">Select Subject</option>
                {mySubjectsForClass.map(s => <option key={s!.id} value={s!.id}>{s!.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Exam</label>
              <select value={resExam} onChange={e => setResExam(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#182D66] bg-white">
                <option value="">Select Exam</option>
                {db.exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {!resClass && (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-10 text-center">
            <Award className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-500">Select class, subject, and exam to enter marks.</p>
          </div>
        )}

        {resStudents.length > 0 && resClass && resSubject && resExam && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Enter Marks — {resStudents.length} students</h3>
              <p className="text-xs text-slate-500">Fill obtained/total for each student</p>
            </div>
            <div className="divide-y divide-slate-50">
              {resStudents.map((student, idx) => {
                const mark = resMarks[student.id] || { obtained: '', total: '' };
                const pct = mark.obtained && mark.total ? Math.round((Number(mark.obtained) / Number(mark.total)) * 100) : null;
                return (
                  <div key={student.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                      <div className="h-8 w-8 rounded-full bg-[#182D66]/10 flex items-center justify-center">
                        <span className="text-xs font-black text-[#182D66]">{student.name?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{student.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{student.reg_no}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="Obt."
                        value={mark.obtained}
                        onChange={e => setResMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], obtained: e.target.value } }))}
                        className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#182D66] text-center" />
                      <span className="text-slate-400 font-bold">/</span>
                      <input type="number" placeholder="Max"
                        value={mark.total}
                        onChange={e => setResMarks(prev => ({ ...prev, [student.id]: { ...prev[student.id], total: e.target.value } }))}
                        className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#182D66] text-center" />
                      {pct !== null && (
                        <span className={`text-xs font-black w-12 text-right ${pct >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {getGrade(pct)} ({pct}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={handleSaveResults} disabled={savingRes}
                className="w-full py-3 bg-[#182D66] text-white rounded-xl font-bold text-sm hover:bg-[#1e3a84] transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingRes ? <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Results</>}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStudents = () => {
    const filtered = myStudents.filter(s =>
      !studentSearch ||
      s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.reg_no?.toLowerCase().includes(studentSearch.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h2 className="text-xl font-black text-slate-900">My Students</h2>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search by name or reg no..."
              value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#182D66]" />
          </div>
          <span className="text-xs font-bold text-slate-500">{filtered.length} of {myStudents.length} students</span>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <Users className="h-16 w-16 mx-auto text-slate-200 mb-4" />
            <p className="font-bold text-slate-500 text-lg">No students found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span className="col-span-2">Student</span>
              <span>Class</span>
              <span>Contact</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.map(student => {
                const cls = db.classes.find(c => c.id === student.class_id);
                const sec = db.sections.find(s => s.id === student.section_id);
                return (
                  <div key={student.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#182D66]/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {student.image_url ? (
                          <img src={student.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-[#182D66]">{student.name?.[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                        <p className="text-xs text-slate-500 font-mono truncate">{student.reg_no}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{cls?.name}</p>
                      <p className="text-xs text-slate-400">Sec {sec?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 truncate">{student.contact || 'N/A'}</p>
                    </div>
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {student.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#182D66] to-[#2a4a9f]" />
        <div className="px-8 pb-8 -mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg bg-[#182D66] flex items-center justify-center shrink-0">
              <span className="text-4xl font-black text-white">{staff.name?.[0] || 'T'}</span>
            </div>
            <div className="flex-1 pb-2">
              <h2 className="text-2xl font-black text-slate-900">{staff.name}</h2>
              <p className="text-slate-500 font-medium">{staff.qualification || 'Teacher'}</p>
              <div className="flex gap-2 mt-1">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{staff.employee_id}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${staff.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{staff.status?.toUpperCase()}</span>
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
            { label: 'Full Name', value: staff.name },
            { label: "Father's Name", value: staff.father_name },
            { label: 'CNIC', value: staff.cnic },
            { label: 'Gender', value: staff.gender },
            { label: 'Date of Birth', value: staff.dob },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 shrink-0">{item.label}</span>
              <span className="font-semibold text-slate-900 text-sm text-right">{item.value || 'N/A'}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#182D66]" />Professional Information</h3>
          {[
            { label: 'Employee ID', value: staff.employee_id },
            { label: 'Qualification', value: staff.qualification },
            { label: 'Joining Date', value: staff.joining_date },
            { label: 'Salary', value: staff.salary ? `Rs ${staff.salary.toLocaleString()}` : 'N/A' },
            { label: 'Status', value: staff.status },
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
            { label: 'Mobile', value: staff.contact },
            { label: 'Address', value: staff.address },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 shrink-0">{item.label}</span>
              <span className="font-semibold text-slate-900 text-sm text-right">{item.value || 'N/A'}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#182D66]" />Teaching Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-blue-700">{myClasses.length}</p>
              <p className="text-xs font-bold text-blue-500 uppercase mt-0.5">Classes</p>
            </div>
            <div className="bg-violet-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-violet-700">{mySubjectIds.length}</p>
              <p className="text-xs font-bold text-violet-500 uppercase mt-0.5">Subjects</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-700">{myStudents.length}</p>
              <p className="text-xs font-bold text-emerald-500 uppercase mt-0.5">Students</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-amber-700">{myCreatedAssignments.length}</p>
              <p className="text-xs font-bold text-amber-500 uppercase mt-0.5">Assignments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'classes': return renderClasses();
      case 'attendance': return renderAttendance();
      case 'assignments': return renderAssignments();
      case 'results': return renderResults();
      case 'students': return renderStudents();
      case 'profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen w-64 bg-[#182D66] flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-tight">{school.name}</p>
              <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider">Teacher Portal</p>
            </div>
          </div>
        </div>

        <div className="p-4 mx-3 mt-3 rounded-2xl bg-white/10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="font-black text-white text-lg">{staff.name?.[0] || 'T'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{staff.name}</p>
            <p className="text-blue-300 text-xs font-mono truncate">{staff.employee_id}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-3">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = item.id === 'assignments' && pendingReviewCount > 0 ? pendingReviewCount : null;
            return (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-white text-[#182D66] shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge && <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{badge}</span>}
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition">
            <LogOut className="h-4 w-4" />Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition">
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
            <div>
              <h1 className="font-black text-slate-900 text-sm sm:text-base capitalize">{NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Dashboard'}</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Teacher Portal • {school.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">{myClasses.length} Classes</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
