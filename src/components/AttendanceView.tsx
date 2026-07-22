/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Search,
  SlidersHorizontal,
  Clock,
  Save,
  Check,
  X,
  QrCode,
  Scan,
  Volume2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { DatabaseSchema, Student, Attendance, CalendarDay } from '../types';
import { addToast } from './Toast';

interface AttendanceViewProps {
  db: DatabaseSchema;
  onRefresh: () => void;
}

export default function AttendanceView({ db, onRefresh }: AttendanceViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState('Student Attendance');

  // Student marking states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState('2026-04-24');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Local student records copy with status mapping
  const [localAttendance, setLocalAttendance] = useState<{ [sid: string]: 'present' | 'absent' | 'leave' }>({});

  // Calendar states
  const [calDate, setCalDate] = useState('2026-04-24');
  const [isWorkingDay, setIsWorkingDay] = useState(true);

  // Initialize filters
  useEffect(() => {
    if (db.classes.length > 0 && !selectedClassId) {
      setSelectedClassId(db.classes[0].id);
    }
  }, [db.classes, selectedClassId]);

  // Load existing saved attendance for this Class & Date if any, or default to all Present
  useEffect(() => {
    if (selectedClassId && attendanceDate) {
      const saved = db.attendance.filter(a => a.class_id === selectedClassId && a.date === attendanceDate);
      const classStudents = db.students.filter(s => s.class_id === selectedClassId && s.status === 'active');
      
      const map: { [sid: string]: 'present' | 'absent' | 'leave' } = {};
      classStudents.forEach(s => {
        const existing = saved.find(a => a.student_id === s.id);
        map[s.id] = existing ? existing.status : 'present'; // Default to present
      });
      setLocalAttendance(map);
    }
  }, [selectedClassId, attendanceDate, db.attendance, db.students]);

  // -----------------------------------------------------------------------------
  // CALENDAR GATING LOGIC (Section 9.3)
  // -----------------------------------------------------------------------------
  // Check if chosen attendanceDate is working day. Default to true if not defined.
  const matchedCalDay = db.calendar_days.find(cd => cd.date === attendanceDate);
  const isDateWorking = matchedCalDay ? matchedCalDay.is_working_day : true;

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'leave') => {
    setLocalAttendance({
      ...localAttendance,
      [studentId]: status
    });
  };

  const handleSaveStudentAttendance = async () => {
    if (!selectedClassId) return;

    // Check calendar working status
    if (!isDateWorking) {
      addToast('warning', 'Attendance save is disabled on non-working days.');
      return;
    }

    const records = Object.entries(localAttendance).map(([student_id, status]) => ({
      student_id,
      status
    }));

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          date: attendanceDate,
          records
        })
      });

      if (res.ok) {
        addToast('success', 'Student attendance saved successfully!');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCalendarDay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: calDate,
          is_working_day: isWorkingDay
        })
      });

      if (res.ok) {
        addToast('success', 'School calendar day updated successfully!');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Staff marking state
  const [staffDate, setStaffDate] = useState('2026-04-24');
  const [localStaffAttendance, setLocalStaffAttendance] = useState<{ [sid: string]: 'present' | 'absent' | 'leave' }>({});

  useEffect(() => {
    const saved = db.staff_attendance.filter(sa => sa.date === staffDate);
    const activeStaff = db.staff.filter(s => s.status === 'active');
    const map: { [sid: string]: 'present' | 'absent' | 'leave' } = {};
    activeStaff.forEach(s => {
      const existing = saved.find(sa => sa.staff_id === s.id);
      map[s.id] = existing ? existing.status : 'present';
    });
    setLocalStaffAttendance(map);
  }, [staffDate, db.staff_attendance, db.staff]);

  const handleSaveStaffAttendance = async () => {
    const records = Object.entries(localStaffAttendance).map(([staff_id, status]) => ({
      staff_id,
      status
    }));

    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: staffDate,
          records
        })
      });

      if (res.ok) {
        addToast('success', 'Staff attendance saved successfully!');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentSubTab === 'QR ID Card Scanner') {
      let scanner: Html5QrcodeScanner | null = null;
      try {
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: {width: 250, height: 250} },
          false
        );
        scanner.render(
          (decodedText: string) => {
            handleProcessScan(decodedText);
            // pause briefly so we don't scan repeatedly
            if (scanner) {
              scanner.pause(true);
              setTimeout(() => {
                if (scanner) scanner.resume();
              }, 2000);
            }
          },
          (error: any) => {
            // ignore constant read errors
          }
        );
      } catch (e) {
        console.error("QR Scanner Init Error", e);
      }
      
      return () => {
        if (scanner) {
          scanner.clear().catch((error: any) => {
            console.error("Failed to clear scanner. ", error);
          });
        }
      };
    }
  }, [currentSubTab]);

  // QR Code / ID Card Scanner States
  interface ScannedArrival {
    id: string;
    student: Student;
    timestamp: string;
    status: string;
  }
  const [scannedArrivals, setScannedArrivals] = useState<ScannedArrival[]>([]);
  const [scanInputText, setScanInputText] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanSoundEnabled, setScanSoundEnabled] = useState(true);
  const [searchStudentScanQuery, setSearchStudentScanQuery] = useState('');

  // Audio synths
  const playSuccessBeep = () => {
    if (!scanSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.frequency.setValueAtTime(600, audioCtx.currentTime); // 600 Hz
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.08);
      
      setTimeout(() => {
        try {
          const audioCtx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc2 = audioCtx2.createOscillator();
          const gain2 = audioCtx2.createGain();
          
          osc2.connect(gain2);
          gain2.connect(audioCtx2.destination);
          
          osc2.frequency.setValueAtTime(850, audioCtx2.currentTime); // 850 Hz
          gain2.gain.setValueAtTime(0.04, audioCtx2.currentTime);
          
          osc2.start();
          osc2.stop(audioCtx2.currentTime + 0.12);
        } catch (e) {}
      }, 90);
    } catch (err) {
      console.warn('AudioContext not supported or blocked:', err);
    }
  };

  const playErrorBeep = () => {
    if (!scanSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // 220 Hz low buzz
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (err) {}
  };

  const handleProcessScan = async (regNo: string) => {
    const cleanRegNo = regNo.trim();
    if (!cleanRegNo) return;
    
    setIsProcessingScan(true);
    setScanError(null);
    setScanSuccess(null);
    
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reg_no: cleanRegNo,
          date: attendanceDate, // link directly with standard date selection
          status: 'present'
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        playSuccessBeep();
        setScanSuccess(data.message);
        
        // Add to scanned log state
        const newScan: ScannedArrival = {
          id: `scan_${Date.now()}`,
          student: data.student,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          status: 'present'
        };
        setScannedArrivals(prev => [newScan, ...prev].slice(0, 15)); // Keep last 15 scans
        
        // Refresh master attendance records
        onRefresh();
      } else {
        playErrorBeep();
        setScanError(data.error || 'Failed to register scan');
      }
    } catch (err: any) {
      playErrorBeep();
      setScanError(err.message || 'Network error while registering scan');
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInputText.trim()) return;
    handleProcessScan(scanInputText);
    setScanInputText('');
  };

  const activeStudents = db.students.filter(s => s.status === 'active');
  const filteredSimStudents = activeStudents.filter(s => {
    const query = searchStudentScanQuery.toLowerCase();
    const cl = db.classes.find(c => c.id === s.class_id);
    const className = cl ? cl.name.toLowerCase() : '';
    return s.name.toLowerCase().includes(query) || s.reg_no.toLowerCase().includes(query) || className.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* 2.3 Workspace Card Layout */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Attendance Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Student &amp; Staff Attendance</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Student aur staff attendance pages ko bina hard-refresh same workspace flow me switch karr ke mark karein.
        </p>

        {/* Workspace Pill Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {[
            'Student Attendance',
            'QR ID Card Scanner',
            'Staff Attendance',
            'School Calendar',
            'Attendance History'
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
        SUB TAB: STUDENT ATTENDANCE (with calendar gating block)
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Student Attendance' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Calendar Gating Warning Notice */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2.5">
              <Calendar className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-blue-800 uppercase block">Calendar Gating Rule</span>
                <p className="text-[11px] text-blue-600 mt-0.5">
                  Calendar ke mutabiq sirf working days par attendance mark karr ke save kerna enabled ho ga. Non-working dates par save options auto-locked rahein ge.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentSubTab('School Calendar')}
              className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer shrink-0"
            >
              Update Calendar →
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="pb-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h3 className="font-bold text-gray-900 text-sm">Mark Student Attendance Sheet</h3>

              {/* Filtering row */}
              <div className="flex flex-wrap gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="relative mr-2">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search student..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="text-xs p-2 pl-8 border border-gray-200 rounded-lg focus:outline-none w-40"
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">Class:</span>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="text-xs p-2 border border-gray-200 rounded-lg bg-white focus:outline-none"
                  >
                    {db.classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Date:</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="text-xs p-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Attendance day working status banner */}
            <div className={`p-3 text-xs font-semibold rounded-lg flex items-center justify-between mb-4 border ${
              isDateWorking 
                ? 'bg-green-50/50 border-green-100 text-green-700' 
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}>
              <span>
                Status for {attendanceDate}: <strong>{isDateWorking ? 'WORKING DAY (Marking open)' : 'NON-WORKING DAY / HOLIDAY (Marking locked)'}</strong>
              </span>
              {!isDateWorking && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 px-2 py-0.5 rounded-full font-bold uppercase">
                  Locked
                </span>
              )}
            </div>

            {/* Student grid table sheet */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                    <th className="p-3">Reg Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Father Name</th>
                    <th className="p-3 text-center">Mark Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {db.students.filter(s => s.class_id === selectedClassId && s.status === 'active' && (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.reg_no.toLowerCase().includes(studentSearch.toLowerCase()))).map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-bold text-gray-700">{s.reg_no}</td>
                      <td className="p-3 font-bold text-gray-800">{s.name}</td>
                      <td className="p-3 text-gray-500">{s.father_name}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {['present', 'absent', 'leave'].map(status => {
                            const active = localAttendance[s.id] === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={!isDateWorking}
                                onClick={() => handleStatusChange(s.id, status as any)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all capitalize cursor-pointer ${
                                  !isDateWorking 
                                    ? 'opacity-40 cursor-not-allowed'
                                    : active && status === 'present'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : active && status === 'absent'
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : active && status === 'leave'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {db.students.filter(s => s.class_id === selectedClassId && s.status === 'active').length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-400">
                        No active students registered under this class level.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-5 border-t border-gray-50 flex justify-end">
              <button
                type="button"
                disabled={!isDateWorking}
                onClick={handleSaveStudentAttendance}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-white font-medium text-xs shadow-sm transition-all cursor-pointer ${
                  isDateWorking ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <Save className="h-3.5 w-3.5" />
                Save Student Attendance
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: QR ID CARD SCANNER
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'QR ID Card Scanner' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Custom Scanner style block */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanLaser {
              0% { top: 0%; opacity: 0.9; }
              50% { top: 100%; opacity: 0.9; }
              100% { top: 0%; opacity: 0.9; }
            }
            .animate-laser {
              animation: scanLaser 2.5s infinite ease-in-out;
            }
          `}} />

          {/* Top Configuration & Calendar Gating Header */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <QrCode className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Live ID Card Scanner Console</h3>
                <p className="text-[10px] text-slate-400">Instantly record student arrival by scanning their barcode or QR code.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Scan Date:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="text-xs p-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:outline-none font-semibold cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setScanSoundEnabled(!scanSoundEnabled)}
                className={`p-2 rounded-lg border flex items-center gap-1.5 font-bold text-[11px] cursor-pointer transition-colors ${
                  scanSoundEnabled 
                    ? 'bg-slate-800 text-green-400 border-slate-700 hover:bg-slate-700' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
                title={scanSoundEnabled ? 'Mute Scan Sound' : 'Unmute Scan Sound'}
              >
                <Volume2 className="h-3.5 w-3.5" />
                {scanSoundEnabled ? 'Sound ON' : 'Muted'}
              </button>

              <div className={`px-3 py-2 rounded-lg text-[10px] font-bold border ${
                isDateWorking 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {isDateWorking ? '● SCANNING OPEN' : '● SYSTEM LOCKED (HOLIDAY)'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Live Viewport Simulator (7 cols) */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <Scan className="h-4 w-4 text-indigo-600 animate-pulse" />
                  ID Card Viewport Camera Simulator
                </h4>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-mono font-bold">
                  CAM-01 ACTIVE
                </span>
              </div>

              {/* Viewport Box */}
              <div className="relative aspect-16/10 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-6 text-center group shadow-inner">
                {/* Simulated Green Camera Active LED */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-mono border border-slate-800 text-green-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping"></span>
                  LIVE FEED
                </div>

                {/* Laser scan horizontal line */}
                {isDateWorking && (
                  <div className="absolute left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#ef4444] animate-laser z-10 pointer-events-none"></div>
                )}
                
                {/* Grid Overlay for Scanning Vibe */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.04)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none opacity-20"></div>

                {/* Focus brackets in corner */}
                <div className="absolute top-6 right-6 w-5 h-5 border-t-2 border-r-2 border-indigo-500"></div>
                <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-indigo-500"></div>
                <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-indigo-500"></div>
                <div className="absolute bottom-6 left-6 w-5 h-5 border-b-2 border-l-2 border-indigo-500"></div>

                <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-8">
                  <div id="qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden" style={{border: 'none'}}></div>
                </div>

                {!isDateWorking && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                    <AlertTriangle className="h-10 w-10 text-rose-500 animate-bounce mb-3" />
                    <h5 className="font-bold text-rose-400 text-sm uppercase">Attendance Portal Locked</h5>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed font-semibold">
                      Chosen date ({attendanceDate}) is set as a non-working holiday on the school calendar. Clear this exception in 'School Calendar' tab to resume operations.
                    </p>
                  </div>
                )}
              </div>

              {/* Hardware Scan Receiver Form */}
              <form onSubmit={handleInputSubmit} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    USB Gun Scanner / Manual Reg Input
                  </label>
                  <span className="text-[9px] text-gray-400 font-semibold italic">Auto-focus active</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g., REG-2026-0001 (or plug in scanner & scan barcode)"
                      value={scanInputText}
                      onChange={e => setScanInputText(e.target.value)}
                      disabled={!isDateWorking || isProcessingScan}
                      className="w-full text-xs p-3 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-mono placeholder:font-sans disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!isDateWorking || isProcessingScan || !scanInputText.trim()}
                    className="px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shrink-0"
                  >
                    {isProcessingScan ? 'Reading...' : 'Scan / Enter'}
                  </button>
                </div>
              </form>

              {/* Scanning status banner */}
              {scanError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Scan Error Occurred</span>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{scanError}</p>
                  </div>
                </div>
              )}

              {scanSuccess && (
                <div className="p-3.5 bg-green-50 border border-green-100 rounded-lg text-green-800 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Scan Registered Successful</span>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{scanSuccess}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Recent Scan Logs Timeline (5 cols) */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-5 flex flex-col h-130 overflow-hidden">
              <div className="flex justify-between items-center pb-3 border-b border-gray-50 mb-3.5">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs font-sans">Scanned Attendance Logs</h4>
                  <p className="text-[9px] text-gray-400 font-semibold">Timeline of scans received during this active session.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedArrivals([])}
                  disabled={scannedArrivals.length === 0}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear Feed
                </button>
              </div>

              {/* Feed List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {scannedArrivals.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <Clock className="h-8 w-8 text-slate-300 animate-pulse mb-2" />
                    <p className="text-xs font-medium font-sans">No Scans Logged Yet</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-45 leading-relaxed font-semibold">
                      ID card sweeps will list here in real-time with student profile cards.
                    </p>
                  </div>
                ) : (
                  scannedArrivals.map(scan => {
                    const stCl = db.classes.find(c => c.id === scan.student.class_id);
                    const stSec = db.sections.find(sc => sc.id === scan.student.section_id);
                    return (
                      <div
                        key={scan.id}
                        className="p-3 border border-gray-100 rounded-xl bg-slate-50/50 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {/* Student Initials Avatar */}
                          <div className="h-9 w-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {scan.student.name.slice(0, 2)}
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono font-bold text-gray-400 block uppercase tracking-wider leading-none">
                              {scan.student.reg_no}
                            </span>
                            <span className="text-xs font-extrabold text-gray-800 block uppercase">
                              {scan.student.name}
                            </span>
                            <span className="text-[9px] text-indigo-600 font-bold block leading-none">
                              {stCl ? stCl.name : 'Class Level'} {stSec ? `- Sec ${stSec.name}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-right space-y-1.5">
                          <span className="text-[9px] font-mono text-gray-400 font-bold block">
                            {scan.timestamp}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-green-100 text-green-800 text-[8px] font-extrabold rounded uppercase tracking-wider">
                            Present
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick Simulation Row */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="pb-3 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900 text-xs">🏫 Quick On-Screen Card Simulator (Testing Bench)</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Click any active student's badge below to simulate a real hardware sweep of their ID card.</p>
              </div>

              {/* Mini Search Student */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Quick search student name / class..."
                  value={searchStudentScanQuery}
                  onChange={e => setSearchStudentScanQuery(e.target.value)}
                  className="w-full text-xs p-2 pl-8 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Students list for scanning */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredSimStudents.slice(0, 16).map(stud => {
                const isMarkedToday = db.attendance.some(a => a.student_id === stud.id && a.date === attendanceDate && a.status === 'present');
                const sCl = db.classes.find(c => c.id === stud.class_id);
                return (
                  <div
                    key={stud.id}
                    className={`p-3 border rounded-xl flex flex-col justify-between transition-all ${
                      isMarkedToday 
                        ? 'bg-green-50/40 border-green-200' 
                        : 'bg-white hover:bg-slate-50/40 border-gray-100'
                    }`}
                  >
                    <div className="space-y-1 text-left mb-2.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-mono text-gray-400 font-bold uppercase tracking-wider">{stud.reg_no}</span>
                        {isMarkedToday && (
                          <span className="text-[8px] font-extrabold text-green-700 uppercase bg-green-100/80 px-1.5 py-0.5 rounded leading-none">
                            Arrived
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-gray-800 uppercase line-clamp-1">{stud.name}</h5>
                      <span className="text-[9px] text-gray-400 font-semibold block leading-none">
                        Father: {stud.father_name}
                      </span>
                      <span className="text-[9px] text-indigo-600 font-bold block leading-none">
                        {sCl ? sCl.name : 'Active Class'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!isDateWorking || isProcessingScan}
                      onClick={() => handleProcessScan(stud.reg_no)}
                      className={`w-full py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        !isDateWorking 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isMarkedToday 
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {isMarkedToday ? '✓ Scan Again' : '📱 Simulate Card Scan'}
                    </button>
                  </div>
                );
              })}
              {filteredSimStudents.length === 0 && (
                <div className="col-span-full text-center py-6 text-xs text-gray-400 italic">
                  No active students found matching search filters.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: STAFF ATTENDANCE
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Staff Attendance' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="pb-4 border-b border-gray-50 flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Teacher Staff Attendance Sheet</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500">Date:</span>
              <input
                type="date"
                value={staffDate}
                onChange={e => setStaffDate(e.target.value)}
                className="text-xs p-2 border border-gray-200 rounded-lg focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3 text-center">Mark Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {db.staff.filter(s => s.status === 'active').map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-bold text-gray-700">{s.employee_id}</td>
                    <td className="p-3 font-bold text-gray-800">{s.name}</td>
                    <td className="p-3 text-gray-500 font-mono">{s.contact}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        {['present', 'absent', 'leave'].map(status => {
                          const active = localStaffAttendance[s.id] === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setLocalStaffAttendance({ ...localStaffAttendance, [s.id]: status as any })}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all capitalize cursor-pointer ${
                                active && status === 'present'
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : active && status === 'absent'
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : active && status === 'leave'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
                {db.staff.filter(s => s.status === 'active').length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-400">
                      No active staff added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-5 border-t border-gray-50 flex justify-end">
            <button
              onClick={handleSaveStaffAttendance}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              Save Staff Attendance
            </button>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: SCHOOL CALENDAR (working day setup)
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'School Calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Toggle Date state form */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Set Working Day vs Holiday</h3>
            <form onSubmit={handleSaveCalendarDay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Choose Date</label>
                <input
                  type="date"
                  value={calDate}
                  onChange={e => setCalDate(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Day Operations Type</label>
                <select
                  value={isWorkingDay ? 'yes' : 'no'}
                  onChange={e => setIsWorkingDay(e.target.value === 'yes')}
                  className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg bg-white focus:outline-none"
                >
                  <option value="yes">Working Day (Marking Open)</option>
                  <option value="no">Non-Working Day / Holiday (Marking Locked)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                Save Calendar Day
              </button>
            </form>
          </div>

          {/* List of configured exception calendar days */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Calendar Configured Days</h3>
            {db.calendar_days.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs italic">
                No exceptions configured. By default, all days behave as active working days.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {db.calendar_days.map(cd => (
                  <div key={cd.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-800">{cd.date}</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">Custom Exception Day</span>
                    </div>
                    {cd.is_working_day ? (
                      <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100">
                        Working Day
                      </span>
                    ) : (
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-100">
                        Holiday
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: ATTENDANCE HISTORY
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Attendance History' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-gray-900 text-sm mb-4">Saved Historical Attendance Registers ({db.attendance.length} rows)</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <th className="p-3">Date</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Class Assigned</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {db.attendance.slice(-15).reverse().map(a => {
                  const stud = db.students.find(s => s.id === a.student_id);
                  const cls = db.classes.find(c => c.id === a.class_id);
                  return (
                    <tr key={a.id}>
                      <td className="p-3 text-gray-500 font-mono">{a.date}</td>
                      <td className="p-3 font-semibold text-gray-700">{stud ? stud.name : 'Unknown'}</td>
                      <td className="p-3 font-medium text-indigo-700">{cls ? cls.name : 'Primary'}</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          a.status === 'present'
                            ? 'bg-green-50 text-green-700'
                            : a.status === 'absent'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {a.status}
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
    </div>
  );
}
