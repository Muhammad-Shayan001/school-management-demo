import React from 'react';
import { DatabaseSchema, School, Staff, Assignment, AssignmentSubmission } from '../types';
import { LogOut, BookOpen, Clock, Users, CalendarDays, BookMarked, UserCircle, Plus, FileText, Send, CheckCircle2 } from 'lucide-react';
import { addToast } from './Toast';

interface TeacherDashboardViewProps {
  user: any;
  db: DatabaseSchema | null;
  school: School;
  onLogout: () => void;
}

export default function TeacherDashboardView({ user, db: initialDb, school, onLogout }: TeacherDashboardViewProps) {
  const [db, setDb] = React.useState<DatabaseSchema | null>(initialDb);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'assignments'>('overview');
  const [isCreating, setIsCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [newDueDate, setNewDueDate] = React.useState('');
  const [selectedClassSubject, setSelectedClassSubject] = React.useState('');
  const [selectedAssignmentView, setSelectedAssignmentView] = React.useState<string | null>(null);

  if (!db) return <div>Loading...</div>;

  const staff = db.staff.find(s => s.id === user.id) || ({} as Staff);
  const assignments = db.staff_assignments.filter(a => a.staff_id === staff.id);
  const myClassesCount = new Set(assignments.map(a => a.class_id)).size;
  const myAssignments = (db.assignments || []).filter(a => a.teacher_id === staff.id);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassSubject || !newTitle) {
      addToast('Please fill all required fields.', 'error');
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
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        addToast('Assignment created successfully!', 'success');
      } else {
        addToast('Failed to create assignment.', 'error');
      }
    } catch (err) {
      addToast('Network error.', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#182D66] text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">{school.name}</h1>
            <p className="text-xs text-slate-500">Teacher Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Welcome Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#182D66] to-[#25459a] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 border-4 border-white/30 backdrop-blur-md">
                <UserCircle className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium uppercase tracking-widest mb-1">Welcome back,</p>
                <h2 className="text-3xl font-bold">{staff.name || 'Teacher'}</h2>
                <p className="text-blue-200 mt-1 flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs">EMP ID: {staff.employee_id}</span>
                  <span>{staff.qualification}</span>
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[120px]">
                <p className="text-3xl font-black text-white">{myClassesCount}</p>
                <p className="text-xs text-blue-200 font-medium mt-1 uppercase tracking-wider">Classes</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[120px]">
                <p className="text-3xl font-black text-white">{myAssignments.length}</p>
                <p className="text-xs text-blue-200 font-medium mt-1 uppercase tracking-wider">Assignments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-slate-200 max-w-fit">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'overview' ? 'bg-[#182D66] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Overview</button>
          <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'assignments' ? 'bg-[#182D66] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Assignments</button>
        </div>

        {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-[#182D66]" />
                My Assigned Subjects
              </h3>
              
              {assignments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                  <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No subjects assigned yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {assignments.map(a => {
                    const cls = db.classes.find(c => c.id === a.class_id);
                    const sub = db.subjects.find(s => s.id === a.subject_id);
                    return (
                      <div key={`${a.class_id}-${a.subject_id}`} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{sub?.name || 'Unknown'}</p>
                          <p className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full inline-block mt-1">
                            {cls?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-[#182D66]" />
                Profile Details
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs font-medium">Contact Number</p>
                  <p className="font-semibold text-slate-900">{staff.contact || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium">CNIC</p>
                  <p className="font-semibold text-slate-900">{staff.cnic || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium">Address</p>
                  <p className="font-semibold text-slate-900">{staff.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium">Joining Date</p>
                  <p className="font-semibold text-slate-900">{staff.joining_date || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#182D66]" />
                Manage Assignments
              </h3>
              <button onClick={() => setIsCreating(!isCreating)} className="px-4 py-2 bg-[#182D66] text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-[#1f3a84] transition">
                <Plus className="h-4 w-4" /> New Assignment
              </button>
            </div>

            {isCreating && (
              <form onSubmit={handleCreateAssignment} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="font-semibold text-slate-800">Create New Assignment</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class & Subject</label>
                    <select required value={selectedClassSubject} onChange={e => setSelectedClassSubject(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg">
                      <option value="">Select...</option>
                      {assignments.map(a => {
                        const cls = db.classes.find(c => c.id === a.class_id);
                        const sub = db.subjects.find(s => s.id === a.subject_id);
                        return <option key={`${a.class_id}|${a.subject_id}`} value={`${a.class_id}|${a.subject_id}`}>{cls?.name} - {sub?.name}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input type="date" required value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg" placeholder="e.g. Chapter 3 Questions" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instructions / Description</label>
                  <textarea rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full text-sm p-2 border border-slate-300 rounded-lg" placeholder="Enter assignment details here..."></textarea>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"><Send className="h-4 w-4" /> Publish</button>
                </div>
              </form>
            )}

            {myAssignments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">You haven't published any assignments yet.</div>
            ) : (
              <div className="space-y-4">
                {myAssignments.map(assignment => {
                  const cls = db.classes.find(c => c.id === assignment.class_id);
                  const sub = db.subjects.find(s => s.id === assignment.subject_id);
                  const submissions = (db.assignment_submissions || []).filter(s => s.assignment_id === assignment.id);
                  const isViewing = selectedAssignmentView === assignment.id;
                  
                  return (
                    <div key={assignment.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition" onClick={() => setSelectedAssignmentView(isViewing ? null : assignment.id)}>
                        <div>
                          <h4 className="font-bold text-slate-900">{assignment.title}</h4>
                          <p className="text-xs font-medium text-slate-500 mt-1">{cls?.name} • {sub?.name} • Due: {assignment.due_date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{submissions.length} Submissions</span>
                        </div>
                      </div>
                      
                      {isViewing && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200">
                          <p className="text-sm text-slate-700 mb-4">{assignment.description}</p>
                          <h5 className="font-bold text-slate-800 text-sm mb-3">Student Submissions</h5>
                          {submissions.length === 0 ? (
                            <p className="text-xs text-slate-500">No submissions yet.</p>
                          ) : (
                            <div className="grid sm:grid-cols-2 gap-3">
                              {submissions.map(subm => {
                                const st = db.students.find(s => s.id === subm.student_id);
                                return (
                                  <div key={subm.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                                    <p className="font-bold text-xs text-slate-900">{st?.name || 'Unknown Student'}</p>
                                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{subm.content}</p>
                                    <p className="text-[10px] text-slate-400 mt-2">Submitted: {new Date(subm.submitted_at).toLocaleString()}</p>
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
        )}

      </div>
    </div>
  );
}
