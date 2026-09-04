"use client";

import { useState, useEffect } from "react";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Filter, 
  Search, 
  Layers, 
  Package, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  Download,
  PlusCircle,
  Sparkles,
  PenTool,
  List
} from "lucide-react";
import { DEPARTMENT_LIST, DepartmentCode, DEPARTMENTS, STANDARD_UNITS, CURRENCY, formatCurrency } from "@/lib/types";
import { downloadCSV } from "@/lib/export-utils";

interface MaterialLogItem {
  id: string;
  articleId: string;
  department: DepartmentCode;
  materialName: string;
  unit: string;
  unitPrice: number;
  quantityUsed: number;
  totalCost: number;
  notes?: string | null;
  createdAt: string;
  article?: {
    id: string;
    articleCode: string;
    name: string;
    totalQuantityPairs: number;
    currentStage: string;
  } | null;
  loggedBy?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  } | null;
}

interface ArticleOption {
  id: string;
  articleCode: string;
  name: string;
  totalQuantityPairs: number;
  currentStage: string;
  status: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
}

interface MaterialRow {
  id: string;
  materialName: string;
  unit: string;
  unitPrice: number | string;
  quantityUsed: number | string;
  notes?: string;
}

export default function MaterialsPage() {
  const [materialLogs, setMaterialLogs] = useState<MaterialLogItem[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedArticleFilter, setSelectedArticleFilter] = useState<string>("ALL");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [articleMode, setArticleMode] = useState<"MANUAL" | "EXISTING">("MANUAL");
  const [manualArticleCode, setManualArticleCode] = useState("");
  const [manualArticleName, setManualArticleName] = useState("");
  const [manualBatchQty, setManualBatchQty] = useState<number | string>(50);

  const [targetArticleId, setTargetArticleId] = useState("");
  const [targetDept, setTargetDept] = useState<DepartmentCode>("CUTTING");
  const [loggedByWorkerId, setLoggedByWorkerId] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([
    { id: "1", materialName: "", unit: "sq_ft", unitPrice: "", quantityUsed: "", notes: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, artRes, empRes] = await Promise.all([
        fetch("/api/materials"),
        fetch("/api/articles"),
        fetch("/api/employees"),
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setMaterialLogs(logsData);
      }
      if (artRes.ok) {
        const artData = await artRes.json();
        setArticles(artData);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = (defaultArticleId?: string) => {
    if (defaultArticleId) {
      setArticleMode("EXISTING");
      setTargetArticleId(defaultArticleId);
    } else {
      setArticleMode("MANUAL");
      setTargetArticleId("");
    }

    setManualArticleCode("");
    setManualArticleName("");
    setManualBatchQty(50);
    setTargetDept("CUTTING");
    setLoggedByWorkerId("");
    setBatchNotes("");
    setMaterialRows([
      { id: "1", materialName: "", unit: "sq_ft", unitPrice: "", quantityUsed: "", notes: "" },
    ]);
    setErrorMessage("");
    setIsAddModalOpen(true);
  };

  const handleAddMaterialRow = () => {
    setMaterialRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        materialName: "",
        unit: "sq_ft",
        unitPrice: "",
        quantityUsed: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveMaterialRow = (rowId: string) => {
    if (materialRows.length === 1) {
      // Clear row instead of deleting last one
      setMaterialRows([
        { id: "1", materialName: "", unit: "sq_ft", unitPrice: "", quantityUsed: "", notes: "" },
      ]);
      return;
    }
    setMaterialRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleRowChange = (rowId: string, field: keyof MaterialRow, value: any) => {
    setMaterialRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveMaterials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (articleMode === "EXISTING" && !targetArticleId) {
      setErrorMessage("Please choose a target shoe article from the list.");
      return;
    }

    if (articleMode === "MANUAL" && !manualArticleCode.trim()) {
      setErrorMessage("Please enter an Article Code (e.g. ART-902).");
      return;
    }

    // Validate material rows
    const validRows = materialRows.filter((r) => r.materialName.trim() !== "");
    if (validRows.length === 0) {
      setErrorMessage("Please enter at least one material item name.");
      return;
    }

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const qty = parseFloat(String(r.quantityUsed));
      const price = parseFloat(String(r.unitPrice));
      if (isNaN(qty) || qty <= 0) {
        setErrorMessage(`Row ${i + 1} (${r.materialName || "Material"}): Please enter a valid quantity.`);
        return;
      }
      if (isNaN(price) || price < 0) {
        setErrorMessage(`Row ${i + 1} (${r.materialName || "Material"}): Please enter a valid unit price.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const payload = {
        articleId: articleMode === "EXISTING" ? targetArticleId : undefined,
        manualArticleCode: articleMode === "MANUAL" ? manualArticleCode.trim().toUpperCase() : undefined,
        manualArticleName: articleMode === "MANUAL" ? (manualArticleName.trim() || `Article ${manualArticleCode.trim().toUpperCase()}`) : undefined,
        totalQuantityPairs: Number(manualBatchQty) || 50,
        department: targetDept,
        loggedByEmployeeId: loggedByWorkerId || null,
        defaultNotes: batchNotes || null,
        items: validRows.map((r) => ({
          materialName: r.materialName.trim(),
          unit: r.unit,
          unitPrice: parseFloat(String(r.unitPrice)) || 0,
          quantityUsed: parseFloat(String(r.quantityUsed)) || 0,
          notes: r.notes || null,
        })),
      };

      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to log material consumption");
        return;
      }

      setIsAddModalOpen(false);
      setSuccessMessage(`Successfully recorded ${validRows.length} material item(s).`);
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove log for "${name}"?`)) return;

    try {
      const res = await fetch(`/api/materials?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered list
  const filteredLogs = materialLogs.filter((log) => {
    if (selectedArticleFilter !== "ALL" && log.articleId !== selectedArticleFilter) {
      return false;
    }
    if (selectedDeptFilter !== "ALL" && log.department !== selectedDeptFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.materialName.toLowerCase().includes(q) ||
        (log.article?.articleCode || "").toLowerCase().includes(q) ||
        (log.article?.name || "").toLowerCase().includes(q) ||
        (log.loggedBy?.name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Metrics
  const totalCost = filteredLogs.reduce((sum, item) => sum + item.totalCost, 0);

  const costByDept: Record<string, number> = {
    CUTTING: filteredLogs.filter((l) => l.department === "CUTTING").reduce((sum, l) => sum + l.totalCost, 0),
    UPPER: filteredLogs.filter((l) => l.department === "UPPER").reduce((sum, l) => sum + l.totalCost, 0),
    BOTTOM: filteredLogs.filter((l) => l.department === "BOTTOM").reduce((sum, l) => sum + l.totalCost, 0),
    FINISH: filteredLogs.filter((l) => l.department === "FINISH").reduce((sum, l) => sum + l.totalCost, 0),
  };

  // Grand total for current modal items
  const modalGrandTotal = materialRows.reduce((sum, r) => {
    const qty = parseFloat(String(r.quantityUsed)) || 0;
    const price = parseFloat(String(r.unitPrice)) || 0;
    return sum + qty * price;
  }, 0);

  const handleExportCSV = () => {
    if (materialLogs.length === 0) {
      alert("No material logs to export.");
      return;
    }

    const headers = [
      "Article Code",
      "Shoe Model",
      "Department",
      "Material Name",
      "Quantity Used",
      "Unit",
      `Unit Price (${CURRENCY})`,
      `Total Cost (${CURRENCY})`,
      "Logged By",
      "Date",
    ];

    const rows = [
      headers,
      ...filteredLogs.map((l) => [
        l.article?.articleCode || "N/A",
        l.article?.name || "N/A",
        l.department,
        l.materialName,
        l.quantityUsed.toString(),
        l.unit,
        l.unitPrice.toFixed(2),
        l.totalCost.toFixed(2),
        l.loggedBy?.name || "N/A",
        new Date(l.createdAt).toLocaleDateString(),
      ]),
    ];

    downloadCSV(`himalaya-materials-audit-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">Material & Cost Ledger</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-medium tabular-nums rounded">
              Total {formatCurrency(totalCost)}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Log and audit raw materials consumed for your custom shoe production runs in Nepali Rupees ({CURRENCY}).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Export Cost Ledger (CSV)</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Log Material Consumption</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-sm text-emerald-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-700 hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Department Cost Share Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {DEPARTMENT_LIST.map((dept) => {
          const deptCost = costByDept[dept.code] || 0;
          const pct = totalCost > 0 ? (deptCost / totalCost) * 100 : 0;

          return (
            <div
              key={dept.code}
              className="panel panel-hover p-4 rounded-md space-y-2 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: dept.color }} />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">
                  {dept.workerTitle}
                </span>
                <span className="text-[10px] tabular-nums font-medium text-ink-muted bg-white px-2 py-0.5 rounded-md border border-border-ui">
                  {pct.toFixed(0)}% Share
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-2xl font-black text-ink tabular-nums">{formatCurrency(deptCost)}</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: dept.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search material names, article codes, models, or loggers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-border-ui rounded-md text-sm text-ink placeholder-stone-400 focus:outline-none focus:border-accent"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Article Filter */}
          <select
            value={selectedArticleFilter}
            onChange={(e) => setSelectedArticleFilter(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium"
          >
            <option value="ALL">All Shoe Batches</option>
            {articles.map((art) => (
              <option key={art.id} value={art.id}>
                {art.articleCode} - {art.name}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENT_LIST.map((d) => (
              <option key={d.code} value={d.code}>
                {d.workerTitle} ({d.label})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Material Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted text-sm">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading material audit records...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="panel border-dashed rounded-md p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-md bg-white border border-border-ui flex items-center justify-center text-ink-muted">
            <Calculator className="w-7 h-7 text-stone-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">No Material Consumption Records</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Click below to enter materials for any shoe article batch.
            </p>
          </div>
          <button
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 font-medium text-black text-xs shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Log Material Usage</span>
          </button>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-border-ui text-[10px] font-medium text-ink-muted">
                <tr>
                  <th className="px-5 py-4">Target Article</th>
                  <th className="px-4 py-4">Department</th>
                  <th className="px-4 py-4">Raw Material Consumed</th>
                  <th className="px-4 py-4">Quantity Used</th>
                  <th className="px-4 py-4">Unit Price ({CURRENCY})</th>
                  <th className="px-4 py-4">Batch Subtotal</th>
                  <th className="px-4 py-4">Logged By / Date</th>
                  <th className="px-4 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredLogs.map((log) => {
                  const deptMeta = DEPARTMENTS[log.department] || DEPARTMENTS.CUTTING;

                  return (
                    <tr key={log.id} className="hover:bg-stone-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                            {log.article?.articleCode || "N/A"}
                          </span>
                          <span className="font-semibold text-ink">{log.article?.name}</span>
                        </div>
                        <span className="text-[11px] text-ink-muted block mt-0.5 font-medium">
                          Batch: {log.article?.totalQuantityPairs || 0} Pairs
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`text-[10px] px-2.5 py-1 rounded-md border font-medium ${deptMeta.badgeClass}`}>
                          {deptMeta.workerTitle}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-semibold text-ink block">{log.materialName}</span>
                        {log.notes && (
                          <span className="text-[11px] text-ink-muted block truncate max-w-[180px]">
                            {log.notes}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 tabular-nums font-medium text-ink">
                        {log.quantityUsed} {log.unit}
                      </td>

                      <td className="px-4 py-4 tabular-nums text-ink">
                        {formatCurrency(log.unitPrice)} / {log.unit}
                      </td>

                      <td className="px-4 py-4 tabular-nums font-semibold text-orange-400 text-sm">
                        {formatCurrency(log.totalCost)}
                      </td>

                      <td className="px-4 py-4 text-xs text-ink-muted">
                        <span className="text-ink font-medium block">{log.loggedBy ? log.loggedBy.name : "Supervisor"}</span>
                        <span className="tabular-nums text-[10px] text-stone-400">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDelete(log.id, log.materialName)}
                          className="p-2 rounded-lg hover:bg-rose-950/50 text-ink-muted hover:text-rose-600 transition-colors"
                          title="Delete Log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MULTI-MATERIAL LOGGING MODAL WITH USER MANUAL ARTICLE ENTRY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Log Material Consumption</h3>
                  <p className="text-xs text-ink-muted">Specify your shoe article and add as many materials as needed</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-md bg-rose-950/80 border border-rose-700/60 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveMaterials} className="space-y-5">
              {/* TARGET ARTICLE SELECTION / MANUAL ENTRY */}
              <div className="p-4 rounded-md bg-stone-50 border border-border-ui space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">
                    Target Shoe Article Batch *
                  </span>
                  
                  {/* Switcher Tabs between Type Manually and Select Dropdown */}
                  <div className="flex items-center bg-white p-1 rounded-lg border border-border-ui text-xs">
                    <button
                      type="button"
                      onClick={() => setArticleMode("MANUAL")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                        articleMode === "MANUAL"
                          ? "bg-accent text-ink shadow-sm"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <PenTool className="w-3 h-3" />
                      <span>Type Article Manually</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticleMode("EXISTING")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                        articleMode === "EXISTING"
                          ? "bg-accent text-ink shadow-sm"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <List className="w-3 h-3" />
                      <span>Choose Existing ({articles.length})</span>
                    </button>
                  </div>
                </div>

                {/* Option 1: Manual Article Entry */}
                {articleMode === "MANUAL" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-medium text-ink mb-1">
                        Article / Style Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ART-902"
                        value={manualArticleCode}
                        onChange={(e) => setManualArticleCode(e.target.value.toUpperCase())}
                        className="w-full bg-white border border-border-ui rounded-md px-3 py-2 text-sm text-ink tabular-nums uppercase focus:outline-none focus:border-orange-500 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-ink mb-1">
                        Shoe Model / Style Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Waterproof Leather Boot"
                        value={manualArticleName}
                        onChange={(e) => setManualArticleName(e.target.value)}
                        className="w-full bg-white border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-ink mb-1">
                        Batch Pairs
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="50"
                        value={manualBatchQty}
                        onChange={(e) => setManualBatchQty(e.target.value)}
                        className="w-full bg-white border border-border-ui rounded-md px-3 py-2 text-sm text-ink tabular-nums focus:outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  /* Option 2: Select from Existing Articles */
                  <div className="pt-1">
                    <select
                      value={targetArticleId}
                      onChange={(e) => setTargetArticleId(e.target.value)}
                      className="w-full bg-white border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                    >
                      <option value="">-- Select from your batches --</option>
                      {articles.map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.articleCode} - {art.name} ({art.totalQuantityPairs} Pairs, Stage: {art.currentStage})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Department Selection */}
                <div className="pt-2 border-t border-stone-100">
                  <label className="block text-[11px] font-medium text-ink mb-1">
                    Factory Department *
                  </label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value as DepartmentCode)}
                    className="w-full bg-white border border-border-ui rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    {DEPARTMENT_LIST.map((dept) => (
                      <option key={dept.code} value={dept.code}>
                        {dept.workerTitle} ({dept.label})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DYNAMIC MULTI-MATERIAL ITEMS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">
                    Material Items ({materialRows.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-400 font-medium text-xs transition-all active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ Add More Material</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {materialRows.map((row, index) => {
                    const rowSubtotal = (parseFloat(String(row.unitPrice)) || 0) * (parseFloat(String(row.quantityUsed)) || 0);

                    return (
                      <div
                        key={row.id}
                        className="p-3.5 rounded-md bg-stone-50 border border-border-ui space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-ink-muted">
                            Material #{index + 1}
                          </span>
                          {materialRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterialRow(row.id)}
                              className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors"
                              title="Remove this material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          {/* Material Name */}
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] text-ink-muted mb-1 font-medium">
                              Material Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Leather, Rubber Soles, Nylon Thread..."
                              value={row.materialName}
                              onChange={(e) => handleRowChange(row.id, "materialName", e.target.value)}
                              className="w-full bg-white border border-border-ui rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-orange-500 font-medium"
                            />
                          </div>

                          {/* Unit */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-ink-muted mb-1 font-medium">
                              Unit
                            </label>
                            <select
                              value={row.unit}
                              onChange={(e) => handleRowChange(row.id, "unit", e.target.value)}
                              className="w-full bg-white border border-border-ui rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-orange-500 font-medium"
                            >
                              {STANDARD_UNITS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Unit Price */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-ink-muted mb-1 font-medium">
                              Price ({CURRENCY}) *
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="0.00"
                              required
                              value={row.unitPrice}
                              onChange={(e) => handleRowChange(row.id, "unitPrice", e.target.value)}
                              className="w-full bg-white border border-border-ui rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-orange-500 tabular-nums font-medium"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-ink-muted mb-1 font-medium">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0"
                              required
                              value={row.quantityUsed}
                              onChange={(e) => handleRowChange(row.id, "quantityUsed", e.target.value)}
                              className="w-full bg-white border border-border-ui rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-orange-500 tabular-nums font-medium"
                            />
                          </div>

                          {/* Row Subtotal */}
                          <div className="sm:col-span-1 text-right pb-1">
                            <span className="block text-[9px] text-ink-muted">Subtotal</span>
                            <span className="tabular-nums font-medium text-xs text-orange-400 whitespace-nowrap">
                              {formatCurrency(rowSubtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* + Add Another Material Button Row */}
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-stone-50 hover:bg-white border border-dashed border-white/[0.15] hover:border-orange-500/50 text-xs font-medium text-ink hover:text-ink transition-all w-full justify-center"
                  >
                    <Plus className="w-4 h-4 text-orange-400" />
                    <span>+ Click to Add Another Material Item</span>
                  </button>
                </div>
              </div>

              {/* Optional Logger & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Logged By / Operator (Optional)
                  </label>
                  <select
                    value={loggedByWorkerId}
                    onChange={(e) => setLoggedByWorkerId(e.target.value)}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-medium"
                  >
                    <option value="">-- Floor Supervisor / Default --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Batch Remarks / Roll # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Italian tanned leather, Sole mold lot #10"
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="p-4 rounded-md bg-gradient-to-r from-[#05151d] via-[#09222d] to-[#05151d] border border-orange-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-ink block">
                    Combined Batch Material Total
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    Total for {materialRows.filter((r) => r.materialName.trim()).length || materialRows.length} item(s)
                  </span>
                </div>
                <span className="tabular-nums font-semibold text-2xl text-orange-400">
                  {formatCurrency(modalGrandTotal)}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-ui">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-semibold text-black text-xs transition-all shadow-orange-500/25 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? "Saving..." : `Record All Material Items (${formatCurrency(modalGrandTotal)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
