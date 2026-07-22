/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Printer,
  Compass,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  MapPin,
  Flame
} from 'lucide-react';
import { DatabaseSchema, Student, School } from '../types';

interface IdentityCardsViewProps {
  db: DatabaseSchema;
  schoolBranding: School;
}

export default function IdentityCardsView({ db, schoolBranding }: IdentityCardsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Default select first student if exists
  React.useEffect(() => {
    if (db.students.length > 0 && !selectedStudent) {
      setSelectedStudent(db.students[0]);
    }
  }, [db.students, selectedStudent]);

  const handlePrintIDCard = () => {
    window.print();
  };

  const cls = selectedStudent ? db.classes.find(c => c.id === selectedStudent.class_id) : null;
  const sec = selectedStudent ? db.sections.find(sc => sc.id === selectedStudent.section_id) : null;

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Admissions &amp; Badges Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Student Smart ID Cards</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Pocket-sized physical standard ID cards generate karein, barcode, class sections, and emergency signatures preview karein.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Search Selector */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Select Student</h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student for ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {db.students
              .filter(s => {
                const str = `${s.name} ${s.reg_no}`.toLowerCase();
                return str.includes(searchQuery.toLowerCase());
              })
              .map(s => {
                const isCurrent = selectedStudent?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setIsFlipped(false);
                    }}
                    className={`p-3 rounded-lg flex justify-between items-center text-xs cursor-pointer transition-colors ${
                      isCurrent ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div>
                      <span>{s.name}</span>
                      <span className="block text-[10px] text-gray-400 font-mono font-semibold mt-0.5">{s.reg_no}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Column: ID Card design canvas */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-8 space-y-6">
          {selectedStudent ? (
            <div className="space-y-6 flex flex-col items-center">
              {/* Pocket dimensions container box */}
              <div className="relative w-[340px] h-[215px] perspective">
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  className="w-full h-full relative preserve-3d shadow-xl rounded-2xl bg-white border border-slate-200 overflow-hidden font-sans text-xs"
                >
                  {/* FRONT SIDE */}
                  <div className="absolute inset-0 w-full h-full bg-white flex flex-col backface-hidden">
                    {/* Top Stripe banner */}
                    <div className="bg-slate-900 text-white p-2.5 flex items-center justify-between border-b border-orange-500">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide block leading-none">
                          {schoolBranding.name}
                        </span>
                        <span className="text-[7px] text-slate-300 block font-semibold leading-none mt-0.5">
                          {schoolBranding.tagline}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-bold bg-slate-800 text-orange-400 px-1.5 py-0.5 rounded leading-none">
                        SESSION 2026
                      </span>
                    </div>

                    {/* Body contents */}
                    <div className="p-3.5 flex gap-3 flex-1 items-center">
                      {/* Photo Placeholder */}
                      <div className="w-16 h-20 bg-slate-100 rounded-lg border-2 border-slate-200 flex items-center justify-center flex-shrink-0 text-gray-300">
                        <span className="text-[9px] font-bold uppercase font-mono">Photo</span>
                      </div>

                      {/* Credentials */}
                      <div className="space-y-1 text-slate-700 flex-1">
                        <span className="text-[9px] font-mono text-slate-400 font-bold block leading-none uppercase">
                          Reg No: {selectedStudent.reg_no}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-tight uppercase">
                          {selectedStudent.name}
                        </h4>

                        <div className="space-y-0.5 text-[10px] font-semibold text-slate-500">
                          <p>
                            Father: <strong className="text-slate-700">{selectedStudent.father_name}</strong>
                          </p>
                          <p>
                            Class Level: <strong className="text-indigo-700">{cls ? cls.name : 'Primary'}</strong>
                          </p>
                          <p>
                            Assigned Sec: <strong className="text-indigo-700">Section {sec ? sec.name : 'A'}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer barcode graphic block */}
                    <div className="bg-slate-50 border-t border-slate-100 p-2 flex items-center justify-between">
                      <span className="text-[7px] font-mono font-bold text-gray-400 uppercase">
                        ||||| | ||||| || ||| | |||
                      </span>
                      <span className="text-[8px] font-bold text-indigo-700 uppercase tracking-widest font-mono">
                        STUDENT BADGE
                      </span>
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div className="absolute inset-0 w-full h-full bg-slate-900 text-white flex flex-col justify-between p-4 backface-hidden rotateY-180">
                    <div className="space-y-2 text-left">
                      <span className="text-[9px] font-extrabold text-orange-400 tracking-wider uppercase block border-b border-slate-800 pb-1">
                        EMERGENCY INFORMATION
                      </span>
                      
                      <div className="space-y-1.5 text-[9px] text-slate-300 font-semibold">
                        <p className="flex items-center gap-1.5">
                          <Smartphone className="h-3 w-3 text-slate-500" /> Emergency Phone: {selectedStudent.contact}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-500" /> Address: {selectedStudent.address || 'Model Town, Lahore'}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Flame className="h-3 w-3 text-slate-500" /> Blood Group: O-Positive (O+)
                        </p>
                      </div>
                    </div>

                    {/* Principal stamp back-side */}
                    <div className="flex justify-between items-end">
                      <div className="text-[8px] text-slate-400">
                        <span>Card Valid: 2026-2027</span>
                        <span className="block mt-0.5 font-mono">www.ranaschool.edu.pk</span>
                      </div>
                      <div className="text-center w-24 border-t border-slate-700 pt-1 text-[8px] text-slate-400">
                        Principal Seal
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Toggles */}
              <div className="flex gap-3 no-print">
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer bg-white"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Flip Card View
                </button>
                <button
                  onClick={handlePrintIDCard}
                  className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Active Badge
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-400 text-xs italic">
              Please register students to generate visual ID badges.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
