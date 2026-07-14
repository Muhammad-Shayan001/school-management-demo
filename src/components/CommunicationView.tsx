/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Send, Users, History, AlertCircle } from 'lucide-react';

export default function CommunicationView() {
  const [currentSubTab, setCurrentSubTab] = useState('Announcements');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Communication Center
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Announcements & Messaging</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Manage school-wide announcements, WhatsApp integration, and communication history.
        </p>

        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {['Announcements', 'Message History'].map(tab => (
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

      {currentSubTab === 'Announcements' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Compose New Announcement</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Audience</label>
                <select className="w-full text-xs p-2.5 border border-gray-200 rounded focus:outline-none bg-white">
                  <option>All Parents & Guardians</option>
                  <option>All Staff Members</option>
                  <option>Specific Class Parents</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message Content</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded focus:outline-none h-32 resize-none"
                  placeholder="Dear Parents, School will remain closed tomorrow due to heavy rain..."
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Send via SMS
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Send via WhatsApp
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Show on Parent Portal
                </label>
              </div>
              <button type="button" onClick={() => alert('Message queued for sending.')} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                <Send className="h-4 w-4" /> Broadcast Announcement
              </button>
            </form>
          </div>
          <div className="bg-slate-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Communication Gateway</h3>
            <p className="text-xs text-gray-500 mt-2 max-w-sm">Connect your school's WhatsApp Business API in settings to unlock seamless parent communication.</p>
          </div>
        </motion.div>
      )}

      {currentSubTab === 'Message History' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Broadcast History</h3>
          <p className="text-sm text-gray-500">No recent messages sent.</p>
        </motion.div>
      )}
    </div>
  );
}
