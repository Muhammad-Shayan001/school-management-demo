/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  DollarSign,
  Search,
  Check,
  Printer,
  X,
  CreditCard,
  Plus,
  BookOpen,
  Receipt,
  FileText,
  TrendingUp,
  AlertCircle,
  FileDown
} from 'lucide-react';
import { DatabaseSchema, Student, FeeHead, Payment, School } from '../types';
import { addToast } from './Toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface FeeManagementViewProps {
  db: DatabaseSchema;
  schoolBranding: School;
  onRefresh: () => void;
  initialTab?: string;
}

export default function FeeManagementView({ db, schoolBranding, onRefresh, initialTab = 'Collect Fee' }: FeeManagementViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState(initialTab);

  // Student selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // On-the-spot fee head states
  const [onSpotTitle, setOnSpotTitle] = useState('Stationery & Notebooks');
  const [onSpotAmount, setOnSpotAmount] = useState(1500);

  // Payment execution states
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'cheque'>('cash');
  const [selectedHeadsToPay, setSelectedHeadsToPay] = useState<string[]>([]);

  // Receipt printable state
  const [printedReceipt, setPrintedReceipt] = useState<Payment | null>(null);

  // Bulk Monthly Billing — month/year to generate for (defaults to current month)
  const now = new Date();
  const [billingMonth, setBillingMonth] = useState<number>(now.getMonth() + 1);
  const [billingYear, setBillingYear] = useState<number>(now.getFullYear());

  // Auto-set selected student's heads on select
  useEffect(() => {
    if (selectedStudent) {
      const studentHeads = db.fee_heads.filter(fh => fh.student_id === selectedStudent.id && fh.status === 'PENDING');
      setSelectedHeadsToPay(studentHeads.map(h => h.id));
      const totalPending = studentHeads.reduce((sum, h) => sum + h.pending_amount, 0);
      setPaymentAmount(totalPending);
    } else {
      setSelectedHeadsToPay([]);
      setPaymentAmount(0);
    }
  }, [selectedStudent, db.fee_heads]);

  // Compute stats
  const totalExpected = db.fee_heads.reduce((sum, fh) => sum + fh.expected_amount, 0);
  const totalPending = db.fee_heads.filter(fh => fh.status === 'PENDING').reduce((sum, fh) => sum + fh.pending_amount, 0);
  const totalCollected = totalExpected - totalPending;

  // Compute monthly revenue vs target chart data
  const chartData = React.useMemo(() => {
    const dataMap: { [key: string]: { target: number; collected: number } } = {};
    
    db.fee_heads.forEach(fh => {
      const period = fh.period_label || 'Other';
      if (!dataMap[period]) {
        dataMap[period] = { target: 0, collected: 0 };
      }
      dataMap[period].target += fh.expected_amount;
      dataMap[period].collected += (fh.expected_amount - fh.pending_amount);
    });

    const monthsOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return Object.keys(dataMap).map(period => {
      return {
        name: period,
        target: dataMap[period].target,
        collected: dataMap[period].collected,
      };
    }).sort((a, b) => {
      const [monthA, yearA] = a.name.split(' ');
      const [monthB, yearB] = b.name.split(' ');
      
      const yrA = Number(yearA) || 0;
      const yrB = Number(yearB) || 0;
      
      if (yrA !== yrB) {
        return yrA - yrB;
      }
      return monthsOrder.indexOf(monthA) - monthsOrder.indexOf(monthB);
    });
  }, [db.fee_heads]);

  // -----------------------------------------------------------------------------
  // ACTIONS
  // -----------------------------------------------------------------------------
  const handleAddOnSpotHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !onSpotTitle.trim() || onSpotAmount <= 0) return;

    try {
      const res = await fetch('/api/fee-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          title: onSpotTitle.trim(),
          amount: onSpotAmount
        })
      });

      if (res.ok) {
        addToast('success', 'On-the-spot itemized charge added to student dues!');
        setOnSpotTitle('Stationery & Notebooks');
        setOnSpotAmount(1500);
        onRefresh();
        
        // Re-get student record with new heads
        const freshStud = db.students.find(s => s.id === selectedStudent.id);
        if (freshStud) setSelectedStudent(freshStud);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateMonthlyBills = async () => {
    const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][billingMonth - 1];
    if (!confirm(`Generate Monthly Tuition Bills for all Active Students for ${monthName} ${billingYear}? This will append tuition records to Fee Heads.`)) return;
    try {
      const res = await fetch('/api/generate-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: billingMonth, year: billingYear })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', `Success! Generated tuition bills for ${data.generated_count} active students (${data.period_label}).`);
        onRefresh();
      } else {
        addToast('error', data.error || 'Failed to generate bills.');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to generate bills.');
    }
  };

  const handleExecutePayment = async () => {
    if (!selectedStudent || paymentAmount <= 0 || selectedHeadsToPay.length === 0) {
      addToast('warning', 'Please select at least one pending fee head to pay.');
      return;
    }

    try {
      const payload = {
        student_id: selectedStudent.id,
        amount: paymentAmount,
        method: paymentMethod
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Fee cleared successfully! Dynamic ledger entries posted.');
        
        // Save the payment for direct print-dialog trigger
        setPrintedReceipt(data.payment);
        
        setSelectedStudent(null);
        onRefresh();
      } else {
        addToast('error', data.error || 'Payment processing failed.');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Payment processing failed. Please try again.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleDownloadPDFReceipt = () => {
    if (!printedReceipt) return;

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const rStud = db.students.find(s => s.id === printedReceipt.student_id);
      const cls = rStud ? db.classes.find(c => c.id === rStud.class_id) : null;
      const sec = rStud ? db.sections.find(sc => sc.id === rStud.section_id) : null;
      const clsName = cls ? cls.name : 'Grade 1';
      const secName = sec ? sec.name : 'A';

      // Colors matching the visual style
      const primaryColor = [15, 23, 42]; // slate-900
      const accentColor = [79, 70, 229]; // indigo-600
      const borderGray = [226, 232, 240];

      // A4 Landscape is 297 x 210
      // Student Copy on the left (width ~ 128mm), School Copy on the right (width ~ 128mm)
      // Dashed cutting line in the middle at X = 148.5
      
      const copies = [
        { title: 'STUDENT COPY', startX: 10, endX: 138 },
        { title: 'SCHOOL COPY', startX: 158, endX: 286 }
      ];

      copies.forEach((copy, index) => {
        const sx = copy.startX;
        const ex = copy.endX;
        const width = ex - sx;

        // Draw copy frame
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.4);
        doc.rect(sx, 10, width, 190);

        // Header school branding banner
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(sx + 2, 12, width - 4, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(schoolBranding.name.toUpperCase(), sx + (width / 2), 17, { align: 'center' });

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(203, 213, 225);
        doc.text(schoolBranding.tagline || '', sx + (width / 2), 21, { align: 'center' });
        doc.text(schoolBranding.address || '', sx + (width / 2), 25, { align: 'center' });

        // Copy Badge inside receipt
        doc.setFillColor(241, 245, 249);
        doc.rect(ex - 32, 34, 30, 6, 'F');
        doc.setTextColor(51, 65, 85);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(copy.title, ex - 17, 38, { align: 'center' });

        // Document title & credentials
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setFontSize(10);
        doc.text('FEE PAYMENT RECEIPT', sx + 4, 39);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Receipt #: ${printedReceipt.receipt_no}`, sx + 4, 44);
        doc.text(`Date: ${printedReceipt.payment_date}`, ex - 4, 44, { align: 'right' });

        // Student Particulars Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(241, 245, 249);
        doc.rect(sx + 4, 48, width - 8, 16, 'FD');

        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Student Name', sx + 8, 53);
        doc.text('Reg Number', sx + 50, 53);
        doc.text('Class - Section', ex - 8, 53, { align: 'right' });

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.text(rStud?.name || '', sx + 8, 59);
        doc.text(rStud?.reg_no || '', sx + 50, 59);
        doc.text(`${clsName} - ${secName}`, ex - 8, 59, { align: 'right' });

        // Fees Table
        let y = 70;
        doc.setFillColor(241, 245, 249);
        doc.rect(sx + 4, y, width - 8, 6, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Charged Item Description', sx + 8, y + 4.5);
        doc.text('Cleared Cash', ex - 8, y + 4.5, { align: 'right' });

        y += 6;
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('Konsolidated Tuition / Admission clear', sx + 8, y + 6);
        doc.setFont('Helvetica', 'bold');
        doc.text(`Rs. ${printedReceipt.amount_paid.toLocaleString()}`, ex - 8, y + 6, { align: 'right' });

        // Draw line under item row
        doc.setDrawColor(241, 245, 249);
        doc.line(sx + 4, y + 9, ex - 4, y + 9);

        y += 14;

        // Total cleared box
        doc.setFillColor(238, 242, 255); // Indigo 50
        doc.setDrawColor(224, 231, 255);
        doc.rect(sx + 4, y, width - 8, 10, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text('Total Amount Cleared Paid:', sx + 8, y + 6.5);
        doc.setFontSize(9);
        doc.text(`Rs. ${printedReceipt.amount_paid.toLocaleString()}`, ex - 8, y + 6.5, { align: 'right' });

        y += 18;

        // Signatures
        doc.setDrawColor(226, 232, 240);
        doc.line(sx + 10, y + 10, sx + 50, y + 10);
        doc.line(ex - 50, y + 10, ex - 10, y + 10);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Depositor Sign', sx + 30, y + 14, { align: 'center' });
        doc.text('Principal Signature', ex - 30, y + 14, { align: 'center' });

        // Footer note
        doc.text('Thank you for your prompt payment. Keep this copy for records.', sx + (width / 2), y + 22, { align: 'center' });
      });

      // Draw middle cutting line
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(148.5, 5, 148.5, 205);

      doc.save(`Fee_Receipt_${rStud?.name.replace(/\s+/g, '_') || 'Receipt'}_${printedReceipt.receipt_no}.pdf`);
    } catch (err) {
      console.error('Error exporting receipt PDF:', err);
      addToast('error', 'Failed to generate PDF invoice receipt.');
    }
  };

  const handleDownloadPDFInvoice = () => {
    if (!selectedStudent) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const studentHeads = db.fee_heads.filter(
        fh => fh.student_id === selectedStudent.id && fh.status === 'PENDING'
      );

      const cls = db.classes.find(c => c.id === selectedStudent.class_id);
      const sec = db.sections.find(sc => sc.id === selectedStudent.section_id);
      const clsName = cls ? cls.name : 'Grade 1';
      const secName = sec ? sec.name : 'A';

      // Colors
      const primaryColor = [15, 23, 42]; // slate-900
      const accentColor = [79, 70, 229]; // indigo-600
      const lightBgColor = [248, 250, 252];
      const grayText = [100, 116, 139];
      const borderGray = [226, 232, 240];

      // Draw outer frame
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(12, 12, 186, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(schoolBranding.name.toUpperCase(), 105, 20, { align: 'center' });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(schoolBranding.tagline || '', 105, 25, { align: 'center' });
      doc.text(schoolBranding.address || '', 105, 30, { align: 'center' });

      // Invoice Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('OUTSTANDING FEE INVOICE STATEMENT', 105, 45, { align: 'center' });

      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(1);
      doc.line(15, 48, 195, 48);

      // Student Details Particulars
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      doc.setFont('Helvetica', 'bold');
      doc.text('Student Name:', 18, 56);
      doc.setFont('Helvetica', 'normal');
      doc.text(selectedStudent.name.toUpperCase(), 48, 56);

      doc.setFont('Helvetica', 'bold');
      doc.text('Registration ID:', 18, 62);
      doc.setFont('Helvetica', 'normal');
      doc.text(selectedStudent.reg_no, 48, 62);

      doc.setFont('Helvetica', 'bold');
      doc.text("Father's Name:", 18, 68);
      doc.setFont('Helvetica', 'normal');
      doc.text(selectedStudent.father_name, 48, 68);

      doc.setFont('Helvetica', 'bold');
      doc.text('Class Level:', 115, 56);
      doc.setFont('Helvetica', 'normal');
      doc.text(clsName, 145, 56);

      doc.setFont('Helvetica', 'bold');
      doc.text('Section Name:', 115, 62);
      doc.setFont('Helvetica', 'normal');
      doc.text(secName, 145, 62);

      doc.setFont('Helvetica', 'bold');
      doc.text('Billing Date:', 115, 68);
      doc.setFont('Helvetica', 'normal');
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 145, 68);

      // Table Header
      let y = 78;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 8, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('Fee Head Title / Description', 18, y + 5.5);
      doc.text('Original Billed', 105, y + 5.5, { align: 'center' });
      doc.text('Pending Balance (Rs.)', 178, y + 5.5, { align: 'right' });

      y += 8;

      // Table Rows
      doc.setFont('Helvetica', 'normal');
      
      let totalSum = 0;
      studentHeads.forEach(fh => {
        totalSum += fh.pending_amount;

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(fh.title, 18, y + 5.5);

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`Rs. ${fh.expected_amount.toLocaleString()}`, 105, y + 5.5, { align: 'center' });

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(225, 29, 72); // rose-600
        doc.text(`Rs. ${fh.pending_amount.toLocaleString()}`, 178, y + 5.5, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(15, y + 8, 195, y + 8);

        y += 8;
      });

      if (studentHeads.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('This student is fully paid up! No outstanding dues found.', 105, y + 10, { align: 'center' });
        y += 18;
      }

      y += 5;

      // Invoice Totals Summary Box
      doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, y, 180, 16, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('GRAND TOTAL OUTSTANDING DUES:', 18, y + 10);

      doc.setFontSize(12);
      doc.setTextColor(225, 29, 72); // rose-600 for attention
      doc.text(`Rs. ${totalSum.toLocaleString()}`, 178, y + 10.5, { align: 'right' });

      y += 24;

      // Bank Account & Deposit Instructions
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 26, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Important Bank Deposit Instructions:', 18, y + 6);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      
      const noteText = `Please deposit the outstanding amount at any Habib Bank Limited (HBL) branch using Account # 1234-5678-9012-34 or Allied Bank Limited Account # 9876-5432-1098-76. You may also transfer via EasyPaisa / JazzCash using the bank codes. Please bring the deposit slip copy to the Accounts Office to clear school record books.`;
      const splitNote = doc.splitTextToSize(noteText, 172);
      doc.text(splitNote, 18, y + 12);

      y += 36;

      // Signatures
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(25, y + 15, 75, y + 15);
      doc.line(135, y + 15, 185, y + 15);

      doc.setFontSize(8);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('Prepared By (Accounts)', 50, y + 20, { align: 'center' });
      doc.text('Authorized Seal & Sign', 160, y + 20, { align: 'center' });

      doc.save(`Fee_Invoice_${selectedStudent.name.replace(/\s+/g, '_')}_${selectedStudent.reg_no}.pdf`);
    } catch (err) {
      console.error('Error generating Invoice PDF:', err);
      addToast('error', 'Could not generate Invoice PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Finance &amp; Accounts Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">School Fee Management &amp; Invoices</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Generate monthly fee bills, add on-the-spot itemized book charges, and collect tuition dues with instant receipt printouts.
        </p>

        {/* Workspace Pill Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {[
            'Fee Collection KPIs',
            'Collect Fee',
            'Fee Heads Register',
            'Payments Ledger History'
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
        SUB TAB: FEE COLLECTION KPIs
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Fee Collection KPIs' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quick Actions Bar */}
          <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                End-of-Month Cycle
              </span>
              <h3 className="text-lg font-bold mt-1">Bulk Monthly Tuition Billing</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a billing period, then charge all active students their standard/class/manual tuition fee for that month.
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 shrink-0">
              <select
                value={billingMonth}
                onChange={e => setBillingMonth(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={billingYear}
                onChange={e => setBillingYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={handleGenerateMonthlyBills}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Generate Monthly Bills
              </button>
            </div>
          </div>

          {/* Cards metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Expected Fee Collections
              </span>
              <span className="text-2xl font-extrabold text-gray-800 font-mono mt-1 block">
                Rs. {totalExpected.toLocaleString()}
              </span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Actual Collected Dues
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
                Rs. {totalCollected.toLocaleString()}
              </span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Outstanding / Receivables Dues
              </span>
              <span className="text-2xl font-extrabold text-rose-600 font-mono mt-1 block">
                Rs. {totalPending.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Monthly Revenue vs Target Comparison Chart */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Monthly Revenue Collection vs. Targets</h3>
                <p className="text-[10px] text-gray-400">Comparing expected total billed amount against actual collected payments per billing cycle.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-indigo-500"></span>
                  <span className="text-gray-600">Target (Expected)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-emerald-500"></span>
                  <span className="text-gray-600">Collected (Revenue)</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full" style={{ minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, '']}
                    contentStyle={{ background: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                    labelStyle={{ fontWeight: 'bold', color: '#38BDF8' }}
                  />
                  <Bar dataKey="target" name="Target (Expected)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected (Revenue)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: COLLECT FEE (MAIN WORKSPACE CORE SCREEN)
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Collect Fee' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Student selection workspace search bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Student by Reg No, Name, Family key or Father's Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs p-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>

            {searchQuery && (
              <div className="absolute top-77.5 bg-white border border-gray-100 shadow-xl rounded-xl p-2 max-h-60 overflow-y-auto w-full md:w-150 z-30">
                {db.students
                  .filter(s => {
                    const str = `${s.name} ${s.father_name} ${s.reg_no}`.toLowerCase();
                    return str.includes(searchQuery.toLowerCase());
                  })
                  .map(s => {
                    const cls = db.classes.find(c => c.id === s.class_id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchQuery('');
                        }}
                        className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex justify-between items-center text-xs"
                      >
                        <div>
                          <strong className="text-gray-800">{s.name}</strong>
                          <span className="text-gray-400 block mt-0.5">Reg: {s.reg_no} | Father: {s.father_name}</span>
                        </div>
                        <span className="text-indigo-600 font-bold">{cls ? cls.name : 'Primary'}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Core marking window once student is active */}
          {selectedStudent ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: List Pending dues */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-700 tracking-wider">
                      Student: {selectedStudent.reg_no}
                    </span>
                    <h3 className="font-bold text-gray-800 text-sm mt-0.5">{selectedStudent.name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Dues selection checkbox list */}
                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-3">Pending Billing Heads</span>
                  {db.fee_heads.filter(fh => fh.student_id === selectedStudent.id && fh.status === 'PENDING').length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic text-xs">
                      Ali Raza has no pending dues! Submitted payments are up-to-date.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {db.fee_heads
                        .filter(fh => fh.student_id === selectedStudent.id && fh.status === 'PENDING')
                        .map(fh => {
                          const isChecked = selectedHeadsToPay.includes(fh.id);
                          return (
                            <div
                              key={fh.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedHeadsToPay(selectedHeadsToPay.filter(id => id !== fh.id));
                                } else {
                                  setSelectedHeadsToPay([...selectedHeadsToPay, fh.id]);
                                }
                              }}
                              className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-indigo-50/50 border-indigo-200'
                                  : 'bg-white border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`h-4 w-4 rounded flex items-center justify-center border ${
                                  isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200'
                                }`}>
                                  {isChecked && <Check className="h-3 w-3 stroke-3" />}
                                </span>
                                <span className="text-xs font-semibold text-gray-700">{fh.title}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-gray-800">
                                Rs. {fh.pending_amount.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Spot items appending form (8.3 on-the-spot) */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    On-The-Spot Itemized Charge (Books, Uniforms, Stationery)
                  </h4>
                  <form onSubmit={handleAddOnSpotHead} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Charge Label</label>
                      <input
                        type="text"
                        value={onSpotTitle}
                        onChange={e => setOnSpotTitle(e.target.value)}
                        className="w-full text-xs p-2 mt-1 border border-gray-200 rounded bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Amount (Rs)</label>
                      <input
                        type="number"
                        value={onSpotAmount}
                        onChange={e => setOnSpotAmount(Number(e.target.value))}
                        className="w-full text-xs p-2 mt-1 border border-gray-200 rounded bg-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex justify-center items-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Charge Head
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Collect Payment Box */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 h-fit space-y-4">
                <h3 className="font-bold text-gray-900 text-sm">Submit Collected Fees</h3>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Selected Heads Sum (Rs)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                    className="w-full p-2.5 mt-1 border border-gray-200 text-xs font-bold font-mono text-gray-800 rounded-lg bg-gray-50"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="cash">Cash (Directly posts to Ledger Cash box)</option>
                    <option value="bank_transfer">Bank Transfer (Posts to Bank box)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleExecutePayment}
                    className="w-full inline-flex justify-center items-center gap-1.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Receipt className="h-4 w-4" /> Clear Selected Heads
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPDFInvoice}
                    className="w-full inline-flex justify-center items-center gap-1.5 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <FileDown className="h-4 w-4" /> Download Outstanding Invoice (PDF)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-10 text-center text-slate-400 text-xs italic">
              Please choose or search a student from the active directory search bar above to process collections.
            </div>
          )}
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: FEE HEADS REGISTER
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Fee Heads Register' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-gray-900 text-sm mb-4">Outstanding Receivables Ledger ({db.fee_heads.length} heads)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Fee Title</th>
                  <th className="p-3">Expected Amount</th>
                  <th className="p-3">Pending Balance</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {db.fee_heads.slice(-20).reverse().map(fh => {
                  const stud = db.students.find(s => s.id === fh.student_id);
                  return (
                    <tr key={fh.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-semibold text-gray-700">{stud ? stud.name : 'Anonymous Student'}</td>
                      <td className="p-3 font-medium text-indigo-700">{fh.title}</td>
                      <td className="p-3 font-mono">Rs. {fh.expected_amount.toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold text-gray-800">Rs. {fh.pending_amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          fh.status === 'PAID'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {fh.status}
                        </span>
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
        SUB TAB: PAYMENTS LEDGER HISTORY
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Payments Ledger History' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-gray-900 text-sm mb-4">Paid Collections History ({db.payments.length} transactions)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <th className="p-3">Receipt ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Amount Cleared</th>
                  <th className="p-3">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {db.payments.slice(-15).reverse().map(p => {
                  const stud = db.students.find(s => s.id === p.student_id);
                  return (
                    <tr key={p.id}>
                      <td className="p-3 font-mono font-bold text-gray-500">{p.receipt_no}</td>
                      <td className="p-3 font-medium text-gray-400">{p.payment_date}</td>
                      <td className="p-3 font-semibold text-gray-700">{stud ? stud.name : 'Primary'}</td>
                      <td className="p-3 font-bold font-mono text-emerald-700">Rs. {p.amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold uppercase text-gray-600">
                          {p.method}
                        </span>
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
        MODAL: DOUBLE-COPY LANDSCAPE RECEIPT (A4 print-ready)
      ----------------------------------------------------------------------------- */}
      <AnimatePresence>
        {printedReceipt && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl no-print">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-gray-500" /> Print-Ready Double Copy Voucher (Landscape)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> Trigger Print
                  </button>
                  <button
                    onClick={handleDownloadPDFReceipt}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Download PDF Receipt
                  </button>
                  <button
                    onClick={() => setPrintedReceipt(null)}
                    className="p-1.5 hover:bg-gray-200 text-gray-500 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Printable receipt canvas area */}
              <div className="p-8 overflow-y-auto flex-1 bg-white">
                <div className="grid grid-cols-2 gap-8 divide-x-2 divide-dashed divide-gray-300 font-sans">
                  {['STUDENT COPY', 'SCHOOL COPY'].map((receiptType, idx) => {
                    const rStud = db.students.find(s => s.id === printedReceipt.student_id);
                    const cls = rStud ? db.classes.find(c => c.id === rStud.class_id) : null;
                    const sec = rStud ? db.sections.find(sc => sc.id === rStud.section_id) : null;

                    return (
                      <div key={receiptType} className={`px-4 space-y-4 ${idx === 1 ? 'pl-8' : ''}`}>
                        {/* Header stamp */}
                        <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                          <div>
                            <span className="text-xs font-extrabold text-indigo-700 tracking-wide uppercase">
                              {schoolBranding.name}
                            </span>
                            <span className="block text-[8px] text-gray-400 mt-0.5">{schoolBranding.tagline}</span>
                            <span className="block text-[8px] text-gray-400 mt-0.5">{schoolBranding.address}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            {receiptType}
                          </span>
                        </div>

                        {/* Invoice credentials */}
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <h3 className="font-extrabold text-gray-800 uppercase tracking-wider">
                              FEE PAYMENT RECEIPT
                            </h3>
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5 block">
                              Receipt #: {printedReceipt.receipt_no}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400 font-semibold font-mono">
                            Date: {printedReceipt.payment_date}
                          </span>
                        </div>

                        {/* Student personal breakdown row */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-semibold grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-normal">Student Name</span>
                            <span className="text-slate-800">{rStud?.name}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block font-normal">Reg Number</span>
                            <span className="text-slate-800 font-mono">{rStud?.reg_no}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-normal">Class - Section</span>
                            <span className="text-slate-800">
                              {cls ? cls.name : 'Grade 1'} - {sec ? sec.name : 'A'}
                            </span>
                          </div>
                        </div>

                        {/* Receipt Ledger Table info */}
                        <div className="space-y-1.5">
                          <table className="w-full text-[10px] text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                                <th className="p-1">Charged Item Description</th>
                                <th className="p-1 text-right">Cleared Cash</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-100">
                                <td className="p-1 text-gray-600">Konsolidated Tuition / Admission clear</td>
                                <td className="p-1 font-mono font-bold text-gray-800 text-right">
                                  Rs. {printedReceipt.amount_paid.toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Total cleared box */}
                        <div className="p-3 border border-indigo-100 bg-indigo-50/20 rounded-lg flex justify-between items-center text-xs font-bold">
                          <span className="text-indigo-800 font-semibold">Total Amount Cleared Paid:</span>
                          <span className="text-indigo-900 font-mono text-sm">
                            Rs. {printedReceipt.amount_paid.toLocaleString()}
                          </span>
                        </div>

                        {/* Signatures & Stamps */}
                        <div className="pt-8 flex justify-between items-center text-[10px] text-gray-400 font-medium">
                          <div className="text-center w-28 border-t border-gray-200 pt-1">
                            Depositor Sign
                          </div>
                          <div className="text-center w-28 border-t border-gray-200 pt-1">
                            Principal Signature
                          </div>
                        </div>

                        {/* Note */}
                        <p className="text-[8px] text-gray-400 italic text-center">
                          Thank you for your prompt payment. Keep this copy for records.
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
