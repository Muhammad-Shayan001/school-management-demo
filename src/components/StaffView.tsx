/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  UserCheck,
  Briefcase,
  Search,
  Plus,
  Trash2,
  Phone,
  Bookmark,
  Award,
  DollarSign
} from 'lucide-react';
import { DatabaseSchema, Staff, Class, Subject } from '../types';
import { addToast } from './Toast';

interface StaffViewProps {
  db: DatabaseSchema;
  onRefresh: () => void;
}

export default function StaffView({ db, onRefresh }: StaffViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState('Staff Directory');

  // Add staff states
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [cnic, setCnic] = useState('');
  const [contact, setContact] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('1990-01-01');
  const [joiningDate, setJoiningDate] = useState('2026-03-01');
  const [salary, setSalary] = useState(30000);
  const [qualification, setQualification] = useState('');
  const [address, setAddress] = useState('');

  // Assign assignments states
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  // Add staff handler
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cnic.trim() || !contact.trim()) {
      addToast('warning', 'Mandatory fields (Name, CNIC, Phone) are required.');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        father_name: fatherName.trim(),
        cnic: cnic.trim(),
        contact: contact.trim(),
        gender,
        dob,
        joining_date: joiningDate,
        salary,
        qualification: qualification.trim(),
        address: address.trim()
      };

      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setName('');
        setFatherName('');
        setCnic('');
        setContact('');
        setQualification('');
        setAddress('');
        onRefresh();
        addToast('success', 'Staff profile added successfully!');
        setCurrentSubTab('Staff Directory');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add assignment handler
  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !selectedClassId || !selectedSubjectId) {
      addToast('warning', 'Please map all fields (Staff, Class, Subject).');
      return;
    }

    try {
      const res = await fetch('/api/staff-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          class_id: selectedClassId,
          subject_id: selectedSubjectId
        })
      });

      if (res.ok) {
        addToast('success', 'Staff mapping assigned successfully!');
        setSelectedStaffId('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate or delete this employee record?')) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Staff Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Staff Directory &amp; Class Assignments</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Teachers directory manage karein, class assignments aur lecture subjects map karein.
        </p>

        {/* Sub tabs navigation */}
        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {[
            'Staff Directory',
            'Add New Employee',
            'Assign Class Lecture'
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
              {tab === 'Staff Directory' ? `Staff Directory (${db.staff.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* -----------------------------------------------------------------------------
        SUB TAB: STAFF DIRECTORY GRID LIST
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Staff Directory' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Search bar */}
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Employee ID, Name, CNIC, Contact..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          {/* Teacher listing grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {db.staff
              .filter(s => {
                const searchStr = `${s.name} ${s.cnic} ${s.employee_id} ${s.contact}`.toLowerCase();
                return searchStr.includes(searchQuery.toLowerCase());
              })
              .map(s => {
                const myAssignments = db.staff_assignments.filter(sa => sa.staff_id === s.id);

                return (
                  <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono text-gray-400 font-bold tracking-wider uppercase">
                            {s.employee_id}
                          </span>
                          <h4 className="font-bold text-gray-800 text-sm mt-0.5">{s.name}</h4>
                          <span className="text-[10px] text-gray-400 italic block mt-0.5">
                            {s.father_name && `d/o or s/o ${s.father_name}`}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[9px] font-bold rounded-full">
                          ACTIVE
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-1.5 text-xs text-gray-500 font-medium">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-gray-400" /> Degree:
                          </span>
                          <span className="text-gray-800 font-semibold">{s.qualification || 'B.A / B.Sc'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-400" /> Phone:
                          </span>
                          <span className="text-gray-800 font-mono font-semibold">{s.contact}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-gray-400" /> CNIC:
                          </span>
                          <span className="text-gray-800 font-mono">{s.cnic}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-gray-100/50">
                          <span>Monthly Salary:</span>
                          <span className="text-emerald-700 font-bold font-mono">Rs. {s.salary.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Display assigned classes/subjects */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Assigned Classes &amp; Subjects ({myAssignments.length})
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {myAssignments.length === 0 ? (
                            <span className="text-[10px] text-gray-400 italic">No assigned classes.</span>
                          ) : (
                            myAssignments.map((sa, sIdx) => {
                              const cls = db.classes.find(c => c.id === sa.class_id);
                              const subj = db.subjects.find(sub => sub.id === sa.subject_id);
                              return (
                                <span key={sIdx} className="bg-orange-50 text-orange-800 border border-orange-100 rounded text-[9px] font-bold px-2 py-0.5">
                                  {cls ? cls.name : 'Class'} - {subj ? subj.name : 'Subject'}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end no-print">
                      <button
                        onClick={() => handleDeleteStaff(s.id)}
                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded border border-transparent hover:border-red-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: ADD NEW EMPLOYEE FORM
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Add New Employee' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6">
            <h3 className="font-bold text-gray-900 text-base">New Employee Information</h3>
            <p className="text-xs text-gray-400 mt-0.5">Create a teacher profile with wage rates and login credentials.</p>
          </div>

          <form onSubmit={handleAddStaff} className="space-y-4 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Nida Fatima"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Father Name / Guardian</label>
                <input
                  type="text"
                  placeholder="e.g. Aslam Khan"
                  value={fatherName}
                  onChange={e => setFatherName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">CNIC Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 35202-1234567-8"
                  value={cnic}
                  onChange={e => setCnic(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone *</label>
                <input
                  type="text"
                  placeholder="e.g. 03214567890"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Salary (Rs) *</label>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  value={salary}
                  onChange={e => setSalary(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Professional Qualification</label>
                <input
                  type="text"
                  placeholder="e.g. M.Sc Mathematics, B.Ed"
                  value={qualification}
                  onChange={e => setQualification(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Physical Address</label>
              <textarea
                placeholder="Lahore, Punjab, Pakistan"
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-gray-950 hover:bg-gray-800 text-white font-medium text-xs rounded-lg shadow transition-all cursor-pointer"
              >
                Save Employee Profile
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: ASSIGN CLASS LECTURE
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Assign Class Lecture' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6">
            <h3 className="font-bold text-gray-900 text-base">Assign Class &amp; Subjects to Teacher</h3>
            <p className="text-xs text-gray-400 mt-0.5">Map active teachers to their respective subject lecture assignments.</p>
          </div>

          <form onSubmit={handleAddAssignment} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Staff Teacher</label>
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                required
              >
                <option value="">-- Choose Teacher --</option>
                {db.staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Class Level</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                required
              >
                <option value="">-- Choose Class --</option>
                {db.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Subject</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                required
              >
                <option value="">-- Choose Subject --</option>
                {db.subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow transition-all cursor-pointer"
            >
              Assign Lecture Duty
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
