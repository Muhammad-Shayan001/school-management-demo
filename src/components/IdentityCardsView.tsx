import React, { useState, useRef, useEffect } from 'react';
import { DatabaseSchema, Student, Staff, School } from '../types';
import { Search, Printer, Download, UserCircle, QrCode, ShieldCheck, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface IdentityCardsViewProps {
  db: DatabaseSchema;
  schoolBranding: School;
}

export default function IdentityCardsView({ db, schoolBranding }: IdentityCardsViewProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-select first item when tab changes or data loads
  useEffect(() => {
    if (activeTab === 'students' && !selectedStudent && db.students.length > 0) {
      setSelectedStudent(db.students[0]);
    }
    if (activeTab === 'staff' && !selectedStaff && db.staff.length > 0) {
      setSelectedStaff(db.staff[0]);
    }
  }, [activeTab, db.students, db.staff]);

  const filteredStudents = db.students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.reg_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaff = db.staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const downloadPNG = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `${activeTab === 'students' ? selectedStudent?.id_card_no : selectedStaff?.id_card_no}_ID_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    }
    setIsExporting(false);
  };

  const downloadPDF = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 20;
      const renderWidth = pdfWidth - (margin * 2);
      const renderHeight = (imgProps.height * renderWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', margin, margin, renderWidth, renderHeight);
      pdf.save(`${activeTab === 'students' ? selectedStudent?.id_card_no : selectedStaff?.id_card_no}_ID_Card.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    }
    setIsExporting(false);
  };

  // Render logic for the actual card
  const renderCard = () => {
    const isStudent = activeTab === 'students';
    const user = isStudent ? selectedStudent : selectedStaff;
    if (!user) return null;

    let theme = 'from-[#182D66] to-[#25459a]'; // Student Blue
    let label = 'Student';
    let sub = '';
    
    if (!isStudent) {
      const st = user as Staff;
      if (st.role === 'teacher') { theme = 'from-emerald-700 to-emerald-500'; label = 'Teacher'; sub = st.department || 'Academic'; }
      else if (st.role === 'admin') { theme = 'from-violet-700 to-violet-500'; label = 'Administrator'; }
      else if (st.role === 'principal') { theme = 'from-rose-800 to-rose-600'; label = 'Principal'; }
      else if (st.role === 'super_admin') { theme = 'from-slate-900 to-slate-700'; label = 'Super Admin'; }
    } else {
      const cls = db.classes.find(c => c.id === (user as Student).class_id);
      const sec = db.sections.find(s => s.id === (user as Student).section_id);
      sub = `${cls?.name || ''} - Sec ${sec?.name || ''}`;
    }

    return (
      <div ref={cardRef} className="flex flex-col sm:flex-row gap-6 w-full max-w-[700px] mx-auto print:block print:max-w-none">
        
        {/* FRONT SIDE */}
        <div className="relative w-full sm:w-1/2 aspect-[6/9] bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col print:shadow-none print:border-slate-300 print:mb-8">
          {/* Header Gradient */}
          <div className={`h-[35%] bg-gradient-to-br ${theme} relative`}>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent" />
            <div className="p-5 flex justify-between items-start relative z-10">
              <div className="text-white">
                <h2 className="font-black text-lg leading-tight tracking-tight shadow-sm">{schoolBranding.name}</h2>
                <p className="text-[10px] font-semibold tracking-widest uppercase opacity-90">{label} ID Card</p>
              </div>
              <ShieldCheck className="h-6 w-6 text-white/80" />
            </div>
            
            {/* Profile Photo floating over edge */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="h-24 w-24 rounded-full border-4 border-white shadow-md bg-slate-100 overflow-hidden flex items-center justify-center">
                {(user as any).image_url ? (
                  <img src={(user as any).image_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-16 w-16 text-slate-300" />
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 px-6 pt-16 pb-6 flex flex-col text-center">
            <h3 className="font-black text-xl text-slate-900 tracking-tight">{user.name}</h3>
            <p className="text-sm font-bold text-slate-500 mt-1">{sub}</p>
            <div className="inline-block mx-auto mt-2 px-3 py-1 bg-slate-100 rounded-full">
              <p className="text-xs font-mono font-bold text-slate-700 tracking-widest">{user.id_card_no}</p>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-y-3 gap-x-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Blood Group</p>
                <p className="text-xs font-bold text-slate-900">{(user as any).blood_group || 'O+'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">DOB</p>
                <p className="text-xs font-bold text-slate-900">{(user as any).dob || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">{isStudent ? 'Roll No' : 'Emp ID'}</p>
                <p className="text-xs font-bold text-slate-900">{isStudent ? (user as Student).reg_no : (user as Staff).employee_id}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Emergency</p>
                <p className="text-xs font-bold text-slate-900">{(user as any).emergency_contact || (user as any).contact || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="relative w-full sm:w-1/2 aspect-[6/9] bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col print:shadow-none print:border-slate-300">
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">Scan for Verification & Attendance</p>
            
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
              {user.id_card_no ? (
                <QRCodeCanvas value={user.id_card_no} size={150} level="H" includeMargin={true} />
              ) : (
                <div className="w-[150px] h-[150px] bg-slate-100 flex items-center justify-center rounded-xl">
                  <QrCode className="h-10 w-10 text-slate-400" />
                </div>
              )}
            </div>

            <div className="mt-6 w-full space-y-3">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                <MapPin className="h-5 w-5 text-slate-500 shrink-0" />
                <p className="text-[10px] font-medium text-slate-700 leading-tight">{schoolBranding.address}</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                <Phone className="h-5 w-5 text-slate-500 shrink-0" />
                <p className="text-[10px] font-medium text-slate-700">{schoolBranding.phone}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 p-4 text-center">
            <p className="text-[9px] font-medium text-slate-300 leading-relaxed">
              This card is the property of {schoolBranding.name}. If found, please return to the school administration. Use of this card is governed by school policies.
            </p>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <QrCode className="h-5 w-5 text-indigo-700" />
              </div>
              ID Card Studio
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Design, generate, and print smart ID cards with QR attendance integration.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={downloadPDF} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-[#182D66] hover:bg-[#1e3a84] text-white rounded-xl font-bold text-sm transition disabled:opacity-50">
              <Download className="h-4 w-4" /> {isExporting ? 'Exporting...' : 'PDF'}
            </button>
            <button onClick={downloadPNG} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition disabled:opacity-50">
              <Download className="h-4 w-4" /> {isExporting ? 'Exporting...' : 'PNG'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 print:block">
        {/* Left Panel: Search & List */}
        <div className="w-full lg:w-80 shrink-0 space-y-4 print:hidden">
          <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => { setActiveTab('students'); setSearchQuery(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'students' ? 'bg-[#182D66] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              Students
            </button>
            <button onClick={() => { setActiveTab('staff'); setSearchQuery(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'staff' ? 'bg-[#182D66] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              Staff
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#182D66] shadow-sm" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{activeTab === 'students' ? filteredStudents.length : filteredStaff.length} Found</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {activeTab === 'students' ? (
                filteredStudents.map(student => (
                  <button key={student.id} onClick={() => setSelectedStudent(student)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition ${selectedStudent?.id === student.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                    <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                      {student.image_url ? <img src={student.image_url} alt="" className="h-full w-full object-cover" /> : <UserCircle className="h-full w-full text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                      <p className="text-xs font-mono text-slate-500 truncate">{student.id_card_no}</p>
                    </div>
                    {selectedStudent?.id === student.id && <CheckCircle2 className="h-4 w-4 text-indigo-600 ml-auto" />}
                  </button>
                ))
              ) : (
                filteredStaff.map(st => (
                  <button key={st.id} onClick={() => setSelectedStaff(st)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition ${selectedStaff?.id === st.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                    <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                      {st.image_url ? <img src={st.image_url} alt="" className="h-full w-full object-cover" /> : <UserCircle className="h-full w-full text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{st.name}</p>
                      <p className="text-xs font-mono text-slate-500 truncate">{st.id_card_no}</p>
                    </div>
                    {selectedStaff?.id === st.id && <CheckCircle2 className="h-4 w-4 text-indigo-600 ml-auto" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: ID Card Preview */}
        <div className="flex-1 bg-slate-100/50 border border-slate-200 rounded-3xl p-8 flex items-center justify-center overflow-x-auto print:p-0 print:border-none print:bg-transparent">
          {renderCard()}
        </div>
      </div>
      
      {/* Global CSS for printing specifically the ID card */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
