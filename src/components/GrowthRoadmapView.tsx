/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ListTodo
} from 'lucide-react';

interface RoadmapItem {
  week: number;
  title: string;
  recommendation: string;
}

export default function GrowthRoadmapView() {
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([]);

  const fetchRoadmap = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/growth-roadmap', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.error('Error fetching AI roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const toggleWeekComplete = (week: number) => {
    if (completedWeeks.includes(week)) {
      setCompletedWeeks(completedWeeks.filter(w => w !== week));
    } else {
      setCompletedWeeks([...completedWeeks, week]);
    }
  };

  const progressPercent = Math.round((completedWeeks.length / 4) * 100);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-500" />
            AI Operations Intelligence
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-1">30-Day Bilingual Growth Roadmap</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Gemini 3.5-flash compiles active school metrics (dues, attendance, registrations) into weekly business suggestions.
          </p>
        </div>

        <button
          onClick={fetchRoadmap}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Re-generating...' : 'Regenerate Roadmap'}
        </button>
      </div>

      {/* Main Roadmap Area */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center space-y-4 shadow-sm flex flex-col items-center">
          <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin" />
          <h3 className="font-bold text-gray-800 text-sm">Consulting Gemini 3.5-flash...</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Analyzing outstanding fees, enrollment metrics, and student rosters to produce custom roman-urdu actionable roadmaps.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ListTodo className="h-4 w-4 text-gray-400" /> Action Checklist
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                Progress: {progressPercent}% Done
              </span>
            </div>

            <div className="space-y-4">
              {roadmap.map((item, index) => {
                const isDone = completedWeeks.includes(item.week);
                return (
                  <motion.div
                    key={item.week}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all flex gap-4 ${
                      isDone ? 'border-emerald-200 bg-emerald-50/10' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* Checkbox circle indicator */}
                    <button
                      onClick={() => toggleWeekComplete(item.week)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2 cursor-pointer transition-all ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-200 hover:border-gray-400 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                        Week {item.week} Focus
                      </span>
                      <h4 className={`text-sm font-bold transition-all ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {item.title}
                      </h4>
                      <p className={`text-xs leading-relaxed ${isDone ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.recommendation}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* AI Metrics Analysis Card - Right Column */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-50 pb-3">
                <TrendingUp className="h-4.5 w-4.5 text-orange-500" />
                AI Strategy Insights
              </h3>

              <div className="space-y-3.5">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs leading-relaxed text-slate-600 font-medium">
                  We detect high uncollected school fees. Your Weeks 1 &amp; 2 suggestions explicitly target personalized recovery notifications.
                </div>

                <div className="pt-2 divide-y divide-gray-100 text-xs text-gray-500 font-semibold space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span>In-App Consultant:</span>
                    <span className="text-gray-900">Gemini 3.5-flash</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>Roman-Urdu Mode:</span>
                    <span className="text-green-600">Enabled (Bilingual)</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span>Recommendation Freshness:</span>
                    <span className="text-gray-900 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                      Live Snap
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-950 rounded-2xl text-white shadow space-y-3">
              <span className="text-[10px] font-bold text-indigo-300 uppercase block font-mono">
                System Advisory
              </span>
              <p className="text-xs leading-relaxed text-slate-300">
                Weekly goals check karr ke operational goals clear karein. Direct messaging alerts trigger kerne ke liye <strong>Fee Management</strong> module use karein.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
