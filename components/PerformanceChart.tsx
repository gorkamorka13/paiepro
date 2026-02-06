"use client";

import { LineChart } from "lucide-react";

interface PerformanceChartProps {
  timelineData: Array<{ period: string; net: number; gross: number }>;
}

export function PerformanceChart({ timelineData }: PerformanceChartProps) {
  if (timelineData.length === 0) return null;

  // Calculate hours estimate based on net salary (assuming ~12€/hour net average)
  const performanceData = timelineData.map((item) => ({
    period: item.period,
    net: item.net,
    hours: item.net > 0 ? item.net / 12 : 0, // Estimated hours based on net
  }));

  const maxNet = Math.max(...performanceData.map((d) => d.net));
  const maxHours = Math.max(...performanceData.map((d) => d.hours));
  const maxNetValue = Math.max(maxNet, 1);
  const maxHoursValue = Math.max(maxHours, 1);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
  };

  // Calculate max for both axes to create proper scaling

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-semibold">
            Performance Salaire vs Heures
          </h2>
        </div>
        <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
            <span className="text-gray-500">Salaire Net (€)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-500 rounded-sm"></div>
            <span className="text-gray-500">Heures (h)</span>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Chart Container */}
        <div className="relative h-56 flex">
          {/* Left Y-Axis - Net Salary */}
          <div className="flex flex-col justify-between pr-3 text-[10px] font-mono text-orange-600 w-16 shrink-0">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <span key={ratio}>{Math.round(maxNetValue * ratio)}€</span>
            ))}
          </div>

          {/* Main Chart Area */}
          <div className="flex-1 relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                <div
                  key={ratio}
                  className="w-full border-t border-gray-100 dark:border-gray-700/50"
                />
              ))}
            </div>

            {/* Lines Container */}
            <div className="absolute inset-0 flex items-end justify-around px-2">
              {performanceData.map((item, index) => {
                const netHeight = (item.net / maxNetValue) * 100;
                const hoursHeight = (item.hours / maxHoursValue) * 100;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center relative h-full group"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-gray-900/95 dark:bg-gray-100/95 text-white dark:text-gray-900 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 pointer-events-none whitespace-nowrap shadow-2xl backdrop-blur-md">
                      <p className="font-black border-b border-gray-200/20 dark:border-gray-700/20 pb-1.5 mb-1.5 uppercase tracking-widest">
                        {formatPeriod(item.period)}
                      </p>
                      <div className="space-y-1">
                        <p className="flex justify-between gap-6">
                          <span className="font-bold text-orange-400">
                            NET:
                          </span>
                          <span className="font-mono">
                            {item.net.toFixed(2)}€
                          </span>
                        </p>
                        <p className="flex justify-between gap-6">
                          <span className="font-bold text-teal-400">
                            HEURES:
                          </span>
                          <span className="font-mono">
                            {item.hours.toFixed(1)}h
                          </span>
                        </p>
                        <p className="flex justify-between gap-6 border-t border-gray-200/20 dark:border-gray-700/20 pt-1 mt-1">
                          <span className="font-bold">TAUX:</span>
                          <span className="font-mono">
                            {(item.net / item.hours).toFixed(2)}€/h
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Net Salary Line Point */}
                    <div
                      className="absolute w-3 h-3 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800 shadow-md z-10 group-hover:scale-150 transition-transform"
                      style={{
                        bottom: `${netHeight}%`,
                        left: "30%",
                      }}
                    />

                    {/* Hours Line Point */}
                    <div
                      className="absolute w-3 h-3 bg-teal-500 rounded-full border-2 border-white dark:border-gray-800 shadow-md z-10 group-hover:scale-150 transition-transform"
                      style={{
                        bottom: `${hoursHeight}%`,
                        left: "70%",
                      }}
                    />

                    {/* Connection Line for this period */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 5 }}
                    >
                      <line
                        x1="30%"
                        y1={`${100 - netHeight}%`}
                        x2="70%"
                        y2={`${100 - hoursHeight}%`}
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        opacity="0.3"
                      />
                      <defs>
                        <linearGradient
                          id="lineGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Y-Axis - Hours */}
          <div className="flex flex-col justify-between pl-3 text-[10px] font-mono text-teal-600 w-14 shrink-0">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <span key={ratio}>{Math.round(maxHoursValue * ratio)}h</span>
            ))}
          </div>
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-around px-16 mt-3">
          {performanceData.map((item, index) => (
            <div key={index} className="flex-1 flex justify-center">
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 tracking-tighter uppercase whitespace-nowrap">
                {formatPeriod(item.period)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">
              Moyenne Mensuelle
            </p>
            <p className="text-lg font-bold text-orange-600">
              {(
                performanceData.reduce((sum, d) => sum + d.net, 0) /
                performanceData.length
              ).toFixed(0)}
              €
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">
              Heures Moyennes
            </p>
            <p className="text-lg font-bold text-teal-600">
              {(
                performanceData.reduce((sum, d) => sum + d.hours, 0) /
                performanceData.length
              ).toFixed(0)}
              h
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Taux Moyen</p>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {(
                performanceData.reduce((sum, d) => sum + d.net / d.hours, 0) /
                performanceData.length
              ).toFixed(2)}
              €/h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
