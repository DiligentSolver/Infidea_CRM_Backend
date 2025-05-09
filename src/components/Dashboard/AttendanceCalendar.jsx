import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceCalendar = () => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [hoverInfo, setHoverInfo] = useState(null);

  // Fetch calendar data for the selected month and year
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/employee-dashboard/attendance-calendar', {
          params: {
            month: currentMonth,
            year: currentYear
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.data.success) {
          setCalendarData(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch calendar data');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching calendar data');
        console.error('Calendar fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [currentMonth, currentYear]);

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    if (!calendarData) return [];

    const { year, month, calendar } = calendarData;
    const daysInMonth = calendarData.totalDays;
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0 (Sunday) - 6 (Saturday)
    
    // Create blanks for days before the 1st of the month
    const blanks = Array(firstDay).fill(null).map((_, index) => (
      <div key={`blank-${index}`} className="aspect-[1.1] bg-gray-100 border border-gray-200"></div>
    ));
    
    // Create day elements
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = calendar[day] || { status: 'Present', type: 'P' };
      
      // Determine day classes and styles based on status
      let baseClasses = "aspect-[1.1] flex flex-col items-center justify-center p-2 relative border cursor-default transition-transform hover:scale-105 hover:z-10 hover:shadow-md";
      let bgColor = "bg-white";
      let textColor = "text-gray-800";
      let borderStyle = "border-gray-200";
      
      // Add status-based classes
      if (dayData.type === 'WO') {
        bgColor = "bg-gray-200";
        textColor = "text-gray-600";
      } else if (dayData.type === 'P') {
        bgColor = "bg-green-50";
        textColor = "text-green-800";
      } else if (dayData.type === 'U') {
        bgColor = "bg-gray-50";
        textColor = "text-gray-500";
        borderStyle = "border-dashed border-gray-300";
      } else if (dayData.type.includes('SL')) {
        bgColor = "bg-red-50";
        textColor = "text-red-700";
      } else if (dayData.type.includes('CL')) {
        bgColor = "bg-amber-50";
        textColor = "text-amber-700";
      } else if (dayData.type.includes('PL')) {
        bgColor = "bg-blue-50";
        textColor = "text-blue-700";
      }
      
      // Add approval status classes
      if (dayData.approved === false && dayData.type !== 'P' && dayData.type !== 'WO') {
        borderStyle = "border-orange-400 border-dashed border-2";
      } else if (dayData.isSandwich) {
        borderStyle = "border-orange-400 border-2";
        bgColor = "bg-amber-100";
        textColor = "text-amber-800";
      }
      
      // Handle half-day and early-logout styling with custom styles
      let customStyle = {};
      
      if (dayData.type && dayData.type.includes('-HD')) {
        // Half-day requires a gradient background (can't do with Tailwind alone)
        let gradientColor = '#ffe9e9'; // default to SL color
        
        if (dayData.type.includes('CL')) {
          gradientColor = '#fff6e9';
        } else if (dayData.type.includes('PL')) {
          gradientColor = '#e9f0ff';
        }
        
        customStyle = {
          background: `linear-gradient(135deg, ${gradientColor} 0%, ${gradientColor} 50%, #e9ffef 50%, #e9ffef 100%)`,
        };
      }
      
      if (dayData.type && dayData.type.includes('-EL')) {
        borderStyle = "border-gray-500 border";
        customStyle = {
          ...customStyle,
          borderBottom: '4px solid #6c757d'
        };
      }
      
      // Check if it's today
      const isToday = 
        new Date().getDate() === day && 
        new Date().getMonth() === month - 1 && 
        new Date().getFullYear() === year;
      
      if (isToday) {
        borderStyle = "border-blue-500 border-2";
      }
      
      // Handle mouse events for hover information
      const handleMouseEnter = () => {
        if (dayData.type !== 'P' && dayData.type !== 'WO') {
          setHoverInfo({
            day,
            status: dayData.status,
            description: dayData.description || 'No description provided',
            position: { x: 0, y: 0 } // Will be updated on mousemove
          });
        }
      };
      
      const handleMouseLeave = () => {
        setHoverInfo(null);
      };
      
      const handleMouseMove = (e) => {
        if (hoverInfo) {
          // Update tooltip position based on mouse position
          setHoverInfo({
            ...hoverInfo,
            position: { 
              x: e.clientX + 10, 
              y: e.clientY + 10 
            }
          });
        }
      };
      
      days.push(
        <div 
          key={`day-${day}`} 
          className={`${baseClasses} ${bgColor} ${textColor} ${borderStyle}`}
          style={customStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          <span className="font-semibold text-base mb-1">{day}</span>
          <span className="text-xs font-medium">{dayData.type}</span>
        </div>
      );
    }
    
    return [...blanks, ...days];
  };

  // Navigate to previous month
  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Get month name
  const getMonthName = (month) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1];
  };

  // Render calendar
  return (
    <div className="bg-white rounded-lg shadow-md p-5 my-5 w-full max-w-[900px] relative font-sans">
      <div className="flex items-center justify-between mb-5">
        <button 
          className="bg-gray-100 hover:bg-gray-200 rounded-full h-9 w-9 flex items-center justify-center text-gray-700 transition-colors"
          onClick={goToPrevMonth}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <h2 className="text-2xl font-semibold text-gray-800">{getMonthName(currentMonth)} {currentYear}</h2>
        <button 
          className="bg-gray-100 hover:bg-gray-200 rounded-full h-9 w-9 flex items-center justify-center text-gray-700 transition-colors"
          onClick={goToNextMonth}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3">Loading calendar data...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-red-600">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 bg-gray-100 rounded-t-md py-3 text-center font-semibold text-gray-600">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          
          <div className="grid grid-cols-7 gap-[2px] rounded-b-md overflow-hidden">
            {generateCalendarDays()}
          </div>
          
          <div className="flex flex-wrap gap-3 mt-5 p-4 bg-gray-100 rounded-md">
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-green-50 border border-green-700"></span>
              <span>Present (P)</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-gray-200 border border-gray-500"></span>
              <span>Week Off (WO)</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-gray-50 border border-dashed border-gray-300"></span>
              <span>Upcoming (U)</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-red-50 border border-red-700"></span>
              <span>Sick Leave (SL)</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-amber-50 border border-amber-700"></span>
              <span>Casual Leave (CL)</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-blue-50 border border-blue-700"></span>
              <span>Privilege Leave (PL)</span>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-3.5 h-3.5 mr-1.5 rounded border border-gray-500 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffe9e9 0%, #ffe9e9 50%, #e9ffef 50%, #e9ffef 100%)' }}></div>
              <span>Half Day (-HD)</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-white border border-gray-500" style={{ borderBottom: '3px solid #6c757d' }}></span>
              <span>Early Logout (-EL)</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-white border-2 border-dashed border-orange-400"></span>
              <span>Pending Approval</span>
            </div>
            <div className="flex items-center text-xs">
              <span className="inline-block w-3.5 h-3.5 mr-1.5 rounded bg-amber-100 border border-orange-400"></span>
              <span>Sandwich Leave</span>
            </div>
          </div>
        </>
      )}
      
      {/* Hover tooltip for leave description */}
      {hoverInfo && (
        <div 
          className="fixed bg-white rounded-md shadow-lg p-3 z-50 min-w-[250px] max-w-[320px] pointer-events-none animate-fadeIn"
          style={{ 
            top: `${hoverInfo.position.y}px`, 
            left: `${hoverInfo.position.x}px`,
            animation: 'fadeIn 0.2s' 
          }}
        >
          <h4 className="text-base font-medium text-gray-700 mb-2 pb-1.5 border-b border-gray-200">Day {hoverInfo.day}</h4>
          <p className="text-sm text-gray-600 my-1"><strong>Status:</strong> {hoverInfo.status}</p>
          <p className="text-sm text-gray-600 my-1"><strong>Description:</strong> {hoverInfo.description}</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar; 