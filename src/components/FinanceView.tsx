/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Search,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileText,
  AlertCircle,
  Package,
  BookOpen
} from 'lucide-react';
import { DatabaseSchema, Expense, Income, BadDebt, StationeryItem, InventoryItem } from '../types';
import { addToast } from './Toast';

interface FinanceViewProps {
  db: DatabaseSchema;
  onRefresh: () => void;
}

export default function FinanceView({ db, onRefresh }: FinanceViewProps) {
  const [currentSubTab, setCurrentSubTab] = useState('Reports');

  // Forms state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [studentId, setStudentId] = useState('');

  // Computations for Reports
  const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = db.income.reduce((sum, i) => sum + i.amount, 0);
  const totalFeeCollected = db.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInflow = totalIncome + totalFeeCollected;
  const netBalance = totalInflow - totalExpenses;
  const totalBadDebts = db.bad_debts.reduce((sum, b) => sum + b.amount, 0);

  // Data helpers
  const students = db.students || [];

  const handlePostExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0 || !category) return addToast('warning', 'Fill all fields');
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount, category })
      });
      if (res.ok) {
        addToast('success', 'Expense recorded');
        setDescription(''); setAmount(0); setCategory('');
        onRefresh();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete expense?')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handlePostIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0 || !category) return addToast('warning', 'Fill all fields');
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount, source: category })
      });
      if (res.ok) {
        addToast('success', 'Income recorded');
        setDescription(''); setAmount(0); setCategory('');
        onRefresh();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteIncome = async (id: string) => {
    if (!confirm('Delete income?')) return;
    try {
      await fetch(`/api/income/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handlePostBadDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || amount <= 0 || !description) return addToast('warning', 'Fill all fields');
    try {
      const res = await fetch('/api/bad-debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, amount, reason: description })
      });
      if (res.ok) {
        addToast('success', 'Bad Debt recorded');
        setDescription(''); setAmount(0); setStudentId('');
        onRefresh();
      }
    } catch (err) { console.error(err); }
  };

  const handlePostStationery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || quantity <= 0 || amount <= 0) return addToast('warning', 'Fill all fields');
    try {
      const res = await fetch('/api/stationery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: description, quantity, unit_price: amount })
      });
      if (res.ok) {
        addToast('success', 'Stationery recorded');
        setDescription(''); setAmount(0); setQuantity(1);
        onRefresh();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteStationery = async (id: string) => {
    if (!confirm('Delete stationery item?')) return;
    try {
      await fetch(`/api/stationery/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handlePostInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !category || quantity <= 0 || amount <= 0) return addToast('warning', 'Fill all fields');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: description, category, quantity, value: amount })
      });
      if (res.ok) {
        addToast('success', 'Inventory item recorded');
        setDescription(''); setAmount(0); setCategory(''); setQuantity(1);
        onRefresh();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm('Delete inventory item?')) return;
    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block font-mono">
          Finance Module
        </span>
        <h2 className="text-xl font-bold text-slate-800 mt-1">School Accounts &amp; Finance</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Manage operational expenditures, external income, bad debts, and institutional inventory.
        </p>

        <div className="flex flex-wrap gap-1.5 mt-4 no-print border-t border-slate-100 pt-4">
          {['Reports', 'Expenses', 'Income', 'Bad Debts', 'Stationery', 'Inventory'].map(tab => (
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

      {currentSubTab === 'Reports' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Balance</span>
              <span className="text-2xl font-extrabold text-indigo-600 font-mono mt-1 block">Rs. {netBalance.toLocaleString()}</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Inflow</span>
              <span className="text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">Rs. {totalInflow.toLocaleString()}</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Expenses</span>
              <span className="text-2xl font-extrabold text-rose-600 font-mono mt-1 block">Rs. {totalExpenses.toLocaleString()}</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Bad Debts</span>
              <span className="text-2xl font-extrabold text-orange-600 font-mono mt-1 block">Rs. {totalBadDebts.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Financial Summary</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
              This school has generated <b>Rs. {totalFeeCollected.toLocaleString()}</b> from student fee payments and <b>Rs. {totalIncome.toLocaleString()}</b> from other income sources, totaling <b>Rs. {totalInflow.toLocaleString()}</b> in gross inflow. Meanwhile, <b>Rs. {totalExpenses.toLocaleString()}</b> has been expended on operational costs. A total of <b>Rs. {totalBadDebts.toLocaleString()}</b> has been written off as unrecoverable bad debts. 
            </p>
          </div>
        </motion.div>
      )}

      {currentSubTab === 'Expenses' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Add New Expense</h3>
            <form onSubmit={handlePostExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (Rs)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded bg-white" required>
                  <option value="">Select Category...</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Misc">Miscellaneous</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-800">Record Expense</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Expense Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {db.expenses.map(e => (
                    <tr key={e.id} className="border-b border-gray-50">
                      <td className="p-2">{e.date}</td>
                      <td className="p-2 font-medium">{e.description}</td>
                      <td className="p-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{e.category}</span></td>
                      <td className="p-2 text-right font-bold text-rose-600">Rs. {e.amount.toLocaleString()}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {currentSubTab === 'Income' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Add Other Income</h3>
            <form onSubmit={handlePostIncome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (Rs)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Source</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded bg-white" required>
                  <option value="">Select Source...</option>
                  <option value="Donation">Donation / Funding</option>
                  <option value="Canteen">Canteen Rent</option>
                  <option value="Sale">Sale of Old Assets</option>
                  <option value="Misc">Miscellaneous</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-800">Record Income</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Other Income Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Source</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {db.income.map(i => (
                    <tr key={i.id} className="border-b border-gray-50">
                      <td className="p-2">{i.date}</td>
                      <td className="p-2 font-medium">{i.description}</td>
                      <td className="p-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{i.source}</span></td>
                      <td className="p-2 text-right font-bold text-emerald-600">Rs. {i.amount.toLocaleString()}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => handleDeleteIncome(i.id)} className="text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {currentSubTab === 'Bad Debts' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Write-off Bad Debt</h3>
            <form onSubmit={handlePostBadDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Student</label>
                <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded bg-white" required>
                  <option value="">Select Student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.reg_no})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Written Off (Rs)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Notes</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <button type="submit" className="w-full py-2 bg-orange-600 text-white rounded text-xs font-bold hover:bg-orange-700">Record Bad Debt</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Bad Debts Register</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-2">Date</th>
                    <th className="p-2">Student</th>
                    <th className="p-2">Reason</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {db.bad_debts.map(b => {
                    const st = students.find(s => s.id === b.student_id);
                    return (
                      <tr key={b.id} className="border-b border-gray-50">
                        <td className="p-2">{b.date}</td>
                        <td className="p-2 font-medium">{st ? st.name : 'Unknown'}</td>
                        <td className="p-2">{b.reason}</td>
                        <td className="p-2 text-right font-bold text-orange-600">Rs. {b.amount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {currentSubTab === 'Stationery' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Add Stationery Stock</h3>
            <form onSubmit={handlePostStationery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
                <input type="number" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Price (Rs)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <button type="submit" className="w-full py-2 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-800">Add Stationery</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Stationery Inventory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-2">Item Name</th>
                    <th className="p-2 text-right">Quantity</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Total Value</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {db.stationery_items?.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="p-2 font-medium">{s.item_name}</td>
                      <td className="p-2 text-right">{s.quantity}</td>
                      <td className="p-2 text-right">Rs. {s.unit_price.toLocaleString()}</td>
                      <td className="p-2 text-right font-bold text-gray-700">Rs. {(s.quantity * s.unit_price).toLocaleString()}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => handleDeleteStationery(s.id)} className="text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {currentSubTab === 'Inventory' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Add Fixed Asset / Inventory</h3>
            <form onSubmit={handlePostInventory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Name</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded bg-white" required>
                  <option value="">Select Category...</option>
                  <option value="Furniture">Furniture &amp; Fixtures</option>
                  <option value="IT Equipment">IT / Electronics</option>
                  <option value="Library Books">Library Books</option>
                  <option value="Lab Equipment">Lab Equipment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
                <input type="number" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Total Estimated Value (Rs)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="w-full text-xs p-2 border border-gray-200 rounded focus:outline-none" required />
              </div>
              <button type="submit" className="w-full py-2 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-800">Add Inventory</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">School Asset Register</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-2">Asset Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Quantity</th>
                    <th className="p-2 text-right">Total Value</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {db.inventory_items?.map(i => (
                    <tr key={i.id} className="border-b border-gray-50">
                      <td className="p-2 font-medium">{i.item_name}</td>
                      <td className="p-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{i.category}</span></td>
                      <td className="p-2 text-right">{i.quantity}</td>
                      <td className="p-2 text-right font-bold text-gray-700">Rs. {i.value.toLocaleString()}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => handleDeleteInventory(i.id)} className="text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
