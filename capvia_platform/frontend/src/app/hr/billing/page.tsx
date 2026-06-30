'use client';

import React from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { CreditCard, Check, Clock, ShieldCheck, HelpCircle } from 'lucide-react';

export default function HRBillingPage() {
  const currentPlan = {
    name: 'Enterprise Scale Plan',
    price: '$499/mo',
    billingCycle: 'Monthly',
    nextInvoiceDate: 'July 15, 2026',
    limits: {
      seats: '20 Recruiters (15 active)',
      vacancies: 'Unlimited Listings',
      assessments: '1,500/mo (342 used)'
    }
  };

  const invoiceHistory = [
    { date: 'June 15, 2026', id: 'INV-2026-003', amount: '$499.00', status: 'Paid' },
    { date: 'May 15, 2026', id: 'INV-2026-002', amount: '$499.00', status: 'Paid' },
    { date: 'April 15, 2026', id: 'INV-2026-001', amount: '$499.00', status: 'Paid' },
  ];

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Billing & Plans" breadcrumbs={[{ label: 'Workspace' }, { label: 'Billing' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Billing & Subscriptions</h2>
            <p className="text-slate-500 text-xs mt-1">Review active tier limits, verify payment methods, and download invoice logs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Plan Overview */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Current Subscription</span>
                <h3 className="text-xl font-bold text-slate-900 font-outfit mt-1">{currentPlan.name}</h3>
              </div>
              <span className="text-xl font-black text-[#0D47A1] font-outfit">{currentPlan.price}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-450 block font-bold uppercase">Recruiter Seats</span>
                <span className="text-xs font-bold text-slate-800 block mt-1.5">{currentPlan.limits.seats}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-450 block font-bold uppercase">Vacancy Campaigns</span>
                <span className="text-xs font-bold text-[#0D47A1] block mt-1.5">{currentPlan.limits.vacancies}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-450 block font-bold uppercase">Monthly Evaluations</span>
                <span className="text-xs font-bold text-slate-800 block mt-1.5">{currentPlan.limits.assessments}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                <Clock className="h-4 w-4 text-[#0D47A1] mr-2" />
                Renewal & Next Invoice
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Your subscription auto-renews on <strong className="text-slate-800 font-bold">{currentPlan.nextInvoiceDate}</strong>. Payment will be processed via your primary payment method.
              </p>
            </div>
          </div>

          {/* Payment Card & Invoices */}
          <div className="space-y-6">
            
            {/* Credit Card stub */}
            <div className="bg-gradient-to-br from-[#0D47A1] to-[#42A5F5] rounded-2xl p-6 shadow-lg text-white flex flex-col justify-between h-48 text-left">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold tracking-wider uppercase opacity-85">CAPVIA Recruiter Card</span>
                <span className="text-lg">🏦</span>
              </div>
              
              <div>
                <span className="text-lg font-bold tracking-widest block">•••• •••• •••• 4242</span>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <span className="text-[8px] uppercase opacity-75 block">Cardholder</span>
                    <span className="text-xs font-bold block mt-0.5">Corporate Admin</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase opacity-75 block">Expires</span>
                    <span className="text-xs font-bold block mt-0.5">12/28</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices list */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Payment Receipts</h4>
              
              <div className="space-y-3">
                {invoiceHistory.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2.5">
                    <div>
                      <span className="font-bold text-slate-800 block">{inv.id}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">{inv.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-850 block">{inv.amount}</span>
                      <span className="text-[9px] text-[#10B981] font-bold block mt-0.5">{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
