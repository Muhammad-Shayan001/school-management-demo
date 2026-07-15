/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  MessageSquare,
  Users,
  Briefcase,
  Calendar,
  CreditCard,
  PieChart,
  TrendingUp,
  FileText,
  BookOpen,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Database,
  Trash2,
  Menu,
  X,
  Bell,
  LogOut,
  HelpCircle,
  Lightbulb,
  Server,
  FileArchive,
  Layers
} from 'lucide-react';
import { DatabaseSchema, School } from './types';

// Importing Views
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import AdmissionsView from './components/AdmissionsView';
import FamiliesView from './components/FamiliesView';
import StaffView from './components/StaffView';
import AttendanceView from './components/AttendanceView';
import FeeManagementView from './components/FeeManagementView';
import FinanceView from './components/FinanceView';
import ExamsView from './components/ExamsView';
import IdentityCardsView from './components/IdentityCardsView';
import GrowthRoadmapView from './components/GrowthRoadmapView';
import LedgerView from './components/LedgerView';
import AdditionalView from './components/AdditionalView';
import NotificationDrawer from './components/NotificationDrawer';
import LoginPage from './components/LoginPage';
import { ToastContainer, addToast } from './components/Toast';

export default function App() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [schoolBranding, setSchoolBranding] = useState<School | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('Dashboard');
  const [currentSubTab, setCurrentSubTab] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Navigation state
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Settings: false,
    Communication: false,
    Admissions: false,
    Additional: false
  });

  // Responsive sidebar toggles
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  useEffect(() => {
    // Check auth on load
    const authStatus = localStorage.getItem('rs_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    refreshDatabase();
  }, []);

  const refreshDatabase = async () => {
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
      
      const brandRes = await fetch('/api/school-branding');
      if (brandRes.ok) {
        const brandingData = await brandRes.json();
        setSchoolBranding(brandingData);
      }
    } catch (err) {
      console.error('Error loading database schema:', err);
    }
  };

  const handleLogin = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('rs_auth', 'true');
        localStorage.setItem('rs_admin_name', data.user?.name || 'Admin');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      // Fallback: allow demo login if server is unreachable
      if ((email === 'rana@school.com' || email === 'admin@school.com') && pass === 'admin123') {
        localStorage.setItem('rs_auth', 'true');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    }
  };

  const handleLogout = () => {
    fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
    localStorage.removeItem('rs_auth');
    localStorage.removeItem('rs_admin_name');
    setIsAuthenticated(false);
  };

  const handleUpdateBrandingInUI = (newBranding: Partial<School>) => {
    if (schoolBranding) {
      setSchoolBranding({ ...schoolBranding, ...newBranding });
    }
  };

  const handleSeedDummyData = async () => {
    if (!confirm('Seed Rana School with full-scale demo data? This will clear current modifications.')) return;
    try {
      const res = await fetch('/api/dummy-data', { method: 'POST' });
      if (res.ok) {
        addToast('success', 'Demo data seeded successfully!');
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to seed data.');
    }
  };

  const handleWipeDatabase = async () => {
    if (!confirm('Are you absolutely sure? This will wipe ALL school tables!')) return;
    try {
      const res = await fetch('/api/erase-all', { method: 'POST' });
      if (res.ok) {
        addToast('info', 'Database cleared completely.');
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to wipe database.');
    }
  };

  const toggleSubMenu = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const handlePageNavigate = (page: string, subTab?: string, parentMenu?: string) => {
    setCurrentPage(page);
    if (subTab) setCurrentSubTab(subTab);
    else setCurrentSubTab('');
    
    if (parentMenu && !expandedMenus[parentMenu]) {
      toggleSubMenu(parentMenu);
    }
    setMobileMenuOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer />
      </>
    );
  }

  if (!db || !schoolBranding) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Database className="h-10 w-10 text-indigo-500 animate-pulse" />
        <span className="text-xs font-mono text-slate-400 font-bold">Rana School Admin: Connecting Database...</span>
      </div>
    );
  }

  // Calculate live alert count for the header trigger button
  const getAlertsCount = () => {
    let count = 0;
    const students = db.students || [];
    const feeHeads = db.fee_heads || [];
    const attendance = db.attendance || [];
    const refDate = new Date('2026-04-24');

    students.forEach(s => {
      if (s.status === 'active') {
        const studentFees = feeHeads.filter(fh => fh.student_id === s.id && fh.status === 'PENDING');
        const totalPending = studentFees.reduce((sum, f) => sum + f.pending_amount, 0);
        if (totalPending > 0) count++;
      }
    });

    return count;
  };

  const alertsCount = getAlertsCount();
  const activeSession = db.sessions.find(s => s.is_active);

  // Define navigation structure
  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { 
      name: 'Settings', icon: Settings, 
      subItems: ['Settings Overview', 'Core Management', 'Session Management', 'Fee Policy', 'Class Billing Rules', 'School Branding'] 
    },
    { 
      name: 'Communication', icon: MessageSquare,
      subItems: ['Announcements', 'Message History']
    },
    { 
      name: 'Admissions', icon: Users,
      subItems: ['Add Student', 'All Students', 'Families', 'Import Students', 'Certificates']
    },
    { name: 'Families', icon: Users },
    { name: 'Staff', icon: Briefcase },
    { name: 'Staff Directory', icon: Briefcase }, // Usually same view, different tab
    { name: 'Attendance', icon: Calendar },
    { name: 'Exam Management', icon: FileText },
    { name: 'ID Cards', icon: BookOpen },
    { name: 'Birthdays', icon: Calendar },
    { name: 'Fee Management', icon: CreditCard },
    { name: 'Accounting', icon: PieChart },
    { name: 'School Growth', icon: TrendingUp },
    { name: 'Ledger', icon: ShieldCheck },
    { 
      name: 'Additional', icon: Layers,
      subItems: ['Vouchers', 'PDF Generator', 'Data Extractor', 'WhatsApp Center']
    }
  ];

  const bottomNav = [
    { name: 'Request a Feature', icon: Lightbulb },
    { name: 'Our Services', icon: Briefcase },
    { name: 'Developer Info', icon: Server },
    { name: 'Bulk Operations', icon: Database },
    { name: 'Backup / Import', icon: FileArchive },
    { name: 'Old Data', icon: Database },
    { name: 'Erase All Data', icon: Trash2, action: handleWipeDatabase },
    { name: 'Logout', icon: LogOut, action: handleLogout }
  ];

  return (
    <div className="min-h-screen bg-[#FCFAFB] flex text-[#1F2937] font-sans antialiased">
      <ToastContainer />
      
      {/* 1. LEFT SIDEBAR: Dark Navy Blue Theme */}
      <aside className="hidden lg:flex w-60 bg-[#182D66] text-white flex-col justify-between shrink-0 no-print">
        {/* Header Branding */}
        <div className="p-4 border-b border-[#2A4184] flex items-center gap-3">
          {schoolBranding.logo_url ? (
            <img src={schoolBranding.logo_url} alt="Logo" className="h-8 w-8 rounded-md bg-white p-0.5 object-contain" />
          ) : (
            <span className="h-8 w-8 bg-white text-[#182D66] rounded-md flex items-center justify-center font-extrabold text-sm shadow-sm">
              RS
            </span>
          )}
          <div>
            <h1 className="text-white text-sm font-bold tracking-wide">
              {schoolBranding.name}
            </h1>
            <span className="text-[9px] text-[#A5B4FC] font-semibold uppercase tracking-widest block">
              Management System
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navigation.map(item => {
            const hasSub = !!item.subItems;
            const isExpanded = expandedMenus[item.name];
            // Active if this item is exactly current page, or if a subitem matches current subtab (when this is parent)
            const isActive = currentPage === item.name || (hasSub && item.subItems?.includes(currentSubTab) && currentPage === item.name);
            const Icon = item.icon;

            return (
              <div key={item.name}>
                <button
                  onClick={() => hasSub ? toggleSubMenu(item.name) : handlePageNavigate(item.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive && !hasSub
                      ? 'bg-[#D9534F] text-white' 
                      : 'text-[#E2E8F0] hover:bg-[#2A4184] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {hasSub && (
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {hasSub && isExpanded && (
                  <div className="mt-1 mb-2 ml-4 pl-3 border-l border-[#2A4184] space-y-1">
                    {item.subItems?.map(subItem => {
                      const isSubActive = currentSubTab === subItem && currentPage === item.name;
                      return (
                        <button
                          key={subItem}
                          onClick={() => handlePageNavigate(item.name, subItem, item.name)}
                          className={`w-full flex items-center text-xs py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                            isSubActive 
                              ? 'text-white bg-[#2A4184] font-semibold' 
                              : 'text-[#94A3B8] hover:text-white hover:bg-[#2A4184]'
                          }`}
                        >
                          {subItem}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[#2A4184] space-y-0.5">
            {bottomNav.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={item.action || (() => handlePageNavigate(item.name))}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    item.name === 'Erase All Data' 
                      ? 'text-rose-400 hover:bg-rose-500/10' 
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#2A4184]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer Contact Info */}
        <div className="p-4 border-t border-[#2A4184] bg-[#14265A]">
          <div className="text-[10px] text-[#94A3B8] space-y-1">
            <p className="truncate">{schoolBranding.address || 'Lahore, Pakistan'}</p>
            <p>{schoolBranding.phone || '0300-0000000'}</p>
            <p className="truncate">{schoolBranding.email || 'info@school.com'}</p>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Shell Header */}
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 shrink-0 no-print z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{currentPage}</h2>
              <p className="text-xs text-gray-500 font-medium">Manage your {currentPage.toLowerCase()} efficiently.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedDummyData}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Database className="h-3.5 w-3.5" />
              + Fill Dummy Data
            </button>
            <button
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              User Guide
            </button>

            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            
            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {alertsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {alertsCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{localStorage.getItem('rs_admin_name') || 'Admin User'}</p>
                <p className="text-[10px] text-gray-500 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="h-9 w-9 bg-linear-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 transition-all">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Pages Area */}
        <main className="flex-1 p-6 overflow-y-auto print:p-0">
          {currentPage === 'Dashboard' && (
            <DashboardView db={db} onNavigate={handlePageNavigate} onRefresh={refreshDatabase} />
          )}

          {currentPage === 'Admissions' && (
            <AdmissionsView
              db={db}
              onRefresh={refreshDatabase}
              onNavigate={handlePageNavigate}
              initialTab={currentSubTab || 'All Students'}
            />
          )}

          {(currentPage === 'Families' || currentPage === 'Sibling Family Portals') && (
            <FamiliesView
              db={db}
              schoolBranding={schoolBranding}
              onRefresh={refreshDatabase}
              onNavigate={handlePageNavigate}
            />
          )}

          {(currentPage === 'Staff' || currentPage === 'Staff Directory' || currentPage === 'Employee Directory') && (
            <StaffView db={db} onRefresh={refreshDatabase} />
          )}

          {(currentPage === 'Settings' || currentPage === 'Class & Lectures') && (
            <SettingsView
              db={db}
              schoolBranding={schoolBranding}
              onUpdateBranding={handleUpdateBrandingInUI}
              onRefresh={refreshDatabase}
              activeTab={currentSubTab || 'Branding'}
            />
          )}

          {(currentPage === 'Attendance' || currentPage === 'Attendance Registers') && (
            <AttendanceView db={db} onRefresh={refreshDatabase} />
          )}

          {(currentPage === 'Fee Management' || currentPage === 'Fees & Collections') && (
            <FeeManagementView
              db={db}
              schoolBranding={schoolBranding}
              onRefresh={refreshDatabase}
              initialTab={currentSubTab || 'Collect Fee'}
            />
          )}

          {(currentPage === 'Accounting' || currentPage === 'Double-Entry Ledger') && (
            <FinanceView db={db} onRefresh={refreshDatabase} />
          )}

          {(currentPage === 'Exam Management' || currentPage === 'Report Cards & Marks') && (
            <ExamsView db={db} schoolBranding={schoolBranding} onRefresh={refreshDatabase} />
          )}

          {(currentPage === 'ID Cards' || currentPage === 'Smart ID Cards') && (
            <IdentityCardsView db={db} schoolBranding={schoolBranding} />
          )}

          {(currentPage === 'School Growth' || currentPage === 'AI Growth Roadmap') && (
            <GrowthRoadmapView />
          )}

          {currentPage === 'Ledger' && (
            <LedgerView db={db} onRefresh={refreshDatabase} />
          )}
          
          {currentPage === 'Additional' && (
            <AdditionalView db={db} schoolBranding={schoolBranding} />
          )}

          {/* Work in progress pages */}
          {['Communication', 'Birthdays', 'Request a Feature', 'Our Services', 'Developer Info', 'Bulk Operations', 'Backup / Import', 'Old Data'].includes(currentPage) && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <div className="p-4 bg-gray-50 rounded-full">
                <LayoutDashboard className="h-8 w-8 text-gray-300" />
              </div>
              <h2 className="text-xl font-semibold text-gray-600">{currentPage} Module</h2>
              <p className="text-sm">This module is part of Phase 2-10 implementation.</p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile navigation sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <aside className="relative w-60 bg-[#182D66] text-white flex flex-col justify-between z-50 h-full shadow-2xl">
            <div className="p-4 border-b border-[#2A4184] flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <span className="h-6 w-6 bg-white text-[#182D66] rounded-md flex items-center justify-center font-bold text-xs shadow-sm">
                   RS
                 </span>
                 <h1 className="text-white text-xs font-bold uppercase truncate">{schoolBranding.name}</h1>
               </div>
               <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded hover:bg-[#2A4184] text-white cursor-pointer">
                 <X className="h-5 w-5" />
               </button>
            </div>
            
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navigation.map(item => {
                const hasSub = !!item.subItems;
                const isExpanded = expandedMenus[item.name];
                const isActive = currentPage === item.name || (hasSub && item.subItems?.includes(currentSubTab) && currentPage === item.name);
                const Icon = item.icon;

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => hasSub ? toggleSubMenu(item.name) : handlePageNavigate(item.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive && !hasSub ? 'bg-[#D9534F] text-white' : 'text-[#E2E8F0] hover:bg-[#2A4184]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                      {hasSub && <ChevronDown className={`h-4 w-4 ${isExpanded ? 'rotate-180' : ''}`} />}
                    </button>
                    {hasSub && isExpanded && (
                      <div className="mt-1 mb-2 ml-4 pl-3 border-l border-[#2A4184] space-y-1">
                        {item.subItems?.map(sub => (
                          <button
                            key={sub}
                            onClick={() => handlePageNavigate(item.name, sub, item.name)}
                            className={`w-full flex items-center text-xs py-1.5 px-2 rounded-md transition-colors ${
                              currentSubTab === sub && currentPage === item.name ? 'text-white bg-[#2A4184]' : 'text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Notification slide-out drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        db={db}
        onNavigate={(page, subTab) => handlePageNavigate(page, subTab)}
      />
    </div>
  );
}
