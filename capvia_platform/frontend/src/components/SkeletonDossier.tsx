'use client';

import React from 'react';

export default function SkeletonDossier() {
  return (
    <div className="space-y-8 animate-pulse font-sans text-slate-400">
      
      {/* Top Header controls skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-3 w-full max-w-lg">
          <div className="h-9 w-9 rounded-xl bg-slate-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded-md w-24" />
            <div className="h-6 bg-slate-200 rounded-md w-3/4" />
            <div className="h-3 bg-slate-200 rounded-md w-1/2" />
          </div>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <div className="h-9 w-28 bg-slate-200 rounded-full" />
          <div className="h-9 w-24 bg-slate-200 rounded-full" />
        </div>
      </div>

      {/* Progress & Real-time Info Banner Skeleton */}
      <div className="bg-white border border-slate-150 rounded-[24px] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4 w-full">
          <div className="h-14 w-14 rounded-2xl bg-slate-200 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-slate-200 rounded-md w-20" />
            <div className="h-5 bg-slate-200 rounded-md w-48" />
            <div className="h-3 bg-slate-200 rounded-md w-full max-w-sm" />
          </div>
        </div>
        <div className="h-16 w-32 bg-slate-200 rounded-2xl flex-shrink-0" />
      </div>

      {/* Score Widgets Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="h-3 bg-slate-200 rounded-md w-20" />
            <div className="h-8 bg-slate-200 rounded-md w-14" />
            <div className="h-3 bg-slate-200 rounded-md w-24" />
          </div>
        ))}
      </div>

      {/* Main Grid Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Tab contents placeholder (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 py-1.5 space-x-6">
            <div className="h-4 bg-slate-200 rounded-md w-24 py-2" />
            <div className="h-4 bg-slate-200 rounded-md w-24 py-2" />
            <div className="h-4 bg-slate-200 rounded-md w-24 py-2" />
            <div className="h-4 bg-slate-200 rounded-md w-24 py-2" />
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-4 bg-slate-200 rounded-md w-32" />
              <div className="h-6 bg-slate-200 rounded-full w-16" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-28 bg-slate-100 rounded-xl" />
              <div className="h-28 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Right Column: Timeline Stepper placeholder (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="h-4 bg-slate-200 rounded-md w-24" />
            <div className="space-y-6 pl-2 py-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-slate-200 flex-shrink-0" />
                  <div className="space-y-2 flex-1 pt-1.5">
                    <div className="h-3.5 bg-slate-200 rounded-md w-20" />
                    <div className="h-2.5 bg-slate-200 rounded-md w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
