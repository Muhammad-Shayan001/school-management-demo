/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Cake,
  Download,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Printer,
  ArrowUpRight
} from 'lucide-react';
import { DatabaseSchema, Student, Staff, Family } from '../types';
import { addToast } from './Toast';

interface AdditionalViewProps {
  db: DatabaseSchema;
  schoolBranding: any;
}

export default function AdditionalView({ db, schoolBranding }: AdditionalViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState('Vouchers');
  
  // States for extractors
  const [extractType, setExtractType] = useState<'students' | 'staff'>('students');
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'contact']);
  
  // States for WhatsApp
  const [waMessage, setWaMessage] = useState('');
  const [waTarget, setWaTarget] = useState('all_parents');

  // Helpers
  const students = db.students || [];
  const staff = db.staff || [];
  const families = db.families || [];
  const today = new Date();

  // Find upcoming birthdays (next 30 days)
  const getUpcomingBirthdays = () => {
    const list: any[] = [];
    
    const checkBirthday = (person: any, type: string) => {
      if (!person.dob) return;
      const dob = new Date(person.dob);
      const bdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      
      // If birthday already passed this year, look at next year
      if (bdayThisYear < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) {
        bdayThisYear.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = Math.abs(bdayThisYear.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) {
        list.push({ ...person, type, daysLeft: diffDays, bdayString: bdayThisYear.toDateString() });
      }
    };

    students.filter(s => s.status === 'active').forEach(s => checkBirthday(s, 'Student'));
    staff.filter(s => s.status === 'active').forEach(s => checkBirthday(s, 'Staff'));

    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const birthdays = getUpcomingBirthdays();

  // ---------------------------------------------------------------------------
  // PDF GENERATOR — Students List / Staff Directory / Fee Defaulters / Financial Summary
  // ---------------------------------------------------------------------------
  const addPdfHeader = (doc: jsPDF, title: string) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolBranding?.name || 'School', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 23);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.setDrawColor(200);
    doc.line(14, 31, 196, 31);
    return 39;
  };

  const drawTableRow = (doc: jsPDF, y: number, cols: string[], widths: number[], bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    let x = 14;
    cols.forEach((c, i) => {
      doc.text(String(c), x, y, { maxWidth: widths[i] - 2 });
      x += widths[i];
    });
    return y + 7;
  };

  const ensureSpace = (doc: jsPDF, y: number) => {
    if (y > 280) {
      doc.addPage();
      return 20;
    }
    return y;
  };

  const handleGenerateStudentsListPDF = () => {
    const doc = new jsPDF();
    let y = addPdfHeader(doc, 'Students List — Class-wise Directory');
    const widths = [45, 20, 30, 40, 40];
    y = drawTableRow(doc, y, ['Name', 'Class', 'Reg No.', 'Guardian', 'Contact'], widths, true);
    doc.line(14, y - 5, 196, y - 5);
    [...students]
      .filter(s => s.status === 'active')
      .sort((a, b) => a.class_id.localeCompare(b.class_id))
      .forEach(s => {
        y = ensureSpace(doc, y);
        const cls = db.classes.find(c => c.id === s.class_id)?.name || s.class_id;
        y = drawTableRow(doc, y, [s.name, cls, s.reg_no, s.guardian_name || '-', s.contact || '-'], widths);
      });
    doc.save(`Students_List_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('success', 'Students List PDF downloaded.');
  };

  const handleGenerateStaffDirectoryPDF = () => {
    const doc = new jsPDF();
    let y = addPdfHeader(doc, 'Staff Directory — Complete Employee List');
    const widths = [45, 30, 35, 30, 30];
    y = drawTableRow(doc, y, ['Name', 'Employee ID', 'Contact', 'Joined', 'Salary (Rs.)'], widths, true);
    doc.line(14, y - 5, 196, y - 5);
    staff.filter(s => s.status === 'active').forEach(s => {
      y = ensureSpace(doc, y);
      y = drawTableRow(doc, y, [s.name, s.employee_id, s.contact || '-', s.joining_date || '-', (s.salary || 0).toLocaleString()], widths);
    });
    doc.save(`Staff_Directory_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('success', 'Staff Directory PDF downloaded.');
  };

  const handleGenerateFeeDefaultersPDF = () => {
    const doc = new jsPDF();
    let y = addPdfHeader(doc, 'Fee Defaulters — Students with Pending Dues');
    const widths = [50, 25, 40, 35];
    y = drawTableRow(doc, y, ['Student', 'Class', 'Guardian Contact', 'Pending (Rs.)'], widths, true);
    doc.line(14, y - 5, 196, y - 5);
    let grandTotal = 0;
    students.filter(s => s.status === 'active').forEach(s => {
      const pending = db.fee_heads
        .filter(fh => fh.student_id === s.id && fh.status === 'PENDING')
        .reduce((sum, fh) => sum + fh.pending_amount, 0);
      if (pending <= 0) return;
      grandTotal += pending;
      y = ensureSpace(doc, y);
      const cls = db.classes.find(c => c.id === s.class_id)?.name || s.class_id;
      y = drawTableRow(doc, y, [s.name, cls, s.guardian_contact || s.contact || '-', pending.toLocaleString()], widths);
    });
    y = ensureSpace(doc, y);
    y += 3;
    doc.line(14, y - 5, 196, y - 5);
    y = drawTableRow(doc, y, ['', '', 'Total Outstanding', grandTotal.toLocaleString()], widths, true);
    doc.save(`Fee_Defaulters_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('success', 'Fee Defaulters PDF downloaded.');
  };

  const handleGenerateFinancialSummaryPDF = () => {
    const doc = new jsPDF();
    let y = addPdfHeader(doc, 'Financial Summary');

    const totalCollected = (db.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = (db.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalOtherIncome = (db.income || []).reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalPending = (db.fee_heads || [])
      .filter(fh => fh.status === 'PENDING')
      .reduce((sum, fh) => sum + fh.pending_amount, 0);
    const net = totalCollected + totalOtherIncome - totalExpenses;

    const widths = [90, 60];
    y = drawTableRow(doc, y, ['Metric', 'Amount (Rs.)'], widths, true);
    doc.line(14, y - 5, 196, y - 5);
    y = drawTableRow(doc, y, ['Total Fee Collected', totalCollected.toLocaleString()], widths);
    y = drawTableRow(doc, y, ['Other Income', totalOtherIncome.toLocaleString()], widths);
    y = drawTableRow(doc, y, ['Total Expenses', totalExpenses.toLocaleString()], widths);
    y = drawTableRow(doc, y, ['Pending Dues (Outstanding)', totalPending.toLocaleString()], widths);
    y += 3;
    doc.line(14, y - 5, 196, y - 5);
    y = drawTableRow(doc, y, ['Net (Collected + Other Income − Expenses)', net.toLocaleString()], widths, true);

    doc.save(`Financial_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('success', 'Financial Summary PDF downloaded.');
  };

  const handlePrintVoucher = (family: Family) => {
    const familyStudents = students.filter(s => s.family_id === family.id);
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Draw two copies (School Copy, Parent Copy)
    const drawCopy = (xOffset: number, title: string) => {
      doc.setDrawColor(0);
      doc.rect(xOffset, 10, 140, 190);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolBranding.name || 'Rana School', xOffset + 70, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(title, xOffset + 70, 26, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`Family: ${family.guardian_name} (${family.family_key})`, xOffset + 5, 35);
      
      let y = 45;
      let totalDue = 0;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Student', xOffset + 5, y);
      doc.text('Particulars', xOffset + 60, y);
      doc.text('Amount', xOffset + 120, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      familyStudents.forEach(st => {
        const dues = db.fee_heads.filter(fh => fh.student_id === st.id && fh.status === 'PENDING');
        dues.forEach(d => {
          doc.text(st.name.substring(0, 20), xOffset + 5, y);
          doc.text(d.title.substring(0, 30), xOffset + 60, y);
          doc.text(`Rs. ${d.pending_amount}`, xOffset + 120, y);
          totalDue += d.pending_amount;
          y += 5;
        });
      });
      
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Payable:', xOffset + 80, y);
      doc.text(`Rs. ${totalDue}`, xOffset + 120, y);
      
      doc.text('Signature:', xOffset + 5, 185);
      doc.line(xOffset + 25, 185, xOffset + 65, 185);
    };

    drawCopy(5, 'SCHOOL COPY');
    drawCopy(150, 'PARENT COPY');
    
    // Open print dialog
    doc.autoPrint();
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
  };

  const studentFields = ['name', 'reg_no', 'father_name', 'contact', 'address', 'dob'];
  const staffFields = ['name', 'employee_id', 'contact', 'cnic', 'salary', 'qualification'];

  const handleExportData = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += selectedFields.join(",") + "\n";
    
    const source = extractType === 'students' ? students : staff;
    source.forEach((item: any) => {
      const row = selectedFields.map(f => `"${item[f] || ''}"`);
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${extractType}_extract.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Additional Tools
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">School Utilities Workspace</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Manage family vouchers, track birthdays, generate bulk PDFs, extract data, and send WhatsApp messages.
        </p>

        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {['Vouchers', 'Birthdays', 'PDF Generator', 'Data Extractor', 'WhatsApp Center'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentSubTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                currentSubTab === tab
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {currentSubTab === 'Vouchers' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Family Fee Vouchers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <th className="p-3">Family Key</th>
                  <th className="p-3">Guardian</th>
                  <th className="p-3">Students</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {families.map(f => {
                  const famStudents = students.filter(s => s.family_id === f.id);
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-gray-500 font-bold">{f.family_key}</td>
                      <td className="p-3 font-semibold text-gray-800">{f.guardian_name}</td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {famStudents.map(s => <span key={s.id} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px]">{s.name}</span>)}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handlePrintVoucher(f)} className="px-3 py-1 bg-gray-900 text-white rounded text-[10px] hover:bg-gray-800 flex items-center gap-1 ml-auto">
                          <Printer className="h-3 w-3" /> Print Voucher
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {currentSubTab === 'Birthdays' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-6">
            <Cake className="h-5 w-5 text-pink-500" />
            <h3 className="font-bold text-gray-900 text-sm">Upcoming Birthdays (Next 30 Days)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {birthdays.length === 0 ? (
              <p className="text-gray-500 text-sm col-span-3">No upcoming birthdays.</p>
            ) : (
              birthdays.map((b, i) => (
                <div key={i} className="border border-pink-100 bg-pink-50/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{b.name}</h4>
                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">{b.type}</span>
                    <p className="text-xs text-gray-500 mt-1">{b.bdayString}</p>
                  </div>
                  <div className="text-center">
                    <span className="block text-xl font-black text-pink-600">{b.daysLeft}</span>
                    <span className="text-[9px] text-pink-400 uppercase font-bold">Days Left</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {currentSubTab === 'PDF Generator' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Students List PDF', desc: 'Class-wise student directory with contacts.', handler: handleGenerateStudentsListPDF },
            { title: 'Staff Directory PDF', desc: 'Complete employee list with salaries.', handler: handleGenerateStaffDirectoryPDF },
            { title: 'Fee Defaulters PDF', desc: 'List of students with pending dues.', handler: handleGenerateFeeDefaultersPDF },
            { title: 'Financial Summary PDF', desc: 'Monthly income and expense summary.', handler: handleGenerateFinancialSummaryPDF }
          ].map((r, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{r.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
              <button onClick={r.handler} className="mt-4 text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:text-indigo-800 cursor-pointer">
                Generate <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {currentSubTab === 'Data Extractor' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Custom Data Extraction</h3>
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => { setExtractType('students'); setSelectedFields(['name', 'contact']); }}
              className={`px-4 py-2 rounded text-xs font-bold ${extractType === 'students' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Students Extractor
            </button>
            <button
              onClick={() => { setExtractType('staff'); setSelectedFields(['name', 'contact']); }}
              className={`px-4 py-2 rounded text-xs font-bold ${extractType === 'staff' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Staff Extractor
            </button>
          </div>

          <div className="mb-6">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Select Fields to Export</h4>
            <div className="flex flex-wrap gap-2">
              {(extractType === 'students' ? studentFields : staffFields).map(f => (
                <label key={f} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(f)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedFields([...selectedFields, f]);
                      else setSelectedFields(selectedFields.filter(x => x !== f));
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-gray-700 capitalize">{f.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleExportData} className="px-5 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 flex items-center gap-2">
            <Download className="h-4 w-4" /> Download Selected as CSV
          </button>
        </motion.div>
      )}

      {currentSubTab === 'WhatsApp Center' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Compose Broadcast</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Target Audience</label>
                <select value={waTarget} onChange={e => setWaTarget(e.target.value)} className="w-full text-xs p-2.5 border border-gray-200 rounded focus:outline-none bg-white">
                  <option value="all_parents">All Parents</option>
                  <option value="defaulters">Fee Defaulters</option>
                  <option value="staff">All Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message Content</label>
                <textarea
                  value={waMessage}
                  onChange={e => setWaMessage(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded focus:outline-none h-32 resize-none"
                  placeholder="Dear Parents, reminder that school will remain closed tomorrow..."
                />
              </div>
              <button type="button" onClick={() => addToast('info', 'Broadcast simulated! WhatsApp API not configured.')} className="w-full py-3 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:bg-[#1DA851] flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" /> Send via WhatsApp
              </button>
            </form>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 flex items-center justify-center text-center">
            <div>
              <div className="h-16 w-16 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">WhatsApp API Ready</h3>
              <p className="text-xs text-gray-500 mt-2 max-w-xs">Connect your Twilio or Meta WhatsApp Business API keys in settings to enable live broadcast messaging.</p>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
