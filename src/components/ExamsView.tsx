/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  Award,
  Search,
  Plus,
  Trash2,
  Printer,
  ChevronRight,
  BookOpen,
  Save,
  Check,
  X,
  FileDown
} from 'lucide-react';
import { DatabaseSchema, Student, Exam, ExamResult, School } from '../types';

interface ExamsViewProps {
  db: DatabaseSchema;
  schoolBranding: School;
  onRefresh: () => void;
}

export default function ExamsView({ db, schoolBranding, onRefresh }: ExamsViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState('Marks Entry');

  // Exam creation states
  const [examName, setExamName] = useState('Final Term Examination');
  const [term, setTerm] = useState('Finals');
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-05-15');

  // Marks Entry states
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  // Marks input map: { studentId: { obtained, total } }
  const [marksMap, setMarksMap] = useState<{ [sid: string]: { obtained: number; total: number } }>({});

  // Report Card selection state
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  // Load defaults
  useEffect(() => {
    if (db.exams.length > 0 && !selectedExamId) {
      setSelectedExamId(db.exams[0].id);
    }
    if (db.classes.length > 0 && !selectedClassId) {
      setSelectedClassId(db.classes[0].id);
    }
  }, [db.exams, db.classes, selectedExamId, selectedClassId]);

  useEffect(() => {
    if (selectedClassId) {
      const classSubjects = db.class_subjects.filter(cs => cs.class_id === selectedClassId);
      if (classSubjects.length > 0) {
        setSelectedSubjectId(classSubjects[0].subject_id);
      } else {
        setSelectedSubjectId('');
      }
    }
  }, [selectedClassId, db.class_subjects]);

  // Load scores whenever Exam, Class or Subject changes
  useEffect(() => {
    if (selectedExamId && selectedClassId && selectedSubjectId) {
      const results = db.exam_results.filter(
        er => er.exam_id === selectedExamId && er.subject_id === selectedSubjectId
      );
      const classStudents = db.students.filter(s => s.class_id === selectedClassId && s.status === 'active');

      const map: { [sid: string]: { obtained: number; total: number } } = {};
      classStudents.forEach(s => {
        const match = results.find(er => er.student_id === s.id);
        map[s.id] = {
          obtained: match ? match.marks_obtained : 0,
          total: match ? match.marks_total : 100
        };
      });
      setMarksMap(map);
    }
  }, [selectedExamId, selectedClassId, selectedSubjectId, db.exam_results, db.students]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examName,
          term,
          date_start: startDate,
          date_end: endDate
        })
      });

      if (res.ok) {
        alert('Academic Exam Session registered successfully!');
        onRefresh();
        setCurrentSubTab('Marks Entry');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveResultRow = async (studentId: string) => {
    const score = marksMap[studentId];
    if (!score) return;

    try {
      const res = await fetch('/api/exam-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExamId,
          student_id: studentId,
          subject_id: selectedSubjectId,
          marks_obtained: score.obtained,
          marks_total: score.total
        })
      });

      if (res.ok) {
        alert('Subject score row saved successfully!');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadPDFReport = () => {
    if (!reportStudent) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors matching the visual design
      const primaryColor = [15, 23, 42]; // slate-900 (#0f172a)
      const accentColor = [79, 70, 229]; // indigo-600 (#4f46e5)
      const lightBgColor = [248, 250, 252]; // slate-50 (#f8fafc)
      const grayText = [100, 116, 139]; // slate-500
      const borderGray = [226, 232, 240]; // slate-200

      // Outer border frame
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277); // A4 is 210 x 297

      // Header Brand Block
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(12, 12, 186, 25, 'F');

      // School Name in Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(schoolBranding.name.toUpperCase(), 105, 20, { align: 'center' });

      // School Tagline
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(schoolBranding.tagline || '', 105, 25, { align: 'center' });

      // School Address
      doc.setFontSize(8);
      doc.text(schoolBranding.address || '', 105, 30, { align: 'center' });

      // Title: Student Progress Report Card
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('STUDENT PROGRESS REPORT CARD', 105, 45, { align: 'center' });

      // Divider Line
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(1);
      doc.line(15, 48, 195, 48);

      // Student Details Section
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // slate-700
      
      // Col 1 Particulars
      doc.setFont('Helvetica', 'bold');
      doc.text('Student Name:', 18, 56);
      doc.setFont('Helvetica', 'normal');
      doc.text(reportStudent.name.toUpperCase(), 48, 56);

      doc.setFont('Helvetica', 'bold');
      doc.text('Registration ID:', 18, 62);
      doc.setFont('Helvetica', 'normal');
      doc.text(reportStudent.reg_no, 48, 62);

      doc.setFont('Helvetica', 'bold');
      doc.text("Father's Name:", 18, 68);
      doc.setFont('Helvetica', 'normal');
      doc.text(reportStudent.father_name, 48, 68);

      // Col 2 Particulars
      const className = db.classes.find(c => c.id === reportStudent.class_id)?.name || 'Primary';
      const secName = db.sections.find(sc => sc.id === reportStudent.section_id)?.name || 'A';
      
      doc.setFont('Helvetica', 'bold');
      doc.text('Class Level:', 115, 56);
      doc.setFont('Helvetica', 'normal');
      doc.text(className, 145, 56);

      doc.setFont('Helvetica', 'bold');
      doc.text('Section Name:', 115, 62);
      doc.setFont('Helvetica', 'normal');
      doc.text(secName, 145, 62);

      doc.setFont('Helvetica', 'bold');
      doc.text('Term Session:', 115, 68);
      doc.setFont('Helvetica', 'normal');
      doc.text('Final Examinations 2026', 145, 68);

      // Table Header
      let y = 78;
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, y, 180, 8, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('Subject Course Description', 18, y + 5.5);
      doc.text('Obtained Marks', 90, y + 5.5, { align: 'center' });
      doc.text('Total Marks', 130, y + 5.5, { align: 'center' });
      doc.text('Grade / Remarks', 178, y + 5.5, { align: 'right' });

      y += 8;

      // Table Rows
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      
      reportStudentResults.forEach((r) => {
        const pct = r.marks_total > 0 ? (r.marks_obtained / r.marks_total) * 100 : 0;
        const grade = pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : 'Pass';
        
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(getSubjectName(r.subject_id), 18, y + 5.5);
        
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(r.marks_obtained.toString(), 90, y + 5.5, { align: 'center' });
        doc.text(r.marks_total.toString(), 130, y + 5.5, { align: 'center' });
        
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(79, 70, 229); // Indigo for grade
        doc.text(grade, 178, y + 5.5, { align: 'right' });

        // Draw Row line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(15, y + 8, 195, y + 8);
        
        y += 8;
      });

      if (reportStudentResults.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('No marks records registered for this student under current selected term exams.', 105, y + 10, { align: 'center' });
        y += 18;
      }

      y += 5;

      // Aggregate Summary Card
      doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, y, 180, 16, 'FD');

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('Obtained Aggregate Sum:', 18, y + 6);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${totalObtainedSum} / ${totalMaxSum} Marks`, 18, y + 12);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('Final Grade Percentage:', 140, y + 6);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(`${aggregatePercentage}%`, 140, y + 12);

      y += 24;

      // Remarks Block
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 26, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Bilingual Remarks (English & Roman Urdu):', 18, y + 6);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      
      const remarksText = aggregatePercentage >= 80
        ? "Excellent performance! Ali Raza ne boht mehnat ki hai. Maintain this outstanding score."
        : aggregatePercentage >= 60
        ? "Good overall effort. Concept learning clear hai, handwriting aur grammar par mazeed tavajah dein."
        : "Needs strict parents support & regular attendance to recover scores.";
      
      const splitRemarks = doc.splitTextToSize(remarksText, 172);
      doc.text(splitRemarks, 18, y + 12);

      y += 36;

      // Signatures
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      
      doc.line(25, y + 15, 75, y + 15);
      doc.line(135, y + 15, 185, y + 15);

      doc.setFontSize(8);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('Class Teacher Signature', 50, y + 20, { align: 'center' });
      doc.text('Principal Seal & Sign', 160, y + 20, { align: 'center' });

      // Save document
      doc.save(`Report_Card_${reportStudent.name.replace(/\s+/g, '_')}_${reportStudent.reg_no}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Could not generate PDF. Please try again.');
    }
  };

  // Calculations for active report card
  const getSubjectName = (sid: string) => db.subjects.find(s => s.id === sid)?.name || 'Subject';
  const reportStudentResults = reportStudent
    ? db.exam_results.filter(er => er.student_id === reportStudent.id)
    : [];

  const totalObtainedSum = reportStudentResults.reduce((sum, r) => sum + r.marks_obtained, 0);
  const totalMaxSum = reportStudentResults.reduce((sum, r) => sum + r.marks_total, 0);
  const aggregatePercentage = totalMaxSum > 0 ? Math.round((totalObtainedSum / totalMaxSum) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Academic Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Examinations &amp; Progress Reports</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Create term exams, input student raw subject scores, and print dual-language student report cards.
        </p>

        {/* Navigation sub tabs */}
        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {[
            'Marks Entry',
            'Progress Report Cards',
            'Add New Exam Session'
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
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* -----------------------------------------------------------------------------
        SUB TAB: MARKS ENTRY SHEET
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Marks Entry' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4"
        >
          <div className="pb-4 border-b border-gray-50 flex flex-wrap gap-3 items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Subject Scores Marking Sheet</h3>

            {/* Filter selectors row */}
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="text-xs p-2 border border-gray-200 rounded bg-white font-semibold focus:outline-none"
              >
                <option value="">-- Choose Exam --</option>
                {db.exams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-xs p-2 border border-gray-200 rounded bg-white font-semibold focus:outline-none"
              >
                <option value="">-- Choose Class --</option>
                {db.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="text-xs p-2 border border-gray-200 rounded bg-white font-semibold focus:outline-none"
              >
                <option value="">-- Choose Subject --</option>
                {db.class_subjects
                  .filter(cs => cs.class_id === selectedClassId)
                  .map(cs => {
                    const s = db.subjects.find(sub => sub.id === cs.subject_id);
                    return (
                      <option key={cs.subject_id} value={cs.subject_id}>
                        {s ? s.name : 'Unknown Subject'}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Reg ID</th>
                  <th className="p-3">Obtained Marks</th>
                  <th className="p-3">Total Marks</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {db.students
                  .filter(s => s.class_id === selectedClassId && s.status === 'active')
                  .map(s => {
                    const studentScore = marksMap[s.id] || { obtained: 0, total: 100 };
                    return (
                      <tr key={s.id}>
                        <td className="p-3 font-bold text-gray-800">{s.name}</td>
                        <td className="p-3 font-mono text-gray-400 font-bold">{s.reg_no}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={studentScore.obtained}
                            onChange={e =>
                              setMarksMap({
                                ...marksMap,
                                [s.id]: { ...studentScore, obtained: Number(e.target.value) }
                              })
                            }
                            className="p-1.5 border border-gray-200 rounded w-20 text-xs font-semibold text-gray-800 font-mono"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={studentScore.total}
                            onChange={e =>
                              setMarksMap({
                                ...marksMap,
                                [s.id]: { ...studentScore, total: Number(e.target.value) }
                              })
                            }
                            className="p-1.5 border border-gray-200 rounded w-20 text-xs font-semibold text-gray-800 font-mono"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleSaveResultRow(s.id)}
                            className="inline-flex items-center gap-1.5 py-1 px-3 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-[11px] rounded transition-colors cursor-pointer"
                          >
                            <Save className="h-3 w-3" /> Save Score
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: PROGRESS REPORT CARDS (PORTRAIT A4 PRINT READY)
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Progress Report Cards' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Student Selector left column */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit space-y-4 no-print">
            <h3 className="font-bold text-gray-900 text-sm">Select Student</h3>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search student report..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full text-xs p-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {db.students
                .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                .map(s => {
                  const isCurrent = reportStudent?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setReportStudent(s)}
                      className={`p-3 rounded-lg flex justify-between items-center text-xs cursor-pointer transition-colors ${
                        isCurrent ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div>
                        <span>{s.name}</span>
                        <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{s.reg_no}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Report Card Canvas right column (Portrait A4 print layout) */}
          <div className="lg:col-span-2 flex flex-col items-center bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200">
            {reportStudent ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-2.5 no-print">
                  <button
                    onClick={handlePrintReport}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Portrait Report Card
                  </button>

                  <button
                    onClick={handleDownloadPDFReport}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Download PDF Report Card
                  </button>
                </div>

                {/* Report Portrait Sheet fits A4 */}
                <div className="w-[595px] min-h-[842px] bg-white border border-gray-200 shadow-xl rounded p-12 flex flex-col justify-between font-sans text-xs text-gray-800">
                  {/* Report Header school branding */}
                  <div className="text-center border-b-2 border-slate-900 pb-5">
                    <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
                      {schoolBranding.name}
                    </h1>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mt-1">
                      {schoolBranding.tagline}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">{schoolBranding.address}</span>
                  </div>

                  {/* Student Card details particulars */}
                  <div className="py-5 grid grid-cols-2 gap-4 border-b border-gray-100">
                    <div className="space-y-2 text-gray-600 font-medium">
                      <p>
                        Student Name: <strong className="text-slate-900 uppercase">{reportStudent.name}</strong>
                      </p>
                      <p>
                        Registration #: <strong className="text-slate-900 font-mono">{reportStudent.reg_no}</strong>
                      </p>
                      <p>
                        Father Name: <strong className="text-slate-900">{reportStudent.father_name}</strong>
                      </p>
                    </div>

                    <div className="space-y-2 text-right text-gray-600 font-medium">
                      <p>
                        Class: <strong className="text-slate-900">
                          {db.classes.find(c => c.id === reportStudent.class_id)?.name || 'Primary'}
                        </strong>
                      </p>
                      <p>
                        Section:{' '}
                        <strong className="text-slate-900">
                          {db.sections.find(sc => sc.id === reportStudent.section_id)?.name || 'A'}
                        </strong>
                      </p>
                      <p>
                        Term Session: <strong className="text-slate-900">Final Examinations 2026</strong>
                      </p>
                    </div>
                  </div>

                  {/* Results subject tabular breakdown */}
                  <div className="flex-1 py-6 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                      Subject Marks Appraisal
                    </h3>
                    
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-300">
                          <th className="p-2">Subject Course</th>
                          <th className="p-2 text-center">Marks Obtained</th>
                          <th className="p-2 text-center">Total Marks</th>
                          <th className="p-2 text-right">Grade / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                        {reportStudentResults.map(r => {
                          const pct = r.marks_total > 0 ? (r.marks_obtained / r.marks_total) * 100 : 0;
                          const grade = pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : 'Pass';

                          return (
                            <tr key={r.id}>
                              <td className="p-2 font-bold text-slate-800">{getSubjectName(r.subject_id)}</td>
                              <td className="p-2 text-center font-mono">{r.marks_obtained}</td>
                              <td className="p-2 text-center font-mono">{r.marks_total}</td>
                              <td className="p-2 text-right font-bold text-slate-700">{grade}</td>
                            </tr>
                          );
                        })}
                        {reportStudentResults.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-gray-400 italic">
                              No marks records registered for this student under current selected term exams.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Report aggregates footer box */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg flex justify-between items-center text-xs font-bold mb-6">
                    <div className="space-y-1">
                      <span className="text-slate-500 font-normal">Obtained Aggregate Sum:</span>
                      <p className="text-slate-800 font-mono text-sm">
                        {totalObtainedSum} / {totalMaxSum} Marks
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-slate-500 font-normal">Final Grade Percentage:</span>
                      <p className="text-indigo-900 text-sm font-mono">{aggregatePercentage}%</p>
                    </div>
                  </div>

                  {/* Principal comments & Signature */}
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-lg text-slate-600 font-semibold leading-relaxed">
                      <span className="text-[10px] font-bold text-indigo-800 block uppercase mb-1">
                        Principal Bilingual Remarks (English &amp; Roman Urdu):
                      </span>
                      {aggregatePercentage >= 80
                        ? "Excellent performance! Ali Raza ne boht mehnat ki hai. Maintain this outstanding score."
                        : aggregatePercentage >= 60
                        ? "Good overall effort. Concept learning clear hai, handwriting aur grammar par mazeed tavajah dein."
                        : "Needs strict parents support & regular attendance to recover scores."}
                    </div>

                    <div className="pt-8 flex justify-between items-center text-[10px] text-gray-400 font-semibold">
                      <div className="text-center w-28 border-t border-gray-200 pt-1">
                        Class Teacher
                      </div>
                      <div className="text-center w-28 border-t border-gray-200 pt-1">
                        Principal Seal &amp; Sign
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-gray-400 text-xs italic">
                Please select a student from the directory checklist to load dynamic portal reports.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: CREATE EXAM SESSION
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Add New Exam Session' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6">
            <h3 className="font-bold text-gray-900 text-base">Setup New Exam Cycle</h3>
            <p className="text-xs text-gray-400 mt-0.5">Register mid-term or terminal exams to map score rosters.</p>
          </div>

          <form onSubmit={handleCreateExam} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Description Name</label>
              <input
                type="text"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Academic Term Category</label>
              <input
                type="text"
                placeholder="e.g. Finals, Midterms"
                value={term}
                onChange={e => setTerm(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow transition-colors cursor-pointer"
            >
              Activate Exam Schedule
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
