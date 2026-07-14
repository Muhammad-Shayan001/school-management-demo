/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DatabaseSchema } from '../types';

interface LedgerViewProps {
  db: DatabaseSchema;
  onRefresh: () => void;
}

export default function LedgerView({ db, onRefresh }: LedgerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'DEBIT' | 'CREDIT'>('all');

  const ledgerEntries = db.ledger_entries;
  
  const creditSum = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
  const debitSum = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
  const currentCashBalance = creditSum - debitSum;

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Accounts Workspace
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Double-Entry Ledger</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Auto-generated ledger display. Read-only record of all financial transactions across the school.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Closing Balance
            </span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono mt-1 block">
              Rs. {currentCashBalance.toLocaleString()}
            </span>
          </div>
          <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Total Credit (Inflow)
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
              Rs. {creditSum.toLocaleString()}
            </span>
          </div>
          <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Total Debit (Outflow)
            </span>
            <span className="text-2xl font-extrabold text-rose-600 font-mono mt-1 block">
              Rs. {debitSum.toLocaleString()}
            </span>
          </div>
          <div className="h-10 w-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
            <ArrowDownRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4"
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ledger description, reference ID, category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 pl-10 border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
          >
            <option value="all">All Transactions</option>
            <option value="CREDIT">Credits (+) Only</option>
            <option value="DEBIT">Debits (-) Only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <th className="p-3">Ref ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Debit (-)</th>
                <th className="p-3 text-right">Credit (+)</th>
                <th className="p-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ledgerEntries
                .filter(e => {
                  const str = `${e.source} ${e.reference}`.toLowerCase();
                  const matchesSearch = str.includes(searchQuery.toLowerCase());
                  const matchesType =
                    typeFilter === 'all' ||
                    (typeFilter === 'DEBIT' && e.debit > 0) ||
                    (typeFilter === 'CREDIT' && e.credit > 0);
                  return matchesSearch && matchesType;
                })
                .slice()
                .reverse()
                .map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-bold text-gray-400 uppercase">{e.id.slice(0, 8)}</td>
                    <td className="p-3 text-gray-400 font-mono">{e.date}</td>
                    <td className="p-3 font-semibold text-gray-700">{e.reference}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[10px] font-bold">
                        {e.source}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      {e.debit > 0 ? `Rs. ${e.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-green-600">
                      {e.credit > 0 ? `Rs. ${e.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-700">
                      Rs. {e.running_balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
