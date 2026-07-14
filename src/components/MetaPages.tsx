import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Archive, ArrowRight, Backup, BadgeInfo, BellRing, BookOpenText, Building2, Download, FileClock, FileUp, RefreshCcw, ShieldAlert, Sparkles, SplitSquareHorizontal, Upload, Users } from 'lucide-react';
import { DatabaseSchema } from '../types';
import { addToast } from './Toast';

interface MetaPagesProps {
  page: string;
  db: DatabaseSchema;
  onRefresh: () => void;
}

interface SnapshotRow {
  filename: string;
  size: number;
  createdAt: string;
}

export default function MetaPages({ page, db, onRefresh }: MetaPagesProps) {
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDetails, setFeatureDetails] = useState('');
  const [featureContact, setFeatureContact] = useState('');
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [targetStatus, setTargetStatus] = useState<'active' | 'inactive' | 'left'>('inactive');

  const sortedClasses = useMemo(() => [...db.classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), [db.classes]);

  useEffect(() => {
    if (page === 'Backup / Import' || page === 'Old Data') {
      fetch('/api/backups/snapshots')
        .then(res => res.json())
        .then(data => setSnapshots(Array.isArray(data) ? data : []))
        .catch(() => setSnapshots([]));
    }
  }, [page]);

  useEffect(() => {
    if (!selectedClassId && sortedClasses.length > 0) {
      setSelectedClassId(sortedClasses[0].id);
    }
  }, [selectedClassId, sortedClasses]);

  const saveFeatureRequest = () => {
    if (!featureTitle.trim() || !featureDetails.trim()) {
      addToast('warning', 'Please enter both a title and details.');
      return;
    }

    const existing = JSON.parse(localStorage.getItem('rs_feature_requests') || '[]');
    existing.unshift({
      id: Math.random().toString(36).slice(2),
      title: featureTitle.trim(),
      details: featureDetails.trim(),
      contact: featureContact.trim(),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('rs_feature_requests', JSON.stringify(existing));
    setFeatureTitle('');
    setFeatureDetails('');
    setFeatureContact('');
    addToast('success', 'Feature request saved locally.');
  };

  const createSnapshot = async () => {
    const label = prompt('Snapshot label?');
    const res = await fetch('/api/backups/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label || '' })
    });
    if (res.ok) {
      addToast('success', 'Backup snapshot created.');
      const data = await res.json();
      setSnapshots(prev => [data.snapshot, ...prev]);
    } else {
      addToast('error', 'Snapshot creation failed.');
    }
  };

  const restoreSnapshot = async (filename: string) => {
    if (!confirm(`Restore snapshot ${filename}? This will overwrite the current database.`)) return;
    const res = await fetch('/api/backups/snapshots/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
    if (res.ok) {
      addToast('success', 'Snapshot restored.');
      onRefresh();
    } else {
      addToast('error', 'Restore failed.');
    }
  };

  const exportDb = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const anchor = document.createElement('a');
    anchor.href = dataStr;
    anchor.download = `rana_school_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    addToast('success', 'Database export downloaded.');
  };

  const bulkPromote = async () => {
    if (!selectedClassId) return;
    const classIndex = sortedClasses.findIndex(item => item.id === selectedClassId);
    if (classIndex === -1 || classIndex >= sortedClasses.length - 1) {
      addToast('warning', 'No next class available for promotion.');
      return;
    }

    const nextClass = sortedClasses[classIndex + 1];
    const classStudents = db.students.filter(student => student.class_id === selectedClassId && student.status === 'active');
    if (classStudents.length === 0) {
      addToast('warning', 'No active students found in that class.');
      return;
    }

    await Promise.all(classStudents.map(async student => {
      await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: nextClass.id, section_id: db.sections.find(section => section.class_id === nextClass.id)?.id || student.section_id })
      });
    }));

    addToast('success', `Promoted ${classStudents.length} student(s) to ${nextClass.name}.`);
    onRefresh();
  };

  const bulkStatusUpdate = async () => {
    if (!selectedClassId) return;
    const classStudents = db.students.filter(student => student.class_id === selectedClassId);
    if (classStudents.length === 0) {
      addToast('warning', 'No students available in the selected class.');
      return;
    }

    await Promise.all(classStudents.map(async student => {
      await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
    }));

    addToast('success', `Updated ${classStudents.length} student status record(s).`);
    onRefresh();
  };

  const renderTitle = () => {
    if (page === 'Request a Feature') return ['Request a Feature', 'Share product ideas for the school admin platform.'];
    if (page === 'Our Services') return ['Our Services', 'Platform capabilities and support options.'];
    if (page === 'Developer Info') return ['Developer Info', 'Support contact and technical ownership.'];
    if (page === 'Bulk Operations') return ['Bulk Operations', 'Batch actions for year-end administration and cleanup.'];
    if (page === 'Backup / Import') return ['Backup / Import', 'Save, restore, and export school data safely.'];
    return ['Old Data', 'Read-only access to previous snapshots and archived records.'];
  };

  const [title, subtitle] = renderTitle();

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">Support Workspace</span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>
      </div>

      {page === 'Request a Feature' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Feature Title</label>
              <input value={featureTitle} onChange={(e) => setFeatureTitle(e.target.value)} className="w-full text-sm p-3 border border-gray-200 rounded-lg" placeholder="e.g. WhatsApp fee reminder scheduler" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Details</label>
              <textarea value={featureDetails} onChange={(e) => setFeatureDetails(e.target.value)} className="w-full text-sm p-3 border border-gray-200 rounded-lg h-32" placeholder="Explain the workflow you want added..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contact</label>
              <input value={featureContact} onChange={(e) => setFeatureContact(e.target.value)} className="w-full text-sm p-3 border border-gray-200 rounded-lg" placeholder="Phone or email" />
            </div>
            <button onClick={saveFeatureRequest} className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 cursor-pointer">
              <Sparkles className="h-4 w-4" /> Save Request
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Saved Requests</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {JSON.parse(localStorage.getItem('rs_feature_requests') || '[]').length === 0 ? (
                <p className="text-sm text-gray-500">No feature requests saved yet.</p>
              ) : JSON.parse(localStorage.getItem('rs_feature_requests') || '[]').map((req: any) => (
                <div key={req.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <p className="font-semibold text-gray-900 text-sm">{req.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{req.details}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {page === 'Our Services' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['Admissions', 'Student onboarding, certificates, family linking'],
            ['Fees', 'Billing, receipts, vouchers, defaulters'],
            ['Reports', 'PDF exports, ledger, finance, growth']
          ].map(([heading, description]) => (
            <div key={heading} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{heading}</p>
              <p className="mt-2 text-sm text-gray-700">{description}</p>
            </div>
          ))}
        </motion.div>
      )}

      {page === 'Developer Info' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-sm text-gray-700">This build is maintained as a local workspace project with a Node API and SQL-backed storage.</p>
          <p className="text-sm text-gray-700">For production deployment, wire environment credentials for PostgreSQL or Supabase and set the API host appropriately.</p>
        </motion.div>
      )}

      {page === 'Bulk Operations' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 0, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Batch Actions</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Class</label>
              <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full text-sm p-3 border border-gray-200 rounded-lg bg-white">
                {sortedClasses.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <button onClick={bulkPromote} className="w-full py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer">
              <ArrowRight className="h-4 w-4" /> Promote Class Students
            </button>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Set Status</label>
              <div className="flex gap-2">
                {(['active', 'inactive', 'left'] as const).map(status => (
                  <button key={status} onClick={() => setTargetStatus(status)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${targetStatus === status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={bulkStatusUpdate} className="w-full py-3 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 flex items-center justify-center gap-2 cursor-pointer">
              <ShieldAlert className="h-4 w-4" /> Update Class Status
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <p className="text-sm text-gray-600">Use batch actions to finish year-end work quickly. Operations here apply directly through the live backend and refresh the workspace after completion.</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Students</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{db.students.length}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Classes</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{db.classes.length}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {(page === 'Backup / Import' || page === 'Old Data') && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 0, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <button onClick={createSnapshot} className="w-full py-3 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black flex items-center justify-center gap-2 cursor-pointer">
              <Backup className="h-4 w-4" /> Create Backup Snapshot
            </button>
            <button onClick={exportDb} className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 cursor-pointer">
              <Download className="h-4 w-4" /> Download Database JSON
            </button>
            <p className="text-xs text-gray-500">Snapshots use the live backend state. Restore will overwrite current local data.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm">Available Snapshots</h3>
              <button onClick={onRefresh} className="text-xs font-semibold text-indigo-600 flex items-center gap-1 cursor-pointer"><RefreshCcw className="h-3.5 w-3.5" /> Refresh</button>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {snapshots.length === 0 ? <p className="text-sm text-gray-500">No snapshots available.</p> : snapshots.map(snapshot => (
                <div key={snapshot.filename} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{snapshot.filename}</p>
                    <p className="text-xs text-gray-500">{snapshot.size} bytes</p>
                  </div>
                  <button onClick={() => restoreSnapshot(snapshot.filename)} className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer">
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
