/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  Trash2,
  Phone,
  FileText,
  Search,
  CreditCard,
  X,
  Printer,
  Calendar
} from 'lucide-react';
import { DatabaseSchema, Family, Student, School } from '../types';
import { addToast } from './Toast';

interface FamiliesViewProps {
  db: DatabaseSchema;
  schoolBranding: School;
  onRefresh: () => void;
  onNavigate: (page: string, tab?: string) => void;
}

export default function FamiliesView({ db, schoolBranding, onRefresh, onNavigate }: FamiliesViewProps) {
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sibling combined voucher modal states
  const [selectedFamilyForVoucher, setSelectedFamilyForVoucher] = useState<Family | null>(null);

  // Compute stats
  const totalFamiliesCount = db.families.length;
  const registeredGuardians = new Set(db.families.map(f => f.guardian_name)).size;
  
  // Combine pending dues across all families
  const combinedPendingAmount = db.families.reduce((sum, f) => {
    const familyStuds = db.students.filter(s => s.family_id === f.id && s.status === 'active');
    const pendingSum = familyStuds.reduce((studSum, s) => {
      const studsFeeHeads = db.fee_heads.filter(fh => fh.student_id === s.id && fh.status === 'PENDING');
      return studSum + studsFeeHeads.reduce((fhSum, fh) => fhSum + fh.pending_amount, 0);
    }, 0);
    return sum + pendingSum;
  }, 0);

  // -----------------------------------------------------------------------------
  // SAVE FAMILY
  // -----------------------------------------------------------------------------
  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianContact.trim()) {
      addToast('warning', 'Please fill Guardian Name and Guardian Contact.');
      return;
    }

    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_name: guardianName.trim(),
          guardian_contact: guardianContact.trim(),
          note: note.trim()
        })
      });

      if (res.ok) {
        setGuardianName('');
        setGuardianContact('');
        setNote('');
        onRefresh();
        addToast('success', 'Family Sibling Group registered successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFamily = async (id: string) => {
    if (!confirm('Are you sure you want to delete this family? This will revert children billing to Individual.')) return;
    try {
      const res = await fetch(`/api/families/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Admissions &amp; Sibling Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Family Sibling Portals</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Group siblings together to enable consolidated family billing invoices and printed vouchers.
        </p>
      </div>

      {/* Main Form and Stats Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add Sibling family */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Register Family Sibling Head</h3>
          <form onSubmit={handleSaveFamily} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Guardian Full Name *</label>
              <input
                type="text"
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
                placeholder="e.g. Raza Ahmed"
                className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Guardian Contact Phone *</label>
              <input
                type="text"
                value={guardianContact}
                onChange={e => setGuardianContact(e.target.value)}
                placeholder="e.g. 03001112233"
                className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Internal Billing Note</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Sibling discount, pays via cash..."
                rows={2}
                className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Save Sibling Group
            </button>
          </form>
        </div>

        {/* Right column: Stats and List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Family Groups</span>
              <span className="text-xl font-extrabold text-gray-800 font-mono mt-0.5 block">{totalFamiliesCount}</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Combined Outstanding Dues</span>
              <span className="text-xl font-extrabold text-rose-600 font-mono mt-0.5 block">
                Rs. {combinedPendingAmount.toLocaleString()}
              </span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase">Registered Guardians</span>
              <span className="text-xl font-extrabold text-slate-700 font-mono mt-0.5 block">{registeredGuardians}</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Family Key, Guardian Name, Sibling Student name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          {/* Families List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.families
              .filter(f => {
                const siblings = db.students.filter(s => s.family_id === f.id);
                const searchStr = `${f.guardian_name} ${f.family_key} ${siblings.map(s => s.name).join(' ')}`.toLowerCase();
                return searchStr.includes(searchQuery.toLowerCase());
              })
              .map(f => {
                const familyStuds = db.students.filter(s => s.family_id === f.id && s.status === 'active');
                
                // Compute combined pending dues
                const familyPendingDues = familyStuds.reduce((studSum, s) => {
                  const studsFeeHeads = db.fee_heads.filter(fh => fh.student_id === s.id && fh.status === 'PENDING');
                  return studSum + studsFeeHeads.reduce((fhSum, fh) => fhSum + fh.pending_amount, 0);
                }, 0);

                return (
                  <div key={f.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-mono">
                            Family Sibling Portal
                          </span>
                          <h4 className="font-bold text-gray-800 text-sm mt-1">{f.guardian_name}</h4>
                        </div>
                        <span className={`text-xs font-mono font-bold ${familyPendingDues > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          Rs. {familyPendingDues.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 space-y-1">
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {f.guardian_contact}
                        </p>
                        <p className="font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-[10px] w-fit">
                          {f.family_key}
                        </p>
                      </div>

                      {/* Display mapped siblings chips */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Linked Siblings ({familyStuds.length})
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {familyStuds.length === 0 ? (
                            <span className="text-[10px] text-gray-400 italic">No sibling mapped yet. Link under admissions.</span>
                          ) : (
                            familyStuds.map(s => {
                              const cls = db.classes.find(c => c.id === s.class_id);
                              return (
                                <span key={s.id} className="bg-slate-50 border border-slate-100 rounded px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                  {s.name} ({cls ? cls.name : 'Unknown'})
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2">
                      <button
                        onClick={() => setSelectedFamilyForVoucher(f)}
                        className="flex-1 inline-flex justify-center items-center gap-1.5 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Voucher
                      </button>
                      <button
                        onClick={() => handleDeleteFamily(f.id)}
                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded border border-transparent hover:border-red-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------------------
        MODAL: COMBINED SIBLING VOUCHER (7.1)
      ----------------------------------------------------------------------------- */}
      <AnimatePresence>
        {selectedFamilyForVoucher && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl"
            >
              {/* Modal controls - Top bar */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl no-print">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-gray-500" /> Sibling Family Combined Fee Voucher
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintTrigger}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Voucher (Landscape)
                  </button>
                  <button
                    onClick={() => setSelectedFamilyForVoucher(null)}
                    className="p-1.5 hover:bg-gray-200 text-gray-500 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Printable Area: Fits landscape copy */}
              <div className="p-8 overflow-y-auto print-break-after flex-1 bg-white font-sans">
                <div className="grid grid-cols-2 gap-8 divide-x-2 divide-dashed divide-gray-300">
                  {/* Guardian Copy & School Copy side-by-side loop */}
                  {['GUARDIAN COPY', 'SCHOOL COPY'].map((copyType, idx) => {
                    const familyStudents = db.students.filter(s => s.family_id === selectedFamilyForVoucher.id && s.status === 'active');
                    
                    // Fee totals calculations
                    const expectedTotal = familyStudents.reduce((sum, s) => {
                      const dues = db.fee_heads.filter(fh => fh.student_id === s.id && fh.status === 'PENDING');
                      return sum + dues.reduce((fhSum, fh) => fhSum + fh.expected_amount, 0);
                    }, 0);

                    const pendingTotal = familyStudents.reduce((sum, s) => {
                      const dues = db.fee_heads.filter(fh => fh.student_id === s.id && fh.status === 'PENDING');
                      return sum + dues.reduce((fhSum, fh) => fhSum + fh.pending_amount, 0);
                    }, 0);

                    const paidTotal = expectedTotal - pendingTotal;

                    return (
                      <div key={copyType} className={`px-4 space-y-4 ${idx === 1 ? 'pl-8' : ''}`}>
                        {/* School branding header */}
                        <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                          <div>
                            <span className="text-xs font-extrabold text-indigo-700 tracking-wide uppercase">
                              {schoolBranding.name}
                            </span>
                            <span className="block text-[9px] text-gray-400 mt-0.5">{schoolBranding.tagline}</span>
                            <span className="block text-[8px] text-gray-400 mt-0.5">{schoolBranding.address}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            {copyType}
                          </span>
                        </div>

                        {/* Title block */}
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                              Family Sibling Combined Fee Voucher
                            </h3>
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5 block">
                              Voucher #: FV-20260424-{selectedFamilyForVoucher.id.replace('fam_', '')}
                            </span>
                          </div>
                          <div className="text-right text-[9px] text-gray-400 font-semibold font-mono">
                            <span>Issue: 24-04-2026</span>
                            <span className="block">Due Date: 30-04-2026</span>
                          </div>
                        </div>

                        {/* Guardian details boxes */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-semibold grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-normal">Guardian Head</span>
                            <span className="text-slate-800">{selectedFamilyForVoucher.guardian_name}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block font-normal">Guardian Phone</span>
                            <span className="text-slate-800 font-mono">{selectedFamilyForVoucher.guardian_contact}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-normal">Family Key</span>
                            <span className="text-slate-800 font-mono text-[10px]">{selectedFamilyForVoucher.family_key}</span>
                          </div>
                        </div>

                        {/* Sibling Student list tabular details */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                            Fee Breakdown Per Sibling
                          </span>
                          <table className="w-full text-[10px] text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                                <th className="p-1">Sibling</th>
                                <th className="p-1">Class-Sec</th>
                                <th className="p-1">Monthly Tuition</th>
                                <th className="p-1 text-right">Dues Pending</th>
                              </tr>
                            </thead>
                            <tbody>
                              {familyStudents.map(s => {
                                const cls = db.classes.find(c => c.id === s.class_id);
                                const sec = db.sections.find(sc => sc.id === s.section_id);
                                
                                // Fetch child pending dues
                                const sDues = db.fee_heads.filter(fh => fh.student_id === s.id && fh.status === 'PENDING');
                                const totalPendingFH = sDues.reduce((sumFH, fh) => sumFH + fh.pending_amount, 0);

                                return (
                                  <tr key={s.id} className="border-b border-gray-100">
                                    <td className="p-1 font-bold text-gray-700">{s.name}</td>
                                    <td className="p-1">
                                      {cls ? cls.name : 'Grade 1'} - {sec ? sec.name : 'A'}
                                    </td>
                                    <td className="p-1 font-mono">
                                      Rs. {s.manual_monthly_fee > 0 ? s.manual_monthly_fee : 2500}
                                    </td>
                                    <td className="p-1 font-mono font-bold text-gray-800 text-right">
                                      Rs. {totalPendingFH.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Consolidated voucher ledger summary */}
                        <div className="p-3 border border-indigo-100 bg-indigo-50/20 rounded-lg flex justify-between items-center text-xs font-bold">
                          <span className="text-indigo-800 font-semibold flex items-center gap-1">
                            Total Combined Balance Pending:
                          </span>
                          <span className="text-indigo-900 font-mono text-sm">
                            Rs. {pendingTotal.toLocaleString()}
                          </span>
                        </div>

                        {/* Signatures & Stamps */}
                        <div className="pt-6 flex justify-between items-center text-[10px] text-gray-400 font-medium">
                          <div className="text-center w-28 border-t border-gray-200 pt-1">
                            Guardian Stamp / Sign
                          </div>
                          <div className="text-center w-28 border-t border-gray-200 pt-1">
                            Principal Signature
                          </div>
                        </div>

                        {/* Reminder Note */}
                        <p className="text-[8px] text-gray-400 italic text-center">
                          Please submit within 4 days. Sibling discount combined voucher rules applied.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
