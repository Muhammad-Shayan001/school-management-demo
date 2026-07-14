/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  BookOpen,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  Save,
  Globe,
  Upload,
  Layers,
  ChevronRight,
  Database,
  Copy,
  Server,
  RefreshCw,
  Lock,
  AlertCircle,
  Terminal,
  Download,
  History,
  FileJson
} from 'lucide-react';
import { DatabaseSchema, Class, Section, Subject, ClassSubject, Session, School } from '../types';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  pushDataToSupabase,
  pullDataFromSupabase,
  SUPABASE_DDL_SCHEMA
} from '../supabaseClient';

interface SettingsViewProps {
  db: DatabaseSchema;
  schoolBranding: School;
  onUpdateBranding: (branding: Partial<School>) => void;
  onRefresh: () => void;
  activeTab?: string;
}

export default function SettingsView({ db, schoolBranding, onUpdateBranding, onRefresh, activeTab = 'Settings Overview' }: SettingsViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState<string>(activeTab);
  
  // Local CRUD states
  const [newClassName, setNewClassName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedClassIdForSection, setSelectedClassIdForSection] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  
  // Assign Subjects states
  const [assignSelectedClassId, setAssignSelectedClassId] = useState('');
  const [assignSelectedSubjectIds, setAssignSelectedSubjectIds] = useState<string[]>([]);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

  // Branding states
  const [schoolName, setSchoolName] = useState(schoolBranding.name);
  const [schoolPhone, setSchoolPhone] = useState(schoolBranding.phone);
  const [schoolEmail, setSchoolEmail] = useState(schoolBranding.email);
  const [schoolAddress, setSchoolAddress] = useState(schoolBranding.address);
  const [schoolTagline, setSchoolTagline] = useState(schoolBranding.tagline);
  
  // Session states
  const [newSessionLabel, setNewSessionLabel] = useState('');

  // Supabase Integration states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [ddlCopied, setDdlCopied] = useState(false);

  // Initialize Supabase config on component load
  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseKey(config.anonKey);
  }, []);

  // System Backup states
  interface Snapshot {
    filename: string;
    size: number;
    createdAt: string;
  }
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [snapshotMessage, setSnapshotMessage] = useState<{ success?: boolean; message: string } | null>(null);

  const fetchSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const res = await fetch('/api/backups/snapshots');
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch (err) {
      console.error('Failed to fetch snapshots', err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSnapshot(true);
    setSnapshotMessage(null);
    try {
      const res = await fetch('/api/backups/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSnapshotLabel.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setSnapshotMessage({ success: true, message: `Successfully created snapshot: ${data.snapshot.filename}` });
        setNewSnapshotLabel('');
        fetchSnapshots();
        onRefresh();
      } else {
        setSnapshotMessage({ success: false, message: data.error || 'Failed to create snapshot' });
      }
    } catch (err: any) {
      setSnapshotMessage({ success: false, message: err.message || 'Error occurred' });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    if (!confirm(`Are you absolutely sure you want to restore the database from snapshot "${filename}"?\n\nThis will OVERWRITE your current database state. A pre-restore safety snapshot will be created automatically.`)) {
      return;
    }
    try {
      const res = await fetch('/api/backups/snapshots/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Database restored successfully!');
        fetchSnapshots();
        onRefresh();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error restoring snapshot: ${err.message}`);
    }
  };

  const handleDeleteSnapshot = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete the snapshot file "${filename}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/backups/snapshots/${filename}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        fetchSnapshots();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error deleting snapshot: ${err.message}`);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("download", `rana_school_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  useEffect(() => {
    if (currentSubTab === 'System Backups') {
      fetchSnapshots();
    }
  }, [currentSubTab]);

  // Synchronize branding states when props change
  useEffect(() => {
    setSchoolName(schoolBranding.name);
    setSchoolPhone(schoolBranding.phone);
    setSchoolEmail(schoolBranding.email);
    setSchoolAddress(schoolBranding.address);
    setSchoolTagline(schoolBranding.tagline);
  }, [schoolBranding]);

  // Set default selected classes when loading
  useEffect(() => {
    if (db.classes.length > 0) {
      if (!selectedClassIdForSection) setSelectedClassIdForSection(db.classes[0].id);
      if (!assignSelectedClassId) {
        setAssignSelectedClassId(db.classes[0].id);
        // Load existing assigned subjects
        const currentlyMapped = db.class_subjects
          .filter(cs => cs.class_id === db.classes[0].id)
          .map(cs => cs.subject_id);
        setAssignSelectedSubjectIds(currentlyMapped);
      }
    }
  }, [db.classes, assignSelectedClassId, selectedClassIdForSection, db.class_subjects]);

  const handleClassChange = (cid: string) => {
    setAssignSelectedClassId(cid);
    const currentlyMapped = db.class_subjects
      .filter(cs => cs.class_id === cid)
      .map(cs => cs.subject_id);
    setAssignSelectedSubjectIds(currentlyMapped);
  };

  // -----------------------------------------------------------------------------
  // HANDLERS
  // -----------------------------------------------------------------------------
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName.trim() })
      });
      if (res.ok) {
        setNewClassName('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? This will delete mapped sections and subjects!')) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim() || !selectedClassIdForSection) return;
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassIdForSection,
          name: newSectionName.trim()
        })
      });
      if (res.ok) {
        setNewSectionName('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      const res = await fetch(`/api/sections/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubjectName.trim() })
      });
      if (res.ok) {
        setNewSubjectName('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubjectAssign = (sid: string) => {
    if (assignSelectedSubjectIds.includes(sid)) {
      setAssignSelectedSubjectIds(assignSelectedSubjectIds.filter(id => id !== sid));
    } else {
      setAssignSelectedSubjectIds([...assignSelectedSubjectIds, sid]);
    }
  };

  const handleSelectAllSubjects = () => {
    setAssignSelectedSubjectIds(db.subjects.map(s => s.id));
  };

  const handleClearAllSubjects = () => {
    setAssignSelectedSubjectIds([]);
  };

  const handleSaveSubjectMapping = async () => {
    if (!assignSelectedClassId) return;
    try {
      const res = await fetch('/api/class-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: assignSelectedClassId,
          subject_ids: assignSelectedSubjectIds
        })
      });
      if (res.ok) {
        alert('Subject mapping saved successfully!');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/school-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolName,
          phone: schoolPhone,
          email: schoolEmail,
          address: schoolAddress,
          tagline: schoolTagline
        })
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateBranding(data.school);
        alert('School branding updated successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionLabel.trim()) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newSessionLabel.trim(),
          is_active: true
        })
      });
      if (res.ok) {
        setNewSessionLabel('');
        onRefresh();
        alert('New session created and marked active.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig({ url: supabaseUrl.trim(), anonKey: supabaseKey.trim() });
    alert('Supabase credentials saved successfully to browser local storage!');
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingConnection(true);
    setSupabaseTestStatus(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseKey.trim());
      setSupabaseTestStatus(res);
    } catch (err: any) {
      setSupabaseTestStatus({ success: false, message: err.message || 'Connection failed' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(SUPABASE_DDL_SCHEMA);
    setDdlCopied(true);
    setTimeout(() => setDdlCopied(false), 2000);
  };

  const handlePushToSupabase = async () => {
    if (!confirm('This will upload all local school tables (students, staff, finances, attendance, exams) directly into your Supabase database. Existing matching records will be updated. Do you want to proceed?')) return;
    setIsSyncing(true);
    setSyncLogs(['[START] Initiating data migration to Supabase...']);
    try {
      const res = await pushDataToSupabase(
        db,
        supabaseUrl.trim(),
        supabaseKey.trim(),
        (msg) => setSyncLogs(prev => [...prev, `[INFO] ${msg}`])
      );
      if (res.success) {
        setSyncLogs(prev => [...prev, '[SUCCESS] Local data successfully pushed and mapped to Supabase database!']);
        alert('All school data pushed to Supabase successfully!');
      } else {
        setSyncLogs(prev => [...prev, `[ERROR] Push failed: ${res.error}`]);
        alert(`Failed to push data: ${res.error}`);
      }
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `[ERROR] Exception occurred: ${err.message || err}`]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    if (!confirm('WARNING: This will pull ALL data from Supabase and overwrite your current local database state. This cannot be undone. Do you want to proceed?')) return;
    setIsSyncing(true);
    setSyncLogs(['[START] Pulling full database state from Supabase...']);
    try {
      const res = await pullDataFromSupabase(
        supabaseUrl.trim(),
        supabaseKey.trim(),
        (msg) => setSyncLogs(prev => [...prev, `[INFO] ${msg}`])
      );
      if (res.success && res.data) {
        setSyncLogs(prev => [...prev, '[SUCCESS] Data successfully pulled. Saving locally...']);
        
        // Save pulled data to our local JSON database via server API!
        const saveRes = await fetch('/api/db/overwrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(res.data)
        });
        
        if (saveRes.ok) {
          setSyncLogs(prev => [...prev, '[SUCCESS] Local JSON database successfully updated with Supabase data!']);
          alert('Successfully pulled and saved data from Supabase!');
          onRefresh();
        } else {
          const errText = await saveRes.text();
          throw new Error(`Failed to save pulled data on the server: ${errText}`);
        }
      } else {
        setSyncLogs(prev => [...prev, `[ERROR] Pull failed: ${res.error}`]);
        alert(`Failed to pull data: ${res.error}`);
      }
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `[ERROR] Exception occurred: ${err.message || err}`]);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 2.3 Workspace header */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Core Settings Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">School Settings &amp; Setup</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Configure classes, map subjects, setup academic sessions, and design school branding.
        </p>

        {/* Workspace Pill Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {[
            'Settings Overview',
            'Branding',
            'Classes',
            'Sections',
            'Subjects',
            'Assign Subjects',
            'Sessions',
            'Fee Policy',
            'Class Billing Rules',
            'Supabase Backend',
            'System Backups'
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
        SUB TAB: SETTINGS OVERVIEW
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Settings Overview' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 col-span-full mb-2 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">System Setup Checklist</h3>
              <p className="text-sm text-gray-500 mt-1">
                Complete these initial steps to fully configure your school management system.
              </p>
            </div>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer">
              Launch Setup Wizard
            </button>
          </div>

          {[
            { title: 'Core Configuration', desc: 'Manage classes, sections, and subjects.', tab: 'Classes', icon: Layers },
            { title: 'School Branding', desc: 'Set up school name, logo, and contact info.', tab: 'Branding', icon: Settings },
            { title: 'Financial Policy', desc: 'Configure default tuition and admission fees.', tab: 'Fee Policy', icon: FileText },
            { title: 'Cloud Sync', desc: 'Connect to Supabase for secure cloud backup.', tab: 'Supabase Backend', icon: Database },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => setCurrentSubTab(card.tab)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-base">{card.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: BRANDING
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Branding' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6">
            <h3 className="font-bold text-gray-900 text-base">School Branding &amp; Stamp Setup</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              These details live propagate dynamically to printed invoices, report cards, ID cards, and headers.
            </p>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  disabled
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg cursor-not-allowed focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  School name is locked from registration and cannot be edited.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">School Phone</label>
                <input
                  type="text"
                  value={schoolPhone}
                  onChange={e => setSchoolPhone(e.target.value)}
                  placeholder="e.g. 03035608778"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">School Email</label>
                <input
                  type="email"
                  value={schoolEmail}
                  onChange={e => setSchoolEmail(e.target.value)}
                  placeholder="e.g. rana@school.com"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">School Tagline / Moto</label>
                <input
                  type="text"
                  value={schoolTagline}
                  onChange={e => setSchoolTagline(e.target.value)}
                  placeholder="e.g. Excellence in Education"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Yahi line student ID cards ke top par show hogi.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">School Physical Address</label>
              <textarea
                value={schoolAddress}
                onChange={e => setSchoolAddress(e.target.value)}
                placeholder="Lahore, Punjab, Pakistan"
                rows={2}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 border border-dashed border-gray-200 rounded-xl flex items-center gap-3">
                <Upload className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="text-left">
                  <span className="block text-xs font-semibold text-gray-700">School Logo</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Choose file (.png or .jpg)</span>
                </div>
                <input type="file" className="hidden" id="logo-input" />
                <label htmlFor="logo-input" className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  Browse
                </label>
              </div>

              <div className="p-4 border border-dashed border-gray-200 rounded-xl flex items-center gap-3">
                <Upload className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="text-left">
                  <span className="block text-xs font-semibold text-gray-700">Principal Signature</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Used on official vouchers</span>
                </div>
                <input type="file" className="hidden" id="sig-input" />
                <label htmlFor="sig-input" className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  Browse
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Save Branding Setup
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: CLASSES CRUD
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Classes' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Add New Class Form */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Add New Class Level</h3>
            <form onSubmit={handleAddClass} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase">Class Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 1, Grade 5"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Class
              </button>
            </form>
          </div>

          {/* Classes Listing */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Active Classes ({db.classes.length})</h3>
            {db.classes.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No classes added yet. Fill dummy data to populate.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {db.classes.map(c => (
                  <div key={c.id} className="py-3 flex justify-between items-center group">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700">{c.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteClass(c.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: SECTIONS CRUD
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Sections' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Add New Section Form */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Add Section to Class</h3>
            <form onSubmit={handleAddSection} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase">Target Class</label>
                <select
                  value={selectedClassIdForSection}
                  onChange={e => setSelectedClassIdForSection(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
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
                <label className="block text-[10px] font-semibold text-gray-500 uppercase">Section Name</label>
                <input
                  type="text"
                  placeholder="e.g. A, B, Blue"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Section
              </button>
            </form>
          </div>

          {/* Sections list grouped by Class */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Active Sections ({db.sections.length})</h3>
            {db.classes.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No classes exist yet. Add class first!</div>
            ) : (
              <div className="space-y-4">
                {db.classes.map(c => {
                  const classSecs = db.sections.filter(s => s.class_id === c.id);
                  return (
                    <div key={c.id} className="p-3 border border-gray-50 rounded-lg bg-gray-50/50">
                      <span className="text-xs font-bold text-gray-800 block">{c.name}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {classSecs.length === 0 ? (
                          <span className="text-[10px] text-gray-400 italic">No sections mapped.</span>
                        ) : (
                          classSecs.map(s => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 pl-2.5 pr-1 py-1 rounded-md text-xs font-medium text-gray-700 shadow-sm"
                            >
                              Section {s.name}
                              <button
                                onClick={() => handleDeleteSection(s.id)}
                                className="text-gray-400 hover:text-red-500 p-0.5 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: SUBJECTS CRUD
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Subjects' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Add New Subject */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Create Master Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, English"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Subject
              </button>
            </form>
          </div>

          {/* Master List of Subjects */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Active Subject Master List ({db.subjects.length})</h3>
            {db.subjects.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No subjects created yet.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {db.subjects.map(s => (
                  <div key={s.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center bg-white hover:border-gray-200 transition-all group">
                    <span className="text-xs font-semibold text-gray-700">{s.name}</span>
                    <button
                      onClick={() => handleDeleteSubject(s.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: ASSIGN SUBJECTS (THE DETAILED MAPPER)
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Assign Subjects' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Workspace Mapper */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="pb-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Class-Subject Mapping</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Class selector se multiple subjects assign karein aur class-wise mapping summary dekhein.
                </p>
              </div>

              {/* Class selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Select Class:</span>
                <select
                  value={assignSelectedClassId}
                  onChange={e => handleClassChange(e.target.value)}
                  className="text-xs p-2 border border-gray-200 rounded-lg bg-white font-medium focus:outline-none"
                >
                  {db.classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Main checkboxes list */}
            {db.subjects.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-xs">
                Subjects listing empty. Create Master Subjects first.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Selected <strong className="text-gray-800 font-mono">{assignSelectedSubjectIds.length}</strong> subjects
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllSubjects}
                      className="px-2.5 py-1 text-[10px] font-semibold text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleClearAllSubjects}
                      className="px-2.5 py-1 text-[10px] font-semibold text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Filter and search bar for quick selection */}
                <input
                  type="text"
                  placeholder="Search subject..."
                  value={subjectSearchQuery}
                  onChange={e => setSubjectSearchQuery(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none"
                />

                {/* Subjects checkbox grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {db.subjects
                    .filter(s => s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()))
                    .map(s => {
                      const isChecked = assignSelectedSubjectIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleToggleSubjectAssign(s.id)}
                          className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-orange-50 border-orange-200 text-orange-900'
                              : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs font-semibold">{s.name}</span>
                          <span
                            className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                              isChecked
                                ? 'bg-orange-600 border-orange-600 text-white'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </span>
                        </div>
                      );
                    })}
                </div>

                <div className="pt-6 border-t border-gray-50 flex justify-end">
                  <button
                    onClick={handleSaveSubjectMapping}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Assign Selected Subjects
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary cards list of already mapped classes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {db.classes.map(c => {
              const mappedCs = db.class_subjects.filter(cs => cs.class_id === c.id);
              return (
                <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5 mb-2.5">
                    <span className="text-xs font-bold text-gray-800">{c.name}</span>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-semibold">
                      {mappedCs.length} subjects
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mappedCs.length === 0 ? (
                      <span className="text-[10px] text-gray-400 italic">No subject assigned.</span>
                    ) : (
                      mappedCs.map(cs => {
                        const subj = db.subjects.find(s => s.id === cs.subject_id);
                        return (
                          <span
                            key={cs.subject_id}
                            className="bg-gray-50 border border-gray-100 rounded text-[10px] font-semibold text-gray-600 px-2 py-1"
                          >
                            {subj?.name || 'Unknown'}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: SESSIONS
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Sessions' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Create new Session */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Create Session / Cycle</h3>
            <form onSubmit={handleAddSession} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase">Session Title</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-27 — Session 1"
                  value={newSessionLabel}
                  onChange={e => setNewSessionLabel(e.target.value)}
                  className="w-full text-xs p-2.5 mt-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Activate Session
              </button>
            </form>
          </div>

          {/* Academic Sessions History */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Academic Sessions ({db.sessions.length})</h3>
            <div className="divide-y divide-gray-50">
              {db.sessions.map(s => (
                <div key={s.id} className="py-3.5 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">{s.label}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Period: {s.start_date} to {s.end_date}
                    </span>
                  </div>
                  {s.is_active ? (
                    <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded-full border border-green-100 uppercase tracking-wider">
                      Active Session
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-semibold rounded-full border border-gray-100 uppercase tracking-wider">
                      Inactive
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: FEE POLICY
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Fee Policy' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6">
            <h3 className="font-bold text-gray-900 text-base">Class Billing &amp; Default Fees</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Set the standard monthly tuition rates and default admission fees. Sibling discounts apply in family modes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3 max-w-2xl">
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-800">Billing Policy</span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Standard Monthly Tuition for Grade 1 &amp; Grade 5 is automatically set to <strong>Rs. 2,500</strong>.
                  For senior classes (Grade 8) standard rate is <strong>Rs. 3,500</strong>. Individual student scholarship overrides can be defined during admission.
                </p>
              </div>
            </div>

            <div className="pt-4 divide-y divide-gray-50 max-w-2xl">
              <div className="py-3 flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-600">Standard Class Base Fee (Primary/Middle)</span>
                <span className="text-gray-900 font-mono">Rs. 2,500 / month</span>
              </div>
              <div className="py-3 flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-600">Senior Class Base Fee (High Class)</span>
                <span className="text-gray-900 font-mono">Rs. 3,500 / month</span>
              </div>
              <div className="py-3 flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-600">Default Admission Charge (One-time)</span>
                <span className="text-gray-900 font-mono">Rs. 2,250</span>
              </div>
              <div className="py-3 flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-600">Billing Cycle Interval</span>
                <span className="text-gray-900 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Monthly
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: CLASS BILLING RULES
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Class Billing Rules' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <div className="pb-4 border-b border-gray-50 mb-6 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Class Specific Billing Overrides</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Define unique billing schedules or specific charges for individual classes.
              </p>
            </div>
            <button className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs rounded-md transition-colors cursor-pointer flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Custom Rule
            </button>
          </div>

          <div className="p-10 text-center text-gray-400 text-xs border-2 border-dashed border-gray-100 rounded-xl">
            No custom class billing rules defined. All classes are using standard Fee Policy rates.
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: SUPABASE BACKEND
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'Supabase Backend' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Credentials Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-50">
                <Database className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Supabase Credentials &amp; Database Config</h3>
                  <p className="text-[10px] text-gray-400">Configure your project credentials to establish a cloud-synced backend.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Supabase Project URL
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Globe className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="url"
                        placeholder="https://your-project.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Anon / Public API Key
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 justify-end border-t border-gray-50 pt-4">
                  <button
                    type="button"
                    onClick={handleTestSupabaseConnection}
                    disabled={isTestingConnection}
                    className="inline-flex justify-center items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Server className={`h-3.5 w-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Credentials
                  </button>
                </div>
              </form>

              {/* Connection Status Box */}
              {supabaseTestStatus && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 text-xs ${
                  supabaseTestStatus.success
                    ? 'bg-green-50 border-green-100 text-green-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Connection Check:</span>
                    <p className="mt-0.5">{supabaseTestStatus.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Tools Controls Panel */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-4 border-b border-gray-50">
                  <RefreshCw className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-sans">Synchronization Hub</h3>
                    <p className="text-[10px] text-gray-400">Migrate and synchronize data elements securely.</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4">
                  <button
                    type="button"
                    onClick={handlePushToSupabase}
                    disabled={isSyncing || !supabaseUrl || !supabaseKey}
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-gray-900 text-white hover:bg-gray-850 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Push Local Data to Supabase
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromSupabase}
                    disabled={isSyncing || !supabaseUrl || !supabaseKey}
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    Pull Data from Supabase
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-medium leading-relaxed mt-4">
                💡 <strong>Important Note:</strong> This application utilizes an offline-first backend storage mechanism. You can use this sync hub to migrate your local records up to your live Supabase cloud database, or pull changes back down anytime!
              </div>
            </div>
          </div>

          {/* Sync Console Outputs */}
          {syncLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-2">
              <div className="flex items-center gap-2 pb-2">
                <Terminal className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-gray-800">Terminal Output &amp; Synchronize Logs</span>
              </div>
              <div className="font-mono text-[11px] bg-slate-950 text-emerald-400 p-4 rounded-xl h-48 overflow-y-auto space-y-1.5 shadow-inner">
                {syncLogs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PostgreSQL DDL Schema Copier */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-start pb-4 border-b border-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">PostgreSQL DDL Migration Script</h3>
                <p className="text-[10px] text-gray-400">Copy this schema and run it in your Supabase SQL Editor to provision all tables.</p>
              </div>
              <button
                type="button"
                onClick={handleCopyDdl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                {ddlCopied ? 'Copied!' : 'Copy SQL Schema'}
              </button>
            </div>

            <div className="relative">
              <pre className="text-[10px] bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto text-gray-600 font-mono max-h-96 leading-relaxed select-all">
                {SUPABASE_DDL_SCHEMA}
              </pre>
            </div>
          </div>
        </motion.div>
      )}

      {/* -----------------------------------------------------------------------------
        SUB TAB: SYSTEM BACKUPS
      ----------------------------------------------------------------------------- */}
      {currentSubTab === 'System Backups' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Controls Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-50">
                <History className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Create Manual Database Snapshot</h3>
                  <p className="text-[10px] text-gray-400">Trigger a live snapshot copy of your current local system database state.</p>
                </div>
              </div>

              <form onSubmit={handleCreateSnapshot} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    Snapshot Custom Label (Optional)
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      placeholder="e.g., pre_exam_records, financial_year_end_2026"
                      value={newSnapshotLabel}
                      onChange={(e) => setNewSnapshotLabel(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Providing a descriptive label helps you identify this snapshot later when rolling back.</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 justify-end border-t border-gray-50 pt-4">
                  <button
                    type="submit"
                    disabled={isCreatingSnapshot}
                    className="inline-flex justify-center items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isCreatingSnapshot ? 'Creating...' : 'Trigger Snapshot'}
                  </button>
                </div>
              </form>

              {/* Status Box */}
              {snapshotMessage && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 text-xs ${
                  snapshotMessage.success
                    ? 'bg-green-50 border-green-100 text-green-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">System Status:</span>
                    <p className="mt-0.5">{snapshotMessage.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Export Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-4 border-b border-gray-50">
                  <FileJson className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-sans">JSON Data Export</h3>
                    <p className="text-[10px] text-gray-400">Download the entire database instantly.</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-gray-900 text-white hover:bg-gray-850 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Current Data (JSON)
                  </button>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] text-indigo-500 font-medium leading-relaxed mt-4">
                💡 <strong>Raw Backup:</strong> This triggers an instant client-side download of the active database state as a portable, raw JSON format backup.
              </div>
            </div>
          </div>

          {/* Snapshot History & Rollback Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Database Snapshot History &amp; Restore Points</h3>
                <p className="text-[10px] text-gray-400">A timeline of saved snapshots. You can restore (roll back) the database state to any point.</p>
              </div>
              <button
                type="button"
                onClick={fetchSnapshots}
                disabled={isLoadingSnapshots}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
                Reload Snapshots
              </button>
            </div>

            {isLoadingSnapshots ? (
              <div className="text-center py-8 text-xs text-gray-400">Loading system restore points...</div>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                No manual database snapshots found. Trigger one above to establish a restore point!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[9px] font-bold tracking-wide bg-gray-50/50">
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-4">Creation Date</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {snapshots.map((snap) => {
                      const isPreRestore = snap.filename.includes('pre_restore');
                      return (
                        <tr key={snap.filename} className="hover:bg-gray-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-gray-700">
                            {snap.filename}
                            {isPreRestore && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                Safety Auto-Backup
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-sans">
                            {new Date(snap.createdAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-mono">
                            {(snap.size / 1024).toFixed(2)} KB
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleRestoreSnapshot(snap.filename)}
                              className="inline-flex items-center gap-1 px-2 py-1 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-[10px] rounded transition-colors cursor-pointer"
                            >
                              <RefreshCw className="h-2.5 w-2.5" />
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSnapshot(snap.filename)}
                              className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-[10px] rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
