import React from 'react';
import AttendanceCalendar from './AttendanceCalendar';

const AttendanceSection = () => {
  return (
    <div className="bg-gray-100 rounded-xl p-6 sm:p-8 my-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Attendance Calendar</h2>
        <p className="text-gray-600">Track your attendance, leaves, and weekoffs</p>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceCalendar />
        </div>
        
        <div className="flex flex-col gap-5">
          {/* Leave Balance Card */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 pb-3 mb-3 border-b border-gray-200">Leave Balance</h3>
            
            <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
              <span className="text-gray-700 font-medium">Casual Leave (CL)</span>
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded">7/12</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
              <span className="text-gray-700 font-medium">Sick Leave (SL)</span>
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded">5/7</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5">
              <span className="text-gray-700 font-medium">Privilege Leave (PL)</span>
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded">14/15</span>
            </div>
          </div>
          
          {/* Pending Leaves Card */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 pb-3 mb-3 border-b border-gray-200">Pending Leaves</h3>
            
            <div className="flex flex-col gap-1.5 py-2">
              <span className="text-gray-700 font-medium">May 12-14, 2023</span>
              <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-1 rounded w-fit uppercase">Pending</span>
              <span className="text-gray-600">Casual Leave (3 days)</span>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-col gap-3 mt-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded flex justify-center items-center transition-colors">
              Apply for Leave
            </button>
            
            <button className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded flex justify-center items-center transition-colors">
              Download Attendance Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSection; 