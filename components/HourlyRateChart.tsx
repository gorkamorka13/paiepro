"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  AlertCircle,
} from "lucide-react";

interface HourlyRateChartProps {
  timelineData: Array<{
    period: string;
    net: number;
    gross: number;
    hours: number;
  }>;
}

export function HourlyRateChart({ timelineData }: HourlyRateChartProps) {
  if (timelineData.length === 0) return null;

  // Calculate hourly rate for each period using REAL hours data
  const hourlyRateData = timelineData.map((item) => {
    const rate = item.hours > 0 ? item.net / item.hours : 0;
    return {
      period: item.period,
      rate: rate,
      net: item.net,
      hours: item.hours,
    };
  });

  // Filter out periods with no hours data (rate = 0)
  const validData = hourlyRateData.filter((d) => d.rate > 0);

  // Check if we have any valid data
  const hasValidData = validData.length > 0;

  // Use valid data for calculations, or all data if none valid
  const dataToUse = hasValidData ? validData : hourlyRateData;

  // Calculate statistics
  const rates = dataToUse.map((d) => d.rate);
  const avgRate = rates.reduce((sum, r) => sum + r, 0) / (rates.length || 1);
  const maxRate = Math.max(...rates, 1);
  const minRate = Math.min(...rates.filter((r) => r > 0), avgRate);
  const maxRateValue = Math.max(maxRate * 1.1, 15); // Add 10% headroom, minimum 15€/h

  // Calculate trend
  const recentPeriods = dataToUse.slice(-3);
  const earlyPeriods = dataToUse.slice(0, 3);
  const recentAvg =
    recentPeriods.reduce((sum, d) => sum + d.rate, 0) /
    (recentPeriods.length || 1);
  const earlyAvg =
    earlyPeriods.reduce((sum, d) => sum + d.rate, 0) /
    (earlyPeriods.length || 1);
  const trend = recentAvg - earlyAvg;

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

  // Determine color based on rate vs average
  const getRateColor = (rate: number) => {
    if (avgRate === 0) return "bg-gray-500";
    const diff = ((rate - avgRate) / avgRate) * 100;
    if (diff > 10) return "bg-green-500";
    if (diff < -10) return "bg-red-500";
    return "bg-amber-500";
  };

  const getRateTextColor = (rate: number) => {
    if (avgRate === 0) return "text-gray-600";
    const diff = ((rate - avgRate) / avgRate) * 100;
    if (diff > 10) return "text-green-600";
    if (diff < -10) return "text-red-600";
    return "text-amber-600";
  };

  // If no valid hours data, show informative message
  if (!hasValidData) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Taux Horaire Net</h2>
            <p className="text-xs text-gray-500">
              Évolution de votre rémunération horaire
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            Données d&apos;heures manquantes
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs">
            Les bulletins de paie n&apos;ont pas d&apos;informations sur les
            heures travaillées. Le taux horaire ne peut pas être calculé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Taux Horaire Net</h2>
            <p className="text-xs text-gray-500">
              Évolution de votre rémunération horaire
            </p>
          </div>
        </div>

        {/* Trend Indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
            trend > 0.5
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : trend < -0.5
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {trend > 0.5 ? (
            <>
              <TrendingUp className="w-4 h-4" />+
              {((trend / avgRate) * 100).toFixed(1)}%
            </>
          ) : trend < -0.5 ? (
            <>
              <TrendingDown className="w-4 h-4" />
              {((trend / avgRate) * 100).toFixed(1)}%
            </>
          ) : (
            <>
              <Minus className="w-4 h-4" />
              Stable
            </>
          )}
        </div>
      </div>

      {/* Main Chart - Vertical Bar Chart */}
      <div className="relative mb-6">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-12 flex flex-col justify-between text-[10px] font-mono text-gray-500 w-12">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
            <span key={ratio}>{(maxRateValue * ratio).toFixed(0)}€</span>
          ))}
        </div>

        {/* Chart Area */}
        <div className="ml-12 mr-2 relative h-64 flex items-end">
          {/* Background Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <div
                key={ratio}
                className="w-full border-t border-gray-100 dark:border-gray-700/50"
              />
            ))}
          </div>

          {/* Average Line */}
          <div
            className="absolute w-full border-t-2 border-dashed border-gray-400 dark:border-gray-500 z-10"
            style={{ bottom: `${(avgRate / maxRateValue) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] font-bold text-gray-500 bg-white dark:bg-gray-800 px-1">
              Moy: {avgRate.toFixed(2)}€/h
            </span>
          </div>

          {/* Bars */}
          <div className="relative w-full h-full flex items-end justify-around gap-2 px-2">
            {dataToUse.map((item, index) => {
              const barHeight = (item.rate / maxRateValue) * 100;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Value Label on top of bar */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-gray-600 dark:text-gray-400">
                    {item.rate.toFixed(0)}€
                  </div>

                  {/* Bar */}
                  <div
                    className={`w-full max-w-[40px] min-w-[20px] rounded-t-lg transition-all duration-500 ease-out cursor-pointer ${getRateColor(
                      item.rate,
                    )} opacity-80 group-hover:opacity-100 group-hover:shadow-lg`}
                    style={{ height: `${Math.max(barHeight, 1)}%` }}
                  >
                    {/* Gradient overlay */}
                    <div className="w-full h-full rounded-t-lg bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900/95 dark:bg-gray-100/95 text-white dark:text-gray-900 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none whitespace-nowrap shadow-2xl backdrop-blur-md min-w-[140px]">
                    <p className="font-black border-b border-gray-200/20 dark:border-gray-700/20 pb-1.5 mb-1.5 uppercase tracking-widest text-center">
                      {formatPeriod(item.period)}
                    </p>
                    <div className="space-y-1.5">
                      <p className="flex justify-between gap-4">
                        <span className="font-bold text-indigo-400">TAUX:</span>
                        <span className="font-mono font-bold text-lg">
                          {item.rate.toFixed(2)}€/h
                        </span>
                      </p>
                      <p className="flex justify-between gap-4">
                        <span className="text-gray-400">Salaire:</span>
                        <span className="font-mono">
                          {item.net.toFixed(0)}€
                        </span>
                      </p>
                      <p className="flex justify-between gap-4">
                        <span className="text-gray-400">Heures:</span>
                        <span className="font-mono">
                          {item.hours.toFixed(0)}h
                        </span>
                      </p>
                      <p
                        className={`flex justify-between gap-4 pt-1.5 mt-1 border-t border-gray-200/20 dark:border-gray-700/20 ${getRateTextColor(
                          item.rate,
                        )}`}
                      >
                        <span className="font-bold">
                          {item.rate > avgRate ? "+" : ""}
                          {avgRate > 0
                            ? (((item.rate - avgRate) / avgRate) * 100).toFixed(
                                1,
                              )
                            : 0}
                          %
                        </span>
                        <span className="text-gray-400">vs moyenne</span>
                      </p>
                    </div>
                  </div>

                  {/* X-Axis Label */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full text-center">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 tracking-tighter whitespace-nowrap">
                      {formatPeriod(item.period)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Taux Moyen</p>
          <p className="text-2xl font-bold text-indigo-600">
            {avgRate.toFixed(2)}€
          </p>
          <p className="text-[10px] text-gray-400">/heure</p>
        </div>

        <div className="text-center border-x border-gray-200 dark:border-gray-700">
          <p className="text-[10px] text-gray-500 uppercase mb-1">
            Meilleur Taux
          </p>
          <p className="text-2xl font-bold text-green-600">
            {maxRate.toFixed(2)}€
          </p>
          <p className="text-[10px] text-gray-400">
            {formatPeriod(
              dataToUse.find((d) => d.rate === maxRate)?.period || "",
            )}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Plus Bas</p>
          <p className="text-2xl font-bold text-red-600">
            {minRate > 0 ? minRate.toFixed(2) : avgRate.toFixed(2)}€
          </p>
          <p className="text-[10px] text-gray-400">
            {formatPeriod(
              dataToUse.find((d) => d.rate === minRate && d.rate > 0)?.period ||
                dataToUse[0]?.period ||
                "",
            )}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-6 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span className="text-gray-600 dark:text-gray-400">
            Au-dessus (+10%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-amber-500 rounded-sm" />
          <span className="text-gray-600 dark:text-gray-400">
            Moyenne (±10%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          <span className="text-gray-600 dark:text-gray-400">
            En-dessous (-10%)
          </span>
        </div>
      </div>
    </div>
  );
}
