"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getPayslipsAction,
  deletePayslipAction,
  deleteMultiplePayslipsAction,
  updatePayslipAction,
  reanalyzePayslipAction,
} from "@/app/actions/payslip";
import {
  Trash2,
  ExternalLink,
  Users,
  Edit2,
  X,
  Save,
  FileSpreadsheet,
  FileText,
  ArrowUp,
  ArrowDown,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Payslip, UpdatePayslipData } from "@/types/payslip";
import useSWR from "swr";
import { ClientChart } from "./ClientChart";
import { FinancialTrendsChart } from "./FinancialTrendsChart";
import { formatName } from "@/lib/format-utils";

export function Dashboard({
  initialPayslips = [],
}: {
  initialPayslips?: Payslip[];
}) {
  const router = useRouter();
  const {
    data: payslips = [],
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<Payslip[]>(
    "payslips",
    async () => {
      const result = await getPayslipsAction();
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    {
      fallbackData: initialPayslips,
      revalidateOnMount: true,
    },
  );

  // Synchroniser le cache SWR avec les données initiales du serveur
  useEffect(() => {
    if (initialPayslips.length > 0) {
      revalidate(initialPayslips, false);
    }
  }, [initialPayslips, revalidate]);

  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [sortConfig, setSortConfig] = useState({
    key: "period",
    direction: "desc" as "asc" | "desc",
  });
  const [selectedPayslips, setSelectedPayslips] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [openReanalyzeMenu, setOpenReanalyzeMenu] = useState<string | null>(
    null,
  );

  // Sorting Logic
  const availableYears = Array.from(
    new Set(payslips.map((p) => p.periodYear).filter((y): y is number => !!y)),
  ).sort((a, b) => b - a);
  const months = [
    { id: 1, name: "Janvier" },
    { id: 2, name: "Février" },
    { id: 3, name: "Mars" },
    { id: 4, name: "Avril" },
    { id: 5, name: "Mai" },
    { id: 6, name: "Juin" },
    { id: 7, name: "Juillet" },
    { id: 8, name: "Août" },
    { id: 9, name: "Septembre" },
    { id: 10, name: "Octobre" },
    { id: 11, name: "Novembre" },
    { id: 12, name: "Décembre" },
  ];

  const hasFailed = payslips.some((p) => p.processingStatus === "failed");

  // Search and Filtering Logic
  const filteredPayslips = payslips.filter((p) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (p.employerName || "").toLowerCase().includes(search) ||
      (p.employeeName || "").toLowerCase().includes(search) ||
      (p.siretNumber || "").toLowerCase().includes(search) ||
      (p.urssafNumber || "").toLowerCase().includes(search) ||
      (p.cesuNumber || "").toLowerCase().includes(search);

    let matchesYear = false;
    if (selectedYear === "all") {
      matchesYear = true;
    } else if (selectedYear === "failed") {
      matchesYear = p.processingStatus === "failed";
    } else {
      matchesYear = p.periodYear === Number(selectedYear);
    }

    const matchesMonth =
      selectedMonth === "all" || p.periodMonth === Number(selectedMonth);

    const ok = matchesSearch && matchesYear && matchesMonth;

    // Debug pour le mois de Mai (si on ne voit rien)
    if (
      !ok &&
      (p.periodMonth === 5 || (p.fileName || "").toLowerCase().includes("mai"))
    ) {
      // console.log(`🔍 [DEBUG FILTER] Refusé: ${p.fileName} | Mois: ${p.periodMonth} (Mois select: ${selectedMonth}) | Année: ${p.periodYear} (Année select: ${selectedYear})`);
    }

    return ok;
  });

  const sortedPayslips = filteredPayslips.toSorted((a, b) => {
    let comparison = 0;
    switch (sortConfig.key) {
      case "period":
        comparison =
          (a.periodYear || 0) * 100 +
          (a.periodMonth || 0) -
          ((b.periodYear || 0) * 100 + (b.periodMonth || 0));
        break;
      case "client":
        comparison = (formatName(a.employerName) || "").localeCompare(
          formatName(b.employerName) || "",
        );
        break;
      case "grossSalary":
        comparison = a.grossSalary - b.grossSalary;
        break;
      case "netToPay":
        comparison = a.netToPay - b.netToPay;
        break;
      case "hoursWorked":
        comparison = a.hoursWorked - b.hoursWorked;
        break;
      default:
        comparison = 0;
    }
    return sortConfig.direction === "asc" ? comparison : -comparison;
  });

  const toggleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce bulletin ?")) return;

    const result = await deletePayslipAction(id);
    if (result.success) {
      toast.success("Bulletin supprimé");
      revalidate();
      // Remove from selection if it was selected
      if (selectedPayslips.has(id)) {
        const newSelection = new Set(selectedPayslips);
        newSelection.delete(id);
        setSelectedPayslips(newSelection);
      }
    } else {
      toast.error(result.error);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedPayslips.size;
    if (!confirm(`Supprimer ces ${count} bulletins définitivement ?`)) return;

    const result = await deleteMultiplePayslipsAction(
      Array.from(selectedPayslips),
    );
    if (result.success) {
      toast.success(`${count} bulletins supprimés`);
      setSelectedPayslips(new Set());
      revalidate();
    } else {
      toast.error(result.error);
    }
  };

  // Selection Logic
  const toggleSelectAll = () => {
    if (selectedPayslips.size === sortedPayslips.length) {
      setSelectedPayslips(new Set());
    } else {
      setSelectedPayslips(new Set(sortedPayslips.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelection = new Set(selectedPayslips);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPayslips(newSelection);
  };

  const handleReanalyze = async (id: string, method: "ai" | "traditional") => {
    const toastId = toast.loading("Analyse en cours...");
    try {
      const result = await reanalyzePayslipAction(id, method);
      if (result.success) {
        toast.success("Analyse terminée avec succès", { id: toastId });
        revalidate();
      } else {
        toast.error(result.error || "Erreur lors de l'analyse", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la ré-analyse", { id: toastId });
    }
  };

  const handleExportExcel = async () => {
    const dataToExport =
      selectedPayslips.size > 0
        ? sortedPayslips.filter((p) => selectedPayslips.has(p.id))
        : sortedPayslips;
    const { exportToExcel } = await import("@/lib/export-utils");
    exportToExcel(dataToExport);
  };

  const handleExportPDF = async () => {
    const dataToExport =
      selectedPayslips.size > 0
        ? sortedPayslips.filter((p) => selectedPayslips.has(p.id))
        : sortedPayslips;
    const { exportToPDF } = await import("@/lib/export-utils");
    exportToPDF(dataToExport);
  };

  // Data used for statistics (all or selection or filtered)
  const statsData =
    selectedPayslips.size > 0
      ? payslips.filter((p) => selectedPayslips.has(p.id))
      : filteredPayslips;

  // Préparer les données pour la répartition par client
  const clientDataMap = statsData.reduce(
    (acc, p) => {
      const employer = formatName(p.employerName) || "Non identifié";
      acc[employer] = (acc[employer] || 0) + p.netToPay;
      return acc;
    },
    {} as Record<string, number>,
  );

  const clientData = Object.entries(clientDataMap)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Préparer les données pour l'évolution temporelle
  const timelineDataMap = statsData.reduce(
    (acc, p) => {
      if (!p.periodYear || !p.periodMonth) return acc;
      const key = `${p.periodYear}-${String(p.periodMonth).padStart(2, "0")}`;
      if (!acc[key]) {
        acc[key] = { net: 0, gross: 0, count: 0 };
      }
      acc[key].net += p.netToPay;
      acc[key].gross += p.grossSalary;
      acc[key].count++;
      return acc;
    },
    {} as Record<string, { net: number; gross: number; count: number }>,
  );

  const timelineData = Object.entries(timelineDataMap)
    .map(([period, values]) => ({
      period,
      net: values.net,
      gross: values.gross,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
        <p className="text-red-600 dark:text-red-400 font-bold text-lg mb-2">
          Impossible de charger les données
        </p>
        <p className="text-red-500 dark:text-red-400/70 mb-6 text-sm">
          {error instanceof Error
            ? error.message
            : "Vérifiez votre connexion ou contactez le support."}
        </p>
        <button
          onClick={() => revalidate()}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/20"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex gap-3 items-center w-full md:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>{" "}
            {selectedPayslips.size > 0 && `(${selectedPayslips.size})`}
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm text-sm"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>{" "}
            {selectedPayslips.size > 0 && `(${selectedPayslips.size})`}
          </button>

          {selectedPayslips.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-all shadow-sm text-sm font-bold border border-rose-200 animate-in zoom-in duration-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer</span>
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:items-center">
          {/* Filtre Année */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          >
            <option value="all">Toutes les années</option>
            {hasFailed && (
              <option value="failed" className="text-red-500 font-bold">
                ⚠️ Échecs d&apos;analyse
              </option>
            )}
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Filtre Mois */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          >
            <option value="all">Tous les mois</option>
            {months.map((month) => (
              <option key={month.id} value={month.id}>
                {month.name}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {(searchTerm ||
            selectedYear !== "all" ||
            selectedMonth !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedYear("all");
                setSelectedMonth("all");
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all animate-in fade-in slide-in-from-right-2 duration-300 w-fit shrink-0"
            >
              <X className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Total Bulletins</p>
          <p className="text-xl md:text-2xl font-bold">{statsData.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Total Heures</p>
          <p className="text-xl md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + p.hoursWorked, 0).toFixed(2)} h
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-blue-500 font-semibold mb-1">
            Total Net Avant Impôts
          </p>
          <p className="text-xl md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + p.netBeforeTax, 0).toFixed(2)} €
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-blue-500 font-semibold mb-1">Total Brut</p>
          <p className="text-xl md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + Math.floor(p.grossSalary), 0)} €
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-blue-500 font-semibold mb-1">
            Total Net à Payer
          </p>
          <p className="text-xl md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + p.netToPay, 0).toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Tableau des bulletins */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[450px] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedPayslips.size === sortedPayslips.length &&
                      sortedPayslips.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => toggleSort("period")}
                >
                  <div className="flex items-center gap-1">
                    Période
                    {sortConfig.key === "period" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => toggleSort("client")}
                >
                  <div className="flex items-center gap-1">
                    Client
                    {sortConfig.key === "client" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ))}
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => toggleSort("grossSalary")}
                >
                  <div className="flex items-center gap-1">
                    Salaire Brut
                    {sortConfig.key === "grossSalary" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => toggleSort("netTaxable")}
                >
                  <div className="flex items-center gap-1">
                    Net Imposable
                    {sortConfig.key === "netTaxable" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => toggleSort("netBeforeTax")}
                >
                  <div className="flex items-center gap-1">
                    Net Avant Impôt
                    {sortConfig.key === "netBeforeTax" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => toggleSort("netToPay")}
                >
                  <div className="flex items-center gap-1">
                    Net à Payer
                    {sortConfig.key === "netToPay" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => toggleSort("hoursWorked")}
                >
                  <div className="flex items-center gap-1">
                    Heures
                    {sortConfig.key === "hoursWorked" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ))}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedPayslips.map((payslip) => {
                return (
                  <tr
                    key={payslip.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPayslips.has(payslip.id)}
                        onChange={() => toggleSelect(payslip.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {payslip.periodMonth && payslip.periodYear
                            ? `${String(payslip.periodMonth).padStart(2, "0")}/${payslip.periodYear}`
                            : "Période inconnue"}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                              payslip.processingStatus === "completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {payslip.processingStatus === "completed"
                              ? "Analysé"
                              : "À compléter"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatName(payslip.employerName) || "Client inconnu"}
                      </div>
                      {payslip.processingStatus === "failed" ? (
                        <div
                          className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded inline-block mt-1 animate-pulse"
                          title={payslip.errorMessage || "Erreur inconnue"}
                        >
                          ÉCHEC ANALYSE : {payslip.errorMessage?.slice(0, 30)}
                          ...
                        </div>
                      ) : payslip.siretNumber ||
                        payslip.urssafNumber ||
                        (payslip.cesuNumber &&
                          payslip.cesuNumber.startsWith("Z")) ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {payslip.siretNumber &&
                            !(
                              payslip.cesuNumber?.startsWith("Z") &&
                              (!payslip.urssafNumber ||
                                payslip.urssafNumber.length <= 2)
                            ) && (
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-[10px] text-gray-400 uppercase">
                                  SIRET
                                </span>
                                {payslip.siretNumber}
                              </div>
                            )}
                          {payslip.urssafNumber &&
                            !(
                              payslip.cesuNumber?.startsWith("Z") &&
                              (!payslip.siretNumber ||
                                payslip.urssafNumber.length <= 2)
                            ) && (
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-[10px] text-gray-400 uppercase">
                                  URSSAF
                                </span>
                                {payslip.urssafNumber}
                              </div>
                            )}
                          {((payslip.cesuNumber?.startsWith("Z") &&
                            (!payslip.siretNumber ||
                              !payslip.urssafNumber ||
                              payslip.urssafNumber.length <= 2)) ||
                            (!(payslip.siretNumber || payslip.urssafNumber) &&
                              payslip.cesuNumber)) && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-[10px] text-gray-400 uppercase">
                                CESU
                              </span>
                              {payslip.cesuNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-500 italic mt-1">
                          Identifiants manquants
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {payslip.grossSalary > 0
                          ? `${payslip.grossSalary.toFixed(2)} €`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {payslip.netTaxable > 0
                          ? `${payslip.netTaxable.toFixed(2)} € (Impos.)`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {payslip.netBeforeTax > 0
                          ? `${payslip.netBeforeTax.toFixed(2)} €`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {payslip.netToPay > 0
                          ? `${payslip.netToPay.toFixed(2)} € (Net)`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {payslip.hoursWorked > 0
                          ? `${payslip.hoursWorked.toFixed(2)} h`
                          : "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payslip.hoursWorked > 0
                          ? `${(payslip.netToPay / payslip.hoursWorked).toFixed(2)} €/h (Net)`
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={payslip.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Voir le document"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* Bouton Ré-analyse (Étoile) */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenReanalyzeMenu(
                                openReanalyzeMenu === payslip.id
                                  ? null
                                  : payslip.id,
                              )
                            }
                            className={`p-2 rounded-full transition-colors ${openReanalyzeMenu === payslip.id ? "bg-purple-100 text-purple-700" : "text-purple-600 hover:bg-purple-50"}`}
                            title="Ré-analyser"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>

                          {openReanalyzeMenu === payslip.id && (
                            <>
                              <div
                                className="fixed inset-0 z-[40]"
                                onClick={() => setOpenReanalyzeMenu(null)}
                              />
                              <div className="absolute right-0 bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[50] p-1 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <button
                                  onClick={() => {
                                    setOpenReanalyzeMenu(null);
                                    handleReanalyze(payslip.id, "ai");
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors text-left"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Relancer IA 🤖
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenReanalyzeMenu(null);
                                    handleReanalyze(payslip.id, "traditional");
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-left"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  Extraire Classique ⚡
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => setEditingPayslip(payslip)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payslip.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {payslips.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun bulletin de paie pour le moment
          </div>
        )}
      </div>

      {/* Dashboard Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <ClientChart clientData={clientData} />
        <FinancialTrendsChart timelineData={timelineData} />
      </div>

      {/* Modal d'édition */}
      {editingPayslip && (
        <EditModal
          payslip={editingPayslip as Payslip}
          onClose={() => setEditingPayslip(null)}
          onSave={async (id, data) => {
            const result = await updatePayslipAction(id, data);
            if (result.success) {
              toast.success("Bulletin mis à jour");
              await revalidate();
              router.refresh();
              setEditingPayslip(null);
            } else {
              toast.error(result.error);
            }
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  payslip,
  onClose,
  onSave,
}: {
  payslip: Payslip;
  onClose: () => void;
  onSave: (id: string, data: UpdatePayslipData) => Promise<void>;
}) {
  const [formData, setFormData] = useState<UpdatePayslipData>({
    employeeName: payslip.employeeName,
    employerName: payslip.employerName,
    periodMonth: payslip.periodMonth,
    periodYear: payslip.periodYear,
    netToPay: payslip.netToPay,
    grossSalary: payslip.grossSalary,
    netTaxable: payslip.netTaxable,
    netBeforeTax: payslip.netBeforeTax,
    taxAmount: payslip.taxAmount,
    hoursWorked: payslip.hoursWorked,
    hourlyNetTaxable: payslip.hourlyNetTaxable,
    employeeAddress: payslip.employeeAddress,
    siretNumber: payslip.siretNumber,
    urssafNumber: payslip.urssafNumber,
    cesuNumber: payslip.cesuNumber,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(payslip.id, formData);
    setIsSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number" ? (value === "" ? 0 : parseFloat(value)) : value,
    }));
  };

  const InputField = ({
    label,
    name,
    type = "text",
    value,
    placeholder,
    className,
    readOnly = false,
    step,
    min,
    max,
  }: {
    label: string;
    name: string;
    type?: string;
    value: string | number;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
    step?: string;
    min?: string;
    max?: string;
  }) => (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        step={step || (type === "number" ? "0.01" : undefined)}
        min={min}
        max={max}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border-0 ring-1 ring-gray-200 dark:ring-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-sm transition-all
                    ${
                      readOnly
                        ? "opacity-60 cursor-not-allowed italic"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:scale-[1.01] shadow-sm"
                    }
                    ${type === "number" ? "text-right font-medium font-mono" : ""}
                `}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900/95 backdrop-blur z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Modifier le bulletin
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <FileText className="w-3 h-3" />
              </span>
              <p
                className="text-xs text-gray-500 font-medium truncate max-w-[300px]"
                title={payslip.fileName}
              >
                {payslip.fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="group p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-200"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8"
        >
          {/* Section 1: Informations Générales */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              <Users className="w-3 h-3" />
              Identité & Période
            </h4>

            <div className="grid grid-cols-12 gap-x-4 gap-y-5">
              <InputField
                label="Salarié / Intervenant"
                name="employeeName"
                value={formData.employeeName || ""}
                className="col-span-12 md:col-span-6"
              />
              <InputField
                label="Nom du Client (Employeur)"
                name="employerName"
                value={formData.employerName || ""}
                className="col-span-12 md:col-span-6"
              />

              <InputField
                label="Mois"
                name="periodMonth"
                type="number"
                step="1"
                min="1"
                max="12"
                value={formData.periodMonth || ""}
                className="col-span-6 md:col-span-3"
              />
              <InputField
                label="Année"
                name="periodYear"
                type="number"
                step="1"
                min="2000"
                max="2100"
                value={formData.periodYear || ""}
                className="col-span-6 md:col-span-3"
              />
              <InputField
                label="Adresse"
                name="employeeAddress"
                value={formData.employeeAddress || ""}
                className="col-span-12 md:col-span-6"
              />

              <div className="col-span-12 grid grid-cols-3 gap-4 pt-2">
                <InputField
                  label="SIRET"
                  name="siretNumber"
                  value={formData.siretNumber || ""}
                />
                <InputField
                  label="URSSAF"
                  name="urssafNumber"
                  value={formData.urssafNumber || ""}
                />
                <InputField
                  label="CESU"
                  name="cesuNumber"
                  value={formData.cesuNumber || ""}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Données Financières */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Données Financières
              </h4>
              <div className="h-px flex-1 bg-blue-100 dark:bg-blue-900/30 ml-4" />
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
              <div className="grid grid-cols-12 gap-6 items-start">
                {/* Colonne Principale */}
                <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-4">
                  <InputField
                    label="Salaire Brut"
                    name="grossSalary"
                    type="number"
                    value={formData.grossSalary || 0}
                  />
                  <InputField
                    label="Net Imposable"
                    name="netTaxable"
                    type="number"
                    value={formData.netTaxable || ""}
                  />
                  <InputField
                    label="Net Avant Impôt"
                    name="netBeforeTax"
                    type="number"
                    value={formData.netBeforeTax || ""}
                  />
                  <InputField
                    label="Montant Impôt"
                    name="taxAmount"
                    type="number"
                    value={formData.taxAmount || ""}
                  />
                </div>

                {/* Highlight Net à Payer */}
                <div className="col-span-12 md:col-span-4 bg-green-50 dark:bg-green-900/10 rounded-2xl p-5 border border-green-100 dark:border-green-900/20 flex flex-col justify-center h-full">
                  <label className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider text-center mb-2">
                    Net à Payer
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="netToPay"
                      value={formData.netToPay}
                      onChange={handleChange}
                      className="w-full bg-transparent text-center font-black text-3xl text-green-700 dark:text-green-400 outline-none border-b-2 border-green-200 dark:border-green-800 focus:border-green-500 transition-all pb-2 px-1"
                    />
                    <span className="absolute right-0 bottom-3 text-green-600/50 font-bold text-sm">
                      €
                    </span>
                  </div>
                  <p className="text-[10px] text-green-600/60 text-center mt-2 font-medium">
                    Montant final versé
                  </p>
                </div>

                {/* Ligne Secondaire : Heures */}
                <div className="col-span-12 grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800/50 mt-2">
                  <InputField
                    label="Heures Travaillées"
                    name="hoursWorked"
                    type="number"
                    value={formData.hoursWorked || ""}
                  />
                  <InputField
                    label="Taux Horaire (Calculé)"
                    name="hourlyRate"
                    value={
                      (formData.hoursWorked || 0) > 0
                        ? (
                            (formData.netToPay || 0) /
                            (formData.hoursWorked || 1)
                          ).toFixed(2)
                        : "-"
                    }
                    readOnly={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3 z-10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all font-bold shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center gap-2"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
