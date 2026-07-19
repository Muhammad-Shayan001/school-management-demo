/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  UserPlus,
  Users,
  Search,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  UserCheck,
  DollarSign,
  Briefcase,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { DatabaseSchema, Student, Class, Section, Family } from '../types';
import { addToast } from './Toast';

interface AdmissionsViewProps {
  db: DatabaseSchema;
  onRefresh: () => void;
  onNavigate: (page: string, tab?: string) => void;
  initialTab?: string;
}

export default function AdmissionsView({ db, onRefresh, onNavigate, initialTab = 'All Students' }: AdmissionsViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState<string>(initialTab);

  // Add Student form states
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('2016-01-01');
  const [contact, setContact] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [admissionFee, setAdmissionFee] = useState(2250);
  const [setManualFee, setSetManualFee] = useState(false);
  const [manualTuitionFee, setManualTuitionFee] = useState(0);
  const [billingMode, setBillingMode] = useState<'individual' | 'family'>('individual');
  const [familyId, setFamilyId] = useState('');

  // Search and directory filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [billingFilter, setBillingFilter] = useState<string>('all');

  // Certificate selection state
  const [certSelections, setCertSelections] = useState<Record<string, string>>({});

  // Load defaults
  useEffect(() => {
    if (db.classes.length > 0) {
      if (!classId) setClassId(db.classes[0].id);
    }
  }, [db.classes, classId]);

  useEffect(() => {
    if (classId) {
      const classSecs = db.sections.filter(s => s.class_id === classId);
      if (classSecs.length > 0) {
        setSectionId(classSecs[0].id);
      } else {
        setSectionId('');
      }
    }
  }, [classId, db.sections]);

  // Derived calculations
  const targetClass = db.classes.find(c => c.id === classId);
  const classBaseFee = targetClass?.name.includes('8') ? 3500 : 2500;
  const effectiveMonthlyFee = setManualFee ? manualTuitionFee : classBaseFee;

  // -----------------------------------------------------------------------------
  // FORM SUBMISSION
  // -----------------------------------------------------------------------------
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !fatherName.trim() || !contact.trim() || !classId || !sectionId) {
      addToast('warning', 'Please fill all mandatory fields including Class and Section mapping.');
      return;
    }

    try {
      const payload = {
        name: studentName.trim(),
        father_name: fatherName.trim(),
        gender,
        dob,
        contact: contact.trim(),
        alt_phone: altPhone.trim(),
        address: address.trim(),
        guardian_name: guardianName.trim() || fatherName.trim(),
        guardian_contact: guardianContact.trim() || contact.trim(),
        class_id: classId,
        section_id: sectionId,
        admission_fee: admissionFee,
        manual_monthly_fee: setManualFee ? manualTuitionFee : 0,
        billing_mode: billingMode,
        family_id: billingMode === 'family' ? familyId : '',
        status: 'active'
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addToast('success', 'Student registered successfully!');
        // Reset states
        setStudentName('');
        setFatherName('');
        setContact('');
        setAltPhone('');
        setAddress('');
        setGuardianName('');
        setGuardianContact('');
        setSetManualFee(false);
        setManualTuitionFee(0);
        setBillingMode('individual');
        setFamilyId('');
        
        onRefresh();
        setCurrentSubTab('All Students');
      } else {
        const errorData = await res.json();
        addToast('error', errorData.error || 'Failed to register student.');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'An error occurred during student registration.');
    }
  };

  const handlePrintCertificate = (certType: string) => {
    const studentId = certSelections[certType];
    if (!studentId) {
      addToast('warning', 'Please select a student first.');
      return;
    }
    const student = db.students.find(s => s.id === studentId);
    if (!student) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${certType} - ${student.name}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; margin: 0; color: #000; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 20px 0; text-align: center; text-decoration: underline; }
            .content { font-size: 18px; line-height: 2; text-align: justify; margin: 40px 0; }
            .footer { margin-top: 100px; display: flex; justify-content: space-between; font-size: 16px; }
            .sign-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>School Management System</h1>
            <p>Excellence in Education</p>
          </div>
          <div class="title">${certType}</div>
          <div class="content">
            <p>This is to certify that <strong>${student.name}</strong>, 
            ${student.gender === 'female' ? 'daughter' : 'son'} of <strong>${student.father_name}</strong>, 
            registration number <strong>${student.reg_no}</strong>, is a bonafide student of this institution.</p>
            <p>According to our records, the student's date of birth is <strong>${new Date(student.dob).toLocaleDateString()}</strong>.</p>
            <p>This certificate is issued upon the request of the student/guardian on ${new Date().toLocaleDateString()}.</p>
          </div>
          <div class="footer">
            <div class="sign-line">Date</div>
            <div class="sign-line">Principal Signature</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* 2.3 Workspace header layout */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Admissions Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Student Directory &amp; Registration</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Student directory manage karein, new student admissions process karein, sibling groups link karein.
        </p>

        {/* Sub-tabs buttons */}
        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {[
            'All Students',
            'Register New Student',
            'Import Spreadsheet',
            'Certificates'
          ].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentSubTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                currentSubTab === tab
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab === 'All Students' ? `All Students (${db.students.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* -----------------------------------------------------------------------------
        SUB TAB: REGISTER NEW STUDENT FORM
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Register New Student' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 text-base">New Student Admission Form</h3>
              <p className="text-xs text-gray-400 mt-0.5">Enter complete personal, guardian, and billing mapping details.</p>
            </div>
            <span className="text-xs font-mono font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded">
              RS-2026-XXXX
            </span>
          </div>

          <form onSubmit={handleRegisterStudent} className="space-y-6 max-w-4xl">
            {/* Section 1: Personal Info */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-l-2 border-slate-800 pl-2 mb-4">
                1. Student Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="e.g. Ali Raza"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Father's Full Name *</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={e => setFatherName(e.target.value)}
                    placeholder="e.g. Raza Ahmed"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Guardian Contact Phone *</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="e.g. 03001112233"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Alternate Phone</label>
                  <input
                    type="text"
                    value={altPhone}
                    onChange={e => setAltPhone(e.target.value)}
                    placeholder="e.g. 03035608778"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Physical Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Model Town, Lahore, Pakistan"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Emergency Contact Person</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={e => setGuardianName(e.target.value)}
                    placeholder="Leave empty for father"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Class, Section & Fee Mapping */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-l-2 border-slate-800 pl-2 mb-4">
                2. Class, Section &amp; Fee Mapping
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Class Level *</label>
                  <select
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                    required
                  >
                    {db.classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Section *</label>
                  <select
                    value={sectionId}
                    onChange={e => setSectionId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Section --</option>
                    {db.sections
                      .filter(s => s.class_id === classId)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          Section {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Policy Mode</label>
                  <select
                    value={billingMode}
                    onChange={e => setBillingMode(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="individual">Individual Billing (Akela child)</option>
                    <option value="family">Family Combined Billing (Sath siblings)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {billingMode === 'family' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Sibling Family Group *</label>
                    <select
                      value={familyId}
                      onChange={e => setFamilyId(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Sibling Family --</option>
                      {db.families.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.guardian_name} ({f.family_key})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Class Standard Fee (Rs) - Read Only</label>
                  <input
                    type="text"
                    value={`Rs. ${classBaseFee}`}
                    disabled
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">One-time Admission Fee (Rs)</label>
                  <input
                    type="number"
                    value={admissionFee}
                    onChange={e => setAdmissionFee(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Manual Fee Scholarship Overwrite block */}
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 max-w-2xl">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setManualFee}
                    onChange={e => setSetManualFee(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-gray-700">
                    Set manual monthly tuition fee for this student (Scholarship / Special discounts)
                  </span>
                </label>

                {setManualFee && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pl-6 space-y-2"
                  >
                    <label className="block text-xs font-semibold text-gray-700">Manual Tuition Fee Override (Rs) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500 for discounted tuition"
                      value={manualTuitionFee}
                      onChange={e => setManualTuitionFee(Number(e.target.value))}
                      className="text-xs p-2 border border-gray-200 rounded-md focus:outline-none font-mono"
                      required
                    />
                    <span className="text-[10px] text-gray-400 block">
                      Ye field manual scholarship ya fees discount ke liye check karr ke override karein.
                    </span>
                  </motion.div>
                )}

                <div className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-200/50">
                  Effective Tuition Fee: <strong className="text-slate-800 font-mono">Rs. {effectiveMonthlyFee} / month</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-3 bg-gray-950 hover:bg-gray-800 text-white font-medium text-xs rounded-lg shadow-md transition-all cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Register Student &amp; Create Portal Logins
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: ALL STUDENTS DIRECTORY LIST
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'All Students' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Enrolled Students</span>
              <span className="text-xl font-extrabold text-gray-800 font-mono mt-0.5 block">{db.students.length}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Active Status</span>
              <span className="text-xl font-extrabold text-green-600 font-mono mt-0.5 block">
                {db.students.filter(s => s.status === 'active').length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Inactive</span>
              <span className="text-xl font-extrabold text-amber-500 font-mono mt-0.5 block">
                {db.students.filter(s => s.status === 'inactive').length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Withdrawn / Left</span>
              <span className="text-xl font-extrabold text-gray-400 font-mono mt-0.5 block">
                {db.students.filter(s => s.status === 'left').length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-gray-100 text-center col-span-2 md:col-span-1">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Sibling Billing</span>
              <span className="text-xl font-extrabold text-indigo-600 font-mono mt-0.5 block">
                {db.students.filter(s => s.billing_mode === 'family').length}
              </span>
            </div>
          </div>

          {/* Search and Filters row */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Reg No, Name, Father, Contact, Class..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs p-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-gray-50/50"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
              >
                <option value="all">All Classes</option>
                {db.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="left">Left</option>
              </select>

              {/* Billing mode Filter */}
              <select
                value={billingFilter}
                onChange={e => setBillingFilter(e.target.value)}
                className="text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
              >
                <option value="all">All Billing Modes</option>
                <option value="individual">Individual</option>
                <option value="family">Family Group</option>
              </select>

              <button
                onClick={() => setCurrentSubTab('Register New Student')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Student
              </button>
            </div>
          </div>

          {/* Grid Layout of Student Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.students
              .filter(s => {
                const matchesSearch =
                  s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.father_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.reg_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.contact.includes(searchQuery);
                const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
                const matchesClass = classFilter === 'all' || s.class_id === classFilter;
                const matchesBilling = billingFilter === 'all' || s.billing_mode === billingFilter;
                return matchesSearch && matchesStatus && matchesClass && matchesBilling;
              })
              .map(s => {
                const cls = db.classes.find(c => c.id === s.class_id);
                const sec = db.sections.find(sc => sc.id === s.section_id);
                const fam = db.families.find(f => f.id === s.family_id);

                return (
                  <motion.div
                    key={s.id}
                    layout
                    className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: name & status */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-gray-400 font-bold tracking-wider uppercase">
                            {s.reg_no}
                          </span>
                          <h4 className="font-bold text-gray-800 text-sm mt-0.5">{s.name}</h4>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            s.status === 'active'
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : s.status === 'inactive'
                              ? 'bg-amber-50 border-amber-200 text-amber-600'
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Card Body fields */}
                      <div className="mt-3.5 space-y-1.5 text-xs text-gray-500 font-medium">
                        <div className="flex justify-between">
                          <span>Father's Name:</span>
                          <span className="text-gray-800">{s.father_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Class &amp; Sec:</span>
                          <span className="text-indigo-700 font-semibold">
                            {cls ? cls.name : 'Unassigned'} - {sec ? sec.name : 'A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Billing Mode:</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.billing_mode === 'family'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {s.billing_mode === 'family' ? 'Family (Linked)' : 'Individual'}
                          </span>
                        </div>
                        {s.billing_mode === 'family' && fam && (
                          <div className="flex justify-between text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100/50">
                            <span>Guardian:</span>
                            <span className="text-slate-700 font-bold">{fam.guardian_name}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-gray-100/50">
                          <span>Phone:</span>
                          <span className="text-gray-800 font-mono font-semibold">{s.contact}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2 no-print">
                      <button
                        onClick={() => onNavigate('Fee Management', 'Collect Fee')}
                        className="flex-1 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[11px] rounded-lg text-center transition-colors cursor-pointer"
                      >
                        Collect Fee
                      </button>
                      <button
                        onClick={() => onNavigate('ID Cards')}
                        className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold text-[11px] rounded-lg text-center transition-colors cursor-pointer"
                      >
                        View ID Card
                      </button>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: IMPORT SPREADSHEET
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Import Spreadsheet' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6">
            <h3 className="font-bold text-gray-900 text-base">Bulk Spreadsheet Import</h3>
            <p className="text-xs text-gray-400 mt-0.5">Upload Excel/CSV file to bulk register students instantly.</p>
          </div>

          <div className="max-w-xl p-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center text-center">
            <FileSpreadsheet className="h-12 w-12 text-gray-300 mb-3" />
            <span className="text-sm font-semibold text-gray-700 block">Drag &amp; Drop Spreadsheet Here</span>
            <span className="text-xs text-gray-400 mt-0.5 block">CSV, XLS, or XLSX supported format</span>
            
            <input type="file" className="hidden" id="excel-file-import" />
            <label htmlFor="excel-file-import" className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer">
              Choose Spreadsheet File
            </label>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: CERTIFICATES
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Certificates' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6">
            <h3 className="font-bold text-gray-900 text-base">Certificate Generation</h3>
            <p className="text-xs text-gray-400 mt-0.5">Generate character, bonafide, and leaving certificates.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Character Certificate', 'Bonafide Certificate', 'School Leaving Certificate'].map(certType => (
              <div key={certType} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all">
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">{certType}</h4>
                <p className="text-xs text-gray-500 mt-1 mb-4">Select student to generate {certType.toLowerCase()} with official format.</p>
                
                <div className="space-y-3">
                  <select 
                    value={certSelections[certType] || ''}
                    onChange={(e) => setCertSelections({...certSelections, [certType]: e.target.value})}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="">-- Select Student --</option>
                    {db.students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.reg_no})</option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={() => handlePrintCertificate(certType)}
                    className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Generate & Print PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
