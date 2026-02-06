"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPayslipsAction,
  deletePayslipAction,
  deleteMultiplePayslipsAction,
  updatePayslipAction,
  reanalyzePayslipAction,
  downloadPayslipImagesAction,
} from "@/app/actions/payslip";
import {
  Trash2,
  ExternalLink,
  Edit2,
  X,
  FileSpreadsheet,
  FileText,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import type { Payslip, UpdatePayslipData } from "@/types/payslip";
import useSWR from "swr";
import { ClientChart } from "./ClientChart";
import { FinancialTrendsChart } from "./FinancialTrendsChart";
import { HoursEvolutionChart } from "./HoursEvolutionChart";
import { HourlyRateChart } from "./HourlyRateChart";
import { formatName } from "@/lib/format-utils";

// Confidence indicator types
export type ConfidenceLevel = "high" | "medium" | "low";

export interface PayslipWithConfidence extends Payslip {
  confidenceScore?: number;
  fieldConfidence?: {
    employeeName?: ConfidenceLevel;
    employerName?: ConfidenceLevel;
    period?: ConfidenceLevel;
    netToPay?: ConfidenceLevel;
    grossSalary?: ConfidenceLevel;
    hoursWorked?: ConfidenceLevel;
  };
}

// Helper function to calculate confidence score
function calculateConfidence(payslip: Payslip): {
  score: number;
  fields: Record<string, ConfidenceLevel>;
} {
  const fields: Record<string, ConfidenceLevel> = {};
  let totalScore = 0;
  let fieldCount = 0;

  // Check each field and assign confidence
  const checkField = (value: unknown, fieldName: string) => {
    if (value === null || value === undefined || value === "" || value === 0) {
      fields[fieldName] = "low";
      totalScore += 0;
    } else if (typeof value === "number" && value > 0) {
      fields[fieldName] = "high";
      totalScore += 100;
    } else if (typeof value === "string" && value.length > 2) {
      fields[fieldName] = "high";
      totalScore += 100;
    } else {
      fields[fieldName] = "medium";
      totalScore += 50;
    }
    fieldCount++;
  };

  checkField(payslip.employeeName, "employeeName");
  checkField(payslip.employerName, "employerName");
  checkField(payslip.periodMonth && payslip.periodYear, "period");
  checkField(payslip.netToPay, "netToPay");
  checkField(payslip.grossSalary, "grossSalary");
  checkField(payslip.hoursWorked, "hoursWorked");

  return {
    score: fieldCount > 0 ? Math.round(totalScore / fieldCount) : 0,
    fields,
  };
}

// Confidence badge component
function ConfidenceBadge({
  level,
  showLabel = false,
}: {
  level: ConfidenceLevel;
  showLabel?: boolean;
}) {
  const config = {
    high: {
      icon: CheckCircle2,
      color:
        "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
      label: "Fiable",
    },
    medium: {
      icon: AlertCircle,
      color:
        "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
      label: "À vérifier",
    },
    low: {
      icon: AlertTriangle,
      color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
      label: "Incomplet",
    },
  };

  const { icon: Icon, color, label } = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${color}`}
    >
      <Icon className="w-3 h-3" />
      {showLabel && label}
    </span>
  );
}

// Overall confidence indicator
function OverallConfidenceIndicator({ score }: { score: number }) {
  let level: ConfidenceLevel = "low";
  if (score >= 80) level = "high";
  else if (score >= 50) level = "medium";

  return (
    <div
      className="flex items-center gap-2"
      title={`Score de confiance: ${score}%`}
    >
      <ConfidenceBadge level={level} />
      <span className="text-xs text-gray-500">{score}%</span>
    </div>
  );
}

export function Dashboard({
  initialPayslips = [],
}: {
  initialPayslips?: Payslip[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // Check viewport on mount
  useEffect(() => {
    const checkViewport = () => {
      setViewMode(window.innerWidth < 768 ? "mobile" : "desktop");
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

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

  // Enhance payslips with confidence scores
  const payslipsWithConfidence = payslips.map((payslip) => {
    const confidence = calculateConfidence(payslip);
    return {
      ...payslip,
      confidenceScore: confidence.score,
      fieldConfidence: confidence.fields,
    };
  });

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
  const [showFilters, setShowFilters] = useState(false);
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
  const filteredPayslips = payslipsWithConfidence.filter((p) => {
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

    return matchesSearch && matchesYear && matchesMonth;
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
      case "confidence":
        comparison = (a.confidenceScore || 0) - (b.confidenceScore || 0);
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
    const confirmed = confirm(
      method === "ai"
        ? "Relancer l'analyse avec l'IA ? Les données existantes seront remplacées."
        : "Relancer l'extraction classique ? Les données existantes seront remplacées.",
    );
    if (!confirmed) return;

    const toastId = toast.loading("Analyse en cours...");
    setOpenReanalyzeMenu(null);
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

  const handleDownloadImages = async () => {
    const toastId = toast.loading("Préparation du téléchargement...");

    try {
      // Déterminer quels bulletins télécharger (sélectionnés ou filtrés)
      const payslipIdsToDownload =
        selectedPayslips.size > 0
          ? Array.from(selectedPayslips)
          : sortedPayslips.map((p) => p.id);

      if (payslipIdsToDownload.length === 0) {
        toast.error("Aucun bulletin à télécharger", { id: toastId });
        return;
      }

      toast.loading(
        `Téléchargement de ${payslipIdsToDownload.length} fichier(s)...`,
        { id: toastId },
      );

      const result = await downloadPayslipImagesAction(payslipIdsToDownload);

      if (result.success && result.data) {
        // Convertir base64 en blob
        const byteCharacters = atob(result.data.zipData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/zip" });

        // Créer le lien de téléchargement
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Afficher la taille dans une boîte de dialogue
        const sizeMB = (result.data.fileSize / (1024 * 1024)).toFixed(2);
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold">Téléchargement terminé !</span>
            <span className="text-sm">
              {result.data.count} fichier(s) • {sizeMB} Mo
            </span>
          </div>,
          { id: toastId, duration: 5000 },
        );
      } else {
        toast.error(result.error || "Erreur lors du téléchargement", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("❌ Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement des images", { id: toastId });
    }
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
        acc[key] = { net: 0, gross: 0, hours: 0, count: 0 };
      }
      acc[key].net += p.netToPay;
      acc[key].gross += p.grossSalary;
      acc[key].hours += p.hoursWorked;
      acc[key].count++;
      return acc;
    },
    {} as Record<
      string,
      { net: number; gross: number; hours: number; count: number }
    >,
  );

  const timelineData = Object.entries(timelineDataMap)
    .map(([period, values]) => ({
      period,
      net: values.net,
      gross: values.gross,
      hours: values.hours,
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
    <div className="space-y-6 md:space-y-8">
      {/* View Mode Toggle & Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">Bulletins de paie</h2>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode("desktop")}
            className={`p-2 rounded-md transition-all ${viewMode === "desktop"
              ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600"
              : "text-gray-500"
              }`}
            title="Vue bureau"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("mobile")}
            className={`p-2 rounded-md transition-all ${viewMode === "mobile"
              ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600"
              : "text-gray-500"
              }`}
            title="Vue mobile"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Filters Toggle */}
      <div className="md:hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium"
        >
          <span>Filtres et recherche</span>
          <span className="text-blue-600">
            {showFilters ? "Masquer" : "Afficher"}
          </span>
        </button>
      </div>

      {/* Toolbar */}
      <div
        className={`flex flex-col gap-4 ${showFilters || viewMode === "desktop" ? "block" : "hidden md:flex"
          }`}
      >
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-stretch md:items-center">
          {/* Export Buttons */}
          <div className="flex gap-2 items-center">
            <button
              onClick={handleExportExcel}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
              {selectedPayslips.size > 0 && `(${selectedPayslips.size})`}
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium min-h-[44px]"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
              {selectedPayslips.size > 0 && `(${selectedPayslips.size})`}
            </button>

            <button
              onClick={handleDownloadImages}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium min-h-[44px]"
              title="Télécharger les fichiers des bulletins (ZIP)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Télécharger</span>
              {selectedPayslips.size > 0 && `(${selectedPayslips.size})`}
            </button>

            {selectedPayslips.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-all shadow-sm text-sm font-bold border border-rose-200 animate-in zoom-in duration-200 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Supprimer</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2.5 md:py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium min-h-[44px]"
            >
              <option value="all">Toutes années</option>
              {hasFailed && (
                <option value="failed" className="text-red-500 font-bold">
                  ⚠️ Échecs
                </option>
              )}
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2.5 md:py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium min-h-[44px]"
            >
              <option value="all">Tous mois</option>
              {months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.name}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 sm:min-w-[200px] md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 md:py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
              />
            </div>

            {/* Reset Filters */}
            {(searchTerm ||
              selectedYear !== "all" ||
              selectedMonth !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedYear("all");
                    setSelectedMonth("all");
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all animate-in fade-in shrink-0 min-h-[44px]"
                >
                  <X className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Total</p>
          <p className="text-lg md:text-2xl font-bold">{statsData.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Heures</p>
          <p className="text-lg md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + p.hoursWorked, 0).toFixed(0)}h
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2 md:col-span-1">
          <p className="text-[10px] md:text-xs text-blue-500 font-semibold mb-1">
            Net Avant Impôts
          </p>
          <p className="text-lg md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + p.netBeforeTax, 0).toFixed(0)}€
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] md:text-xs text-blue-500 font-semibold mb-1">
            Brut
          </p>
          <p className="text-lg md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + p.grossSalary, 0).toFixed(0)}€
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2 md:col-span-1">
          <p className="text-[10px] md:text-xs text-blue-500 font-semibold mb-1">
            Net à Payer
          </p>
          <p className="text-lg md:text-2xl font-bold">
            {statsData.reduce((sum, p) => sum + p.netToPay, 0).toFixed(0)}€
          </p>
        </div>
      </div>

      {/* Data Quality Warning */}
      {sortedPayslips.some((p) => (p.confidenceScore || 0) < 50) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Données à vérifier
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Certains bulletins ont des données incomplètes ou une confiance
              faible. Vérifiez les champs marqués en orange ou rouge.
            </p>
          </div>
        </div>
      )}

      {/* Payslip List - Desktop Table View */}
      {viewMode === "desktop" ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-3 md:px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedPayslips.size === sortedPayslips.length &&
                        sortedPayslips.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 w-4 h-4"
                    />
                  </th>
                  <th
                    className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                    className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                    className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleSort("confidence")}
                  >
                    <div className="flex items-center gap-1">
                      Qualité
                      {sortConfig.key === "confidence" &&
                        (sortConfig.direction === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-blue-500" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-blue-500" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleSort("grossSalary")}
                  >
                    <div className="flex items-center gap-1">
                      Brut
                      {sortConfig.key === "grossSalary" &&
                        (sortConfig.direction === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-blue-500" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-blue-500" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleSort("netToPay")}
                  >
                    <div className="flex items-center gap-1">
                      Net
                      {sortConfig.key === "netToPay" &&
                        (sortConfig.direction === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-blue-500" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-blue-500" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                  <th className="px-3 md:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedPayslips.map((payslip) => (
                  <tr
                    key={payslip.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <input
                        type="checkbox"
                        checked={selectedPayslips.has(payslip.id)}
                        onChange={() => toggleSelect(payslip.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 w-4 h-4"
                      />
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium">
                          {payslip.periodMonth && payslip.periodYear
                            ? `${String(payslip.periodMonth).padStart(2, "0")}/${payslip.periodYear}`
                            : "—"}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded w-fit ${payslip.processingStatus === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                            }`}
                        >
                          {payslip.processingStatus === "completed"
                            ? "OK"
                            : "À vérifier"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="text-sm font-medium">
                        {formatName(payslip.employerName) || "—"}
                      </div>
                      {payslip.processingStatus === "failed" ? (
                        <div className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded inline-block mt-1">
                          ÉCHEC
                        </div>
                      ) : payslip.siretNumber ? (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          SIRET: {payslip.siretNumber}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <OverallConfidenceIndicator
                        score={payslip.confidenceScore || 0}
                      />
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="text-sm font-medium">
                        {payslip.grossSalary > 0
                          ? `${payslip.grossSalary.toFixed(0)}€`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="text-sm font-semibold text-green-600">
                        {payslip.netToPay > 0
                          ? `${payslip.netToPay.toFixed(0)}€`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="text-sm">
                        {payslip.hoursWorked > 0
                          ? `${payslip.hoursWorked.toFixed(0)}h`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={payslip.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Voir"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* Reanalyze Button */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenReanalyzeMenu(
                                openReanalyzeMenu === payslip.id
                                  ? null
                                  : payslip.id,
                              )
                            }
                            className={`p-2 rounded-full transition-colors ${openReanalyzeMenu === payslip.id
                              ? "bg-purple-100 text-purple-700"
                              : "text-purple-600 hover:bg-purple-50"
                              }`}
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
                                    handleReanalyze(payslip.id, "ai");
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors text-left"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Relancer IA 🤖
                                </button>
                                <button
                                  onClick={() => {
                                    handleReanalyze(payslip.id, "traditional");
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-left"
                                >
                                  <FileText className="w-3.5 h-3.5" />
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
                ))}
              </tbody>
            </table>
          </div>

          {payslips.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucun bulletin de paie
            </div>
          )}
        </div>
      ) : (
        /* Mobile Card View */
        <div className="space-y-3">
          {sortedPayslips.map((payslip) => (
            <div
              key={payslip.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedPayslips.has(payslip.id)}
                    onChange={() => toggleSelect(payslip.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 w-5 h-5"
                  />
                  <div>
                    <div className="font-medium">
                      {payslip.periodMonth && payslip.periodYear
                        ? `${String(payslip.periodMonth).padStart(2, "0")}/${payslip.periodYear}`
                        : "—"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatName(payslip.employerName) || "Client inconnu"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mobile Reanalyze Button */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenReanalyzeMenu(
                          openReanalyzeMenu === payslip.id ? null : payslip.id,
                        )
                      }
                      className={`p-2 rounded-full transition-colors ${openReanalyzeMenu === payslip.id
                        ? "bg-purple-100 text-purple-700"
                        : "text-purple-600 hover:bg-purple-50"
                        }`}
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
                        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[50] p-1 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            onClick={() => {
                              handleReanalyze(payslip.id, "ai");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors text-left"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Relancer IA 🤖
                          </button>
                          <button
                            onClick={() => {
                              handleReanalyze(payslip.id, "traditional");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-left"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Extraire Classique ⚡
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <OverallConfidenceIndicator
                    score={payslip.confidenceScore || 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-gray-100 dark:border-gray-700">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    Brut
                  </div>
                  <div className="font-medium">
                    {payslip.grossSalary > 0
                      ? `${payslip.grossSalary.toFixed(0)}€`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Net</div>
                  <div className="font-semibold text-green-600">
                    {payslip.netToPay > 0
                      ? `${payslip.netToPay.toFixed(0)}€`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    Heures
                  </div>
                  <div className="font-medium">
                    {payslip.hoursWorked > 0
                      ? `${payslip.hoursWorked.toFixed(0)}h`
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <a
                  href={payslip.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir
                </a>
                <button
                  onClick={() => setEditingPayslip(payslip)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(payslip.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Suppr.
                </button>
              </div>
            </div>
          ))}

          {payslips.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              Aucun bulletin de paie
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
        <ClientChart clientData={clientData} />
        <div className="space-y-6">
          <FinancialTrendsChart timelineData={timelineData} />
          <HoursEvolutionChart timelineData={timelineData} />
          <HourlyRateChart timelineData={timelineData} />
        </div>
      </div>

      {/* Edit Modal */}
      {editingPayslip && (
        <EditModal
          payslip={editingPayslip}
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

// EditModal component (unchanged from original)
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold">Modifier le bulletin</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Salarié
              </label>
              <input
                type="text"
                name="employeeName"
                value={formData.employeeName || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Employeur
              </label>
              <input
                type="text"
                name="employerName"
                value={formData.employerName || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Mois
              </label>
              <input
                type="number"
                name="periodMonth"
                value={formData.periodMonth || ""}
                onChange={handleChange}
                min="1"
                max="12"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Année
              </label>
              <input
                type="number"
                name="periodYear"
                value={formData.periodYear || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Salaire Brut
              </label>
              <input
                type="number"
                name="grossSalary"
                value={formData.grossSalary || ""}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Net à Payer
              </label>
              <input
                type="number"
                name="netToPay"
                value={formData.netToPay || ""}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Heures Travaillées
              </label>
              <input
                type="number"
                name="hoursWorked"
                value={formData.hoursWorked || ""}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
