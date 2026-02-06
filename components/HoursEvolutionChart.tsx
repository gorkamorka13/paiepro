"use client";

import { Clock } from "lucide-react";

interface HoursEvolutionChartProps {
  timelineData: Array<{
    period: string;
    net: number;
    gross: number;
    hours: number;
  }>;
}

export function HoursEvolutionChart({
  timelineData,
}: HoursEvolutionChartProps) {
  if (timelineData.length === 0) return null;

  // Use REAL hours data from payslips
  const hoursData = timelineData.map((item) => ({
    period: item.period,
    hours: item.hours || 0,
  }));

  const maxHours = Math.max(...hoursData.map((d) => d.hours));
  const maxValue = Math.max(maxHours, 1);

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

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-semibold">Évolution des Heures</h2>
        </div>
        <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
            <span className="text-gray-500">Heures</span>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Drawing Area (Grid + Bars) */}
        <div className="relative h-48 flex items-end">
          {/* Axes Background */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <div
                key={ratio}
                className="w-full border-t border-gray-100 dark:border-gray-700/50 flex items-center"
              >
                <span className="text-[10px] font-mono text-gray-400 -mt-3">
                  {Math.round(maxValue * ratio)}h
                </span>
              </div>
            ))}
          </div>

          {/* Bars Container */}
          <div className="w-full h-full flex items-end justify-around gap-2 px-4 md:px-8 relative z-0">
            {hoursData.map((item, index) => {
              const hoursHeight = (item.hours / maxValue) * 100;

              return (
                <div
                  key={index}
                  className="flex-1 max-w-[100px] flex flex-col items-center group relative h-full justify-end"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-3 bg-gray-900/95 dark:bg-gray-100/95 text-white dark:text-gray-900 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none whitespace-nowrap shadow-2xl backdrop-blur-md translate-y-2 group-hover:translate-y-0">
                    <p className="font-black border-b border-gray-200/20 dark:border-gray-700/20 pb-1.5 mb-1.5 uppercase tracking-widest">
                      {formatPeriod(item.period)}
                    </p>
                    <div className="space-y-1">
                      <p className="flex justify-between gap-6">
                        <span className="font-bold">HEURES:</span>
                        <span className="font-mono">
                          {item.hours.toFixed(1)}h
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="w-full flex items-end justify-center h-full relative group-hover:scale-x-105 transition-transform duration-500">
                    {/* Hours Bar */}
                    <div
                      className="w-4 md:w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(5,150,105,0.2)] group-hover:shadow-[0_0_25px_rgba(5,150,105,0.4)] group-hover:from-emerald-500 group-hover:to-emerald-300 origin-bottom"
                      style={{ height: `${hoursHeight}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Labels Area (Below the 0 line) */}
        <div className="w-full flex justify-around gap-2 px-4 md:px-8 mt-2">
          {hoursData.map((item, index) => (
            <div
              key={index}
              className="flex-1 max-w-[100px] flex justify-center"
            >
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 tracking-tighter uppercase whitespace-nowrap">
                {formatPeriod(item.period)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
