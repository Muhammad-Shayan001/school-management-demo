import React from 'react';
import { DatabaseSchema, School, Student, Assignment, AssignmentSubmission } from '../types';
import { LogOut, GraduationCap, CalendarDays, Wallet, UserCircle, CheckCircle2, AlertCircle, FileText, Send, Check } from 'lucide-react';
import { addToast } from './Toast';

interface StudentDashboardViewProps {
  user: any;
  db: DatabaseSchema | null;
  school: School;
  onLogout: () => void;
}

export default function StudentDashboardView({ user, db: initialDb, school, onLogout }: StudentDashboardViewProps) {
  const [db, setDb] = React.useState<DatabaseSchema | null>(initialDb);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'assignments'>('overview');
  const [submissionText, setSubmissionText] = React.useState('');
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  if (!db) return <div>Loading...</div>;

  const student = db.students.find(s => s.id === user.id) || ({} as Student);
  const cls = db.classes.find(c => c.id === student.class_id);
  const section = db.sections.find(s => s.id === student.section_id);
  const feeHeads = db.fee_heads.filter(f => f.student_id === student.id);
  const pendingFees = feeHeads.filter(f => f.status === 'PENDING').reduce((acc, curr) => acc + curr.pending_amount, 0);
  
  const classAssignments = (db.assignments || []).filter(a => a.class_id === student.class_id);
  const mySubmissions = (db.assignment_submissions || []).filter(s => s.student_id === student.id);

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
        // Update local state so it reflects immediately
        const updatedSubs = [...mySubmissions.filter(s => s.assignment_id !== assignmentId), newSub];
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

  return (
    <div className="flex-1 overflow-auto bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#182D66] text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">{school.name}</h1>
            <p className="text-xs text-slate-500">Student Portal</p>
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
        <div className="rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700 via-[#182D66] to-[#0f1d38] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 border-4 border-white/20 backdrop-blur-md overflow-hidden">
                {student.image_url ? (
                  <img src={student.image_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-10 w-10 text-white" />
                )}
              </div>
              <div>
                <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-1">Welcome back,</p>
                <h2 className="text-3xl font-bold">{student.name || 'Student'}</h2>
                <p className="text-blue-100 mt-1 flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-semibold">REG: {student.reg_no}</span>
                  <span className="font-medium text-sm">{cls?.name} • Sec {section?.name}</span>
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[120px]">
                <p className="text-3xl font-black text-white">Rs {pendingFees.toLocaleString()}</p>
                <p className="text-xs text-blue-200 font-medium mt-1 uppercase tracking-wider">Pending Dues</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[120px]">
                <p className="text-3xl font-black text-white">{classAssignments.length - mySubmissions.length}</p>
                <p className="text-xs text-blue-200 font-medium mt-1 uppercase tracking-wider">Assignments Due</p>
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
                <Wallet className="h-5 w-5 text-[#182D66]" />
                Fee Details
              </h3>
              
              {feeHeads.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                  <Wallet className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No fee records found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feeHeads.map(fee => (
                    <div key={fee.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white transition">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${fee.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {fee.status === 'PAID' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{fee.title}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Due: {fee.due_date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">Rs {fee.expected_amount.toLocaleString()}</p>
                        <p className={`text-xs font-bold mt-0.5 ${fee.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {fee.status}
                        </p>
                      </div>
                    </div>
                  ))}
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
                  <p className="text-slate-500 text-xs font-medium">Father's Name</p>
                  <p className="font-semibold text-slate-900">{student.father_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium">Contact Number</p>
                  <p className="font-semibold text-slate-900">{student.contact || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium">Address</p>
                  <p className="font-semibold text-slate-900">{student.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium">Admission Date</p>
                  <p className="font-semibold text-slate-900">{student.admission_date || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-[#182D66]" />
              My Assignments
            </h3>

            {classAssignments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">No assignments posted for your class yet.</div>
            ) : (
              <div className="space-y-6">
                {classAssignments.map(assignment => {
                  const sub = db.subjects.find(s => s.id === assignment.subject_id);
                  const teacher = db.staff.find(t => t.id === assignment.teacher_id);
                  const submission = mySubmissions.find(s => s.assignment_id === assignment.id);
                  const isSubmitting = submittingId === assignment.id;
                  
                  return (
                    <div key={assignment.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="p-5 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-lg">{assignment.title}</h4>
                            <p className="text-xs font-semibold text-[#182D66] mt-1">{sub?.name} • By {teacher?.name || 'Teacher'}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${submission ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {submission ? 'Submitted' : 'Pending'}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 mt-4">{assignment.description}</p>
                        <p className="text-xs text-slate-500 mt-4 font-medium flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Due Date: {assignment.due_date || 'No due date'}</p>
                      </div>

                      <div className="p-5 bg-slate-50 border-t border-slate-200">
                        {submission && !isSubmitting ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600"/> Your Submission</h5>
                              <button onClick={() => { setSubmittingId(assignment.id); setSubmissionText(submission.content); }} className="text-xs text-[#182D66] font-semibold hover:underline">Edit Submission</button>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">{submission.content}</div>
                            <p className="text-[10px] text-slate-400 mt-2">Submitted on {new Date(submission.submitted_at).toLocaleString()}</p>
                          </div>
                        ) : (
                          <form onSubmit={(e) => handleSubmitAssignment(e, assignment.id)} className="space-y-3">
                            <h5 className="font-bold text-slate-800 text-sm">Submit your work</h5>
                            <textarea
                              required
                              rows={4}
                              value={submittingId === assignment.id ? submissionText : ''}
                              onChange={(e) => {
                                if (submittingId !== assignment.id) {
                                  setSubmittingId(assignment.id);
                                }
                                setSubmissionText(e.target.value);
                              }}
                              onClick={() => {
                                if (submittingId !== assignment.id) {
                                  setSubmittingId(assignment.id);
                                  setSubmissionText(submission?.content || '');
                                }
                              }}
                              className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#182D66]"
                              placeholder="Type your assignment response here..."
                            ></textarea>
                            <div className="flex justify-end gap-2">
                              {isSubmitting && (
                                <button type="button" onClick={() => { setSubmittingId(null); setSubmissionText(''); }} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg">Cancel</button>
                              )}
                              <button type="submit" disabled={!isSubmitting || !submissionText.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 disabled:opacity-50"><Send className="h-4 w-4" /> Submit Work</button>
                            </div>
                          </form>
                        )}
                      </div>
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
