import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Skeleton from "react-loading-skeleton";

const ActivityTimelineChart = ({ timeDistributions = {}, loading = false }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState("hourly");
  const [chartData, setChartData] = useState(null);

  // Format hour display (e.g., "9am", "2pm")
  const formatHourLabel = (hour) => {
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour >= 12 ? 'pm' : 'am';
    return `${formattedHour}${period}`;
  };

  useEffect(() => {
    if (!timeDistributions) return;
    
    let labels = [];
    let datasets = [];
    let activeData = [];

    // Set data based on selected time range
    switch (timeRange) {
      case "hourly":
        activeData = timeDistributions.hourly || [];
        labels = activeData.map((item) => item.label || formatHourLabel(item.hour));
        break;
      case "daily":
        activeData = timeDistributions.daily || [];
        labels = activeData.map((item) => item.dateLabel);
        break;
      case "monthly":
        activeData = timeDistributions.monthly || [];
        labels = activeData.map((item) => item.monthLabel);
        break;
      default:
        activeData = timeDistributions.hourly || [];
        labels = activeData.map((item) => item.label || formatHourLabel(item.hour));
    }

    // Create datasets
    datasets = [
      {
        label: "Lineups",
        data: activeData.map((item) => item.lineups),
        borderColor: "#3B82F6", // blue
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        tension: 0.4,
        fill: false,
        pointRadius: 3,
      },
      {
        label: "Selections",
        data: activeData.map((item) => item.selections),
        borderColor: "#10B981", // green
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        tension: 0.4,
        fill: false,
        pointRadius: 3,
      },
      {
        label: "Joinings",
        data: activeData.map((item) => item.joinings),
        borderColor: "#8B5CF6", // purple
        backgroundColor: "rgba(139, 92, 246, 0.5)",
        tension: 0.4,
        fill: false,
        pointRadius: 3,
      },
      {
        label: "Calls",
        data: activeData.map((item) => item.calls),
        borderColor: "#F97316", // orange
        backgroundColor: "rgba(249, 115, 22, 0.5)",
        tension: 0.4,
        fill: false,
        pointRadius: 3,
      },
    ];

    setChartData({
      labels,
      datasets,
    });
  }, [timeRange, timeDistributions]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
        align: "end",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
      title: {
        display: false,
      },
    },
  };

  // Time range selector options
  const timeRangeOptions = [
    { value: "hourly", label: t("Today (Hourly)") },
    { value: "daily", label: t("This Week (Daily)") },
    { value: "monthly", label: t("This Year (Monthly)") },
  ];

  // Get title based on selected time range
  const getChartTitle = () => {
    switch (timeRange) {
      case "hourly":
        return t("Today's Activity Timeline");
      case "daily":
        return t("Weekly Activity Timeline");
      case "monthly":
        return t("Yearly Activity Timeline");
      default:
        return t("Activity Timeline");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {getChartTitle()}
        </h2>
        <div className="flex items-center">
          <select
            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            disabled={loading}
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton height={300} width="100%" />
          </div>
        ) : chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            {t("No data available")}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimelineChart; 