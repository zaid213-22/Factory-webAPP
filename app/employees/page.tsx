"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Phone, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  History, 
  Award, 
  Package, 
  Calculator,
  ArrowRight,
  TrendingUp,
  Download,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { DEPARTMENT_LIST, DepartmentCode, DEPARTMENTS, CURRENCY, formatCurrency } from "@/lib/types";
import { downloadCSV } from "@/lib/export-utils";
import Link from "next/link";

interface EmployeeItem {
  id: string;
  employeeCode: string;
  name: string;
  department: DepartmentCode;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  phone?: string | null;
  skillLevel?: string | null;
  assignedArticles: Array<{
    id: string;
    articleCode: string;
    name: string;
    currentStage: string;
    status: string;
    totalQuantityPairs: number;
  }>;
  _count?: {
    stageLogsPerformed: number;
    materialsLogged: number;
  };
}

interface EmployeeDetailData extends EmployeeItem {
  stageLogsPerformed: Array<{
    id: string;
    fromStage: string;
    toStage: string;
    actionTaken: string;
    quantityPairs: number;
    timestamp: string;
    notes?: string | null;
    article: {
      id: string;
      articleCode: string;
      name: string;
      currentStage: string;
      status: string;
    };
  }>;
  materialsLogged: Array<{
    id: string;
    materialName: string;
    department: string;
    quantityUsed: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
    createdAt: string;
    article: {
      articleCode: string;
      name: string;
    };
  }>;
}

export default function EmployeesPage() {
  const [allEmployees, setAllEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [employeeDetail, setEmployeeDetail] = useState<EmployeeDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    employeeCode: "",
    name: "",
    department: "CUTTING" as DepartmentCode,
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "ON_LEAVE",
    phone: "",
    skillLevel: "Skilled Operator",
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employees`);
      if (res.ok) {
        const data = await res.json();
        setAllEmployees(data);
      }
    } catch (err) {
      console.error("Fetch employees error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const deptCounts: Record<string, number> = {
    CUTTING: allEmployees.filter((e) => e.department === "CUTTING").length,
    UPPER: allEmployees.filter((e) => e.department === "UPPER").length,
    BOTTOM: allEmployees.filter((e) => e.department === "BOTTOM").length,
    FINISH: allEmployees.filter((e) => e.department === "FINISH").length,
  };

  const handleOpenAdd = () => {
    setFormData({
      employeeCode: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      department: selectedDept !== "ALL" ? (selectedDept as DepartmentCode) : "CUTTING",
      status: "ACTIVE",
      phone: "",
      skillLevel: "Skilled Operator",
    });
    setErrorMessage("");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setFormData({
      employeeCode: emp.employeeCode,
      name: emp.name,
      department: emp.department,
      status: emp.status,
      phone: emp.phone || "",
      skillLevel: emp.skillLevel || "Skilled Operator",
    });
    setErrorMessage("");
    setIsEditModalOpen(true);
  };

  const handleOpenHistory = async (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setIsHistoryModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/employees/${emp.id}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeeDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage("Please enter employee name.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create employee");
        return;
      }

      setIsAddModalOpen(false);
      setSuccessMessage(`Employee ${data.name} added successfully!`);
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchEmployees();
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update employee");
        return;
      }

      setIsEditModalOpen(false);
      setSuccessMessage(`Employee ${data.name} updated successfully!`);
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchEmployees();
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete employee");
        return;
      }

      setSuccessMessage(`Employee removed successfully.`);
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchEmployees();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredEmployees = allEmployees.filter((emp) => {
    if (selectedDept !== "ALL" && emp.department !== selectedDept) {
      return false;
    }
    if (selectedStatus !== "ALL" && emp.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchCode = emp.employeeCode.toLowerCase().includes(q);
      const matchPhone = emp.phone ? emp.phone.toLowerCase().includes(q) : false;
      return matchName || matchCode || matchPhone;
    }
    return true;
  });

  const handleExportCSV = () => {
    if (allEmployees.length === 0) {
      alert("No employee records to export.");
      return;
    }

    const headers = [
      "Employee ID",
      "Full Name",
      "Department Category",
      "Status",
      "Skill Level",
      "Phone",
      "Currently Assigned Article",
      "Total Batches Handled",
    ];

    const rows = [
      headers,
      ...filteredEmployees.map((e) => [
        e.employeeCode,
        e.name,
        DEPARTMENTS[e.department]?.workerTitle || e.department,
        e.status,
        e.skillLevel || "Skilled",
        e.phone || "N/A",
        e.assignedArticles && e.assignedArticles.length > 0
          ? `${e.assignedArticles[0].articleCode} - ${e.assignedArticles[0].name}`
          : "None",
        (e._count?.stageLogsPerformed || 0).toString(),
      ]),
    ];

    downloadCSV(`himalaya-employees-roster-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">Employee Directory</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-medium tabular-nums rounded">
              {allEmployees.length} Operators Registered
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Manage footwear technicians across Cutting, Upper, Bottom, and Finish departments with assignment tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Export Roster (CSV)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
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

      {/* Persistent Department Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {DEPARTMENT_LIST.map((dept) => {
          const count = deptCounts[dept.code] || 0;
          const isSelected = selectedDept === dept.code;
          return (
            <div
              key={dept.code}
              onClick={() => setSelectedDept(selectedDept === dept.code ? "ALL" : dept.code)}
              className={`p-4 rounded-md border cursor-pointer transition-all ${
                isSelected
                  ? "bg-accent/5 border-orange-500 ring-2 ring-orange-500/30  shadow-orange-500/10 scale-[1.02]"
                  : "panel panel-hover"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">
                  {dept.workerTitle}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: dept.color }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-ink tabular-nums">{count}</span>
                <span className="text-xs text-ink-muted font-medium">
                  {isSelected ? "Active Filter" : "Total Operators"}
                </span>
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
            placeholder="Search by worker name, employee ID (e.g. EMP-101), or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-border-ui rounded-md text-sm text-ink placeholder-stone-400 focus:outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Tabs */}
          <div className="flex items-center bg-stone-50 p-1 rounded-lg border border-stone-200">
            <button
              onClick={() => setSelectedDept("ALL")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedDept === "ALL"
                  ? "bg-white text-ink shadow-sm ring-1 ring-stone-200"
                  : "text-ink-muted hover:text-ink hover:bg-stone-100/50"
              }`}
            >
              All ({allEmployees.length})
            </button>
            {DEPARTMENT_LIST.map((d) => (
              <button
                key={d.code}
                onClick={() => setSelectedDept(d.code)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedDept === d.code
                    ? "bg-white text-ink shadow-sm ring-1 ring-stone-200"
                    : "text-ink-muted hover:text-ink hover:bg-stone-100/50"
                }`}
              >
                {d.workerTitle.replace(" Man", "")} ({deptCounts[d.code] || 0})
              </button>
            ))}
          </div>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employee List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted text-sm">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading factory operators...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="panel border-dashed rounded-md p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-md bg-white border border-border-ui flex items-center justify-center text-ink-muted">
            <Users className="w-7 h-7 text-stone-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">No Employees Found</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {searchQuery || selectedDept !== "ALL"
                ? `No operators match current filters in ${selectedDept !== "ALL" ? selectedDept : ""} department.`
                : "Your employee directory is empty. Add your first factory operator to begin assigning production batches."}
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 font-medium text-black text-xs shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add First Employee</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const deptMeta = DEPARTMENTS[emp.department] || DEPARTMENTS.CUTTING;
            const currentArticle = emp.assignedArticles && emp.assignedArticles.length > 0 ? emp.assignedArticles[0] : null;

            // Generate initials for avatar
            const initials = emp.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={emp.id}
                className="panel rounded-md p-5 flex flex-col justify-between space-y-4 hover:border-orange-500/40 transition-all duration-200 group"
              >
                <div>
                  {/* Top Bar: Avatar, Code, Dept Badge, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center font-semibold text-sm text-ink tabular-nums"
                        style={{ backgroundColor: `${deptMeta.color}30`, border: `1.5px solid ${deptMeta.color}` }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                            {emp.employeeCode}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${deptMeta.badgeClass}`}
                          >
                            {deptMeta.workerTitle}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-ink tracking-tight mt-1 group-hover:text-orange-300 transition-colors">
                          {emp.name}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-md font-medium ${
                        emp.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : emp.status === "ON_LEAVE"
                          ? "bg-accent/10 text-accent font-semibold border-accent/20"
                          : "bg-slate-900 text-ink-muted border border-slate-700"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>

                  {/* Skills & Phone */}
                  <div className="flex items-center gap-3 text-xs text-ink-muted mt-3 pt-3 border-t border-stone-100">
                    <span className="flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                      <strong className="text-ink">{emp.skillLevel || "Skilled"}</strong>
                    </span>
                    {emp.phone && (
                      <span className="flex items-center gap-1 tabular-nums text-[11px] text-ink-muted">
                        <Phone className="w-3 h-3 text-stone-400" />
                        {emp.phone}
                      </span>
                    )}
                  </div>

                  {/* Current Assignment Card */}
                  <div className="mt-3.5 p-3 rounded-md bg-white/90 border border-stone-100">
                    <span className="text-[10px] font-medium text-ink-muted block mb-1">
                      Current Assigned Batch:
                    </span>
                    {currentArticle ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="tabular-nums font-medium text-xs text-amber-700">
                              {currentArticle.articleCode}
                            </span>
                            <span className="text-xs text-ink font-semibold truncate max-w-[130px]">
                              {currentArticle.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-ink-muted mt-0.5 block">
                            {currentArticle.totalQuantityPairs} Pairs
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-300 border border-teal-500/40 font-medium">
                          In Progress
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400 italic">No batch assigned (Available)</span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                  <button
                    onClick={() => handleOpenHistory(emp)}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-orange-400 transition-colors font-semibold"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Activity ({emp._count?.stageLogsPerformed || 0})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="p-2 rounded-lg hover:bg-white/[0.08] text-ink hover:text-ink transition-colors"
                      title="Edit Employee"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id, emp.name)}
                      className="p-2 rounded-lg hover:bg-rose-950/50 text-ink-muted hover:text-rose-600 transition-colors"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPLOYEE HISTORY / ACTIVITY MODAL */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Worker History & Performance</h3>
                  <p className="text-xs text-ink-muted">Chronological trace of hand-offs and logged materials</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-ink-muted text-sm">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading worker history...
              </div>
            ) : employeeDetail ? (
              <div className="space-y-5">
                {/* Profile Card */}
                <div className="p-4 rounded-md bg-stone-50 border border-border-ui flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-base text-ink">{employeeDetail.name}</h4>
                      <span className="tabular-nums text-xs text-orange-400 font-medium">({employeeDetail.employeeCode})</span>
                    </div>
                    <span className="text-xs text-ink-muted font-medium mt-0.5 block">
                      Department: <strong className="text-ink">{DEPARTMENTS[employeeDetail.department]?.workerTitle}</strong> • Skill: <strong className="text-ink">{employeeDetail.skillLevel || "Skilled"}</strong>
                    </span>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    {employeeDetail.status}
                  </span>
                </div>

                {/* Stage Hand-offs Performed */}
                <div>
                  <h5 className="text-xs font-medium text-ink mb-2.5">
                    Production Stages Completed ({employeeDetail.stageLogsPerformed?.length || 0})
                  </h5>
                  {employeeDetail.stageLogsPerformed && employeeDetail.stageLogsPerformed.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {employeeDetail.stageLogsPerformed.map((log) => (
                        <div key={log.id} className="p-3 rounded-md bg-stone-50 border border-stone-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums font-medium text-amber-700">{log.article.articleCode}</span>
                              <span className="text-ink font-semibold">{log.article.name}</span>
                            </div>
                            <span className="text-[11px] text-ink-muted block mt-0.5">
                              {log.fromStage} → {log.toStage} • {log.actionTaken}
                              {log.notes && ` • "${log.notes}"`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="tabular-nums font-semibold text-ink">{log.quantityPairs} Pairs</span>
                            <span className="text-[10px] text-ink-muted block tabular-nums">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic p-3 rounded-md bg-stone-50">No stage completions recorded yet.</p>
                  )}
                </div>

                {/* Material Logs Performed */}
                <div>
                  <h5 className="text-xs font-medium text-ink mb-2.5">
                    Materials Logged ({employeeDetail.materialsLogged?.length || 0})
                  </h5>
                  {employeeDetail.materialsLogged && employeeDetail.materialsLogged.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {employeeDetail.materialsLogged.map((mat) => (
                        <div key={mat.id} className="p-3 rounded-md bg-stone-50 border border-stone-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-ink">{mat.materialName}</strong>
                              <span className="text-ink-muted">({mat.article.articleCode})</span>
                            </div>
                            <span className="text-[11px] text-ink-muted block mt-0.5">
                              {mat.quantityUsed} {mat.unit} @ {formatCurrency(mat.unitPrice)}
                            </span>
                          </div>
                          <span className="tabular-nums font-medium text-orange-400 text-sm">
                            {formatCurrency(mat.totalCost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic p-3 rounded-md bg-stone-50">No materials logged under this worker.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODALS */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-ink">
                  {isAddModalOpen ? "Add New Factory Operator" : "Edit Operator Profile"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
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

            <form
              onSubmit={isAddModalOpen ? handleSaveAdd : handleSaveEdit}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-101"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink tabular-nums uppercase focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Department Category *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as DepartmentCode })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    {DEPARTMENT_LIST.map((dept) => (
                      <option key={dept.code} value={dept.code}>
                        {dept.workerTitle} ({dept.label})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Karki"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Skill Level
                  </label>
                  <select
                    value={formData.skillLevel}
                    onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="Master Craftsman">Master Craftsman</option>
                    <option value="Senior Technician">Senior Technician</option>
                    <option value="Skilled Operator">Skilled Operator</option>
                    <option value="Apprentice">Apprentice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +977 9801234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 tabular-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-ui">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-semibold text-black text-xs transition-all shadow-orange-500/25 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? "Saving..." : isAddModalOpen ? "Save Operator" : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
