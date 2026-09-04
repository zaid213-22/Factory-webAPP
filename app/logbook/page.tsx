"use client";

import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  Trash2, 
  Layers, 
  Sparkles,
  TrendingUp,
  Award
} from "lucide-react";
import { DEPARTMENT_LIST, DepartmentCode, DEPARTMENTS, CURRENCY, formatCurrency } from "@/lib/types";
import { downloadCSV } from "@/lib/export-utils";

interface LogBookItem {
  id: string;
  employeeId: string;
  department: DepartmentCode;
  date: string;
  shift: string;
  attendance: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
  pairsProduced: number;
  ratePerPair: number;
  totalEarnings: number;
  overtimeHours: number;
  articleCode?: string | null;
  remarks?: string | null;
  employee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  } | null;
}

interface EmployeeOption {
  id: string;
  name: string;
  employeeCode: string;
  department: DepartmentCode;
  status: string;
}

export default function LogBookPage() {
  const [logs, setLogs] = useState<LogBookItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedShift, setSelectedShift] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState<{
    employeeId: string;
    date: string;
    shift: string;
    attendance: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
    pairsProduced: number | string;
    ratePerPair: number | string;
    overtimeHours: number | string;
    articleCode: string;
    remarks: string;
  }>({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    shift: "Day Shift",
    attendance: "PRESENT",
    pairsProduced: 24,
    ratePerPair: 25.0, // Default piece rate in Nepali Rs.
    overtimeHours: 0,
    articleCode: "",
    remarks: "",
  });

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (selectedDept !== "ALL") params.append("department", selectedDept);
      if (selectedShift !== "ALL") params.append("shift", selectedShift);

      const res = await fetch(`/api/logbook?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedDate, selectedDept, selectedShift]);

  const handleOpenAdd = () => {
    const firstEmp = employees.length > 0 ? employees[0] : null;
    setFormData({
      employeeId: firstEmp ? firstEmp.id : "",
      date: new Date().toISOString().slice(0, 10),
      shift: "Day Shift",
      attendance: "PRESENT",
      pairsProduced: 24,
      ratePerPair: 25.0,
      overtimeHours: 0,
      articleCode: "",
      remarks: "",
    });
    setErrorMessage("");
    setIsAddModalOpen(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      setErrorMessage("Please select a factory worker.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const selectedEmp = employees.find((emp) => emp.id === formData.employeeId);
      const pairs = parseInt(String(formData.pairsProduced), 10) || 0;
      const rate = parseFloat(String(formData.ratePerPair)) || 0;
      const overtime = parseFloat(String(formData.overtimeHours)) || 0;

      const res = await fetch("/api/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          pairsProduced: pairs,
          ratePerPair: rate,
          overtimeHours: overtime,
          department: selectedEmp?.department || "CUTTING",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to record logbook entry");
        return;
      }

      setIsAddModalOpen(false);
      setSuccessMessage("Daily worker log recorded successfully.");
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchLogs();
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this logbook entry?")) return;

    try {
      const res = await fetch(`/api/logbook?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.employee?.name.toLowerCase().includes(q) ||
        log.employee?.employeeCode.toLowerCase().includes(q) ||
        (log.articleCode || "").toLowerCase().includes(q) ||
        (log.remarks || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPI Calculations
  const totalPairs = filteredLogs.reduce((sum, l) => sum + (l.pairsProduced || 0), 0);
  const totalWages = filteredLogs.reduce((sum, l) => sum + (l.totalEarnings || 0), 0);
  const presentCount = filteredLogs.filter((l) => l.attendance === "PRESENT").length;
  const totalOvertime = filteredLogs.reduce((sum, l) => sum + (l.overtimeHours || 0), 0);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert("No logbook records to export.");
      return;
    }

    const headers = [
      "Date",
      "Employee ID",
      "Worker Name",
      "Department",
      "Shift",
      "Attendance",
      "Pairs Produced",
      `Rate Per Pair (${CURRENCY})`,
      `Total Earnings (${CURRENCY})`,
      "Overtime (Hours)",
      "Style Code",
      "Remarks",
    ];

    const rows = [
      headers,
      ...filteredLogs.map((l) => [
        new Date(l.date).toLocaleDateString(),
        l.employee?.employeeCode || "N/A",
        l.employee?.name || "N/A",
        l.department,
        l.shift,
        l.attendance,
        l.pairsProduced.toString(),
        l.ratePerPair.toFixed(2),
        l.totalEarnings.toFixed(2),
        l.overtimeHours.toString(),
        l.articleCode || "",
        l.remarks || "",
      ]),
    ];

    downloadCSV(`himalaya-logbook-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">Operator Daily Log Book</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-medium tabular-nums rounded">
              {logs.length} Shift Logs
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Track daily attendance, shift logs, pairs completed, piece-rate wages in {CURRENCY}, and overtime hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Export Payroll (CSV)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Daily Shift Log</span>
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

      {/* 4 KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Pairs */}
        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
          <span className="text-xs font-medium text-teal-700 tabular-nums">
            Pairs Produced
          </span>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-ink tabular-nums">{totalPairs.toLocaleString()}</span>
            <span className="text-xs text-ink-muted font-semibold">Pairs</span>
          </div>
          <span className="text-[11px] text-ink-muted block font-medium">In selected view</span>
        </div>

        {/* Total Wages */}
        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
          <span className="text-[10px] font-medium text-ink-muted tabular-nums">
            Total Piece Wages
          </span>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-3xl font-black text-orange-400 tabular-nums">
              {formatCurrency(totalWages)}
            </span>
          </div>
          <span className="text-[11px] text-ink-muted block font-medium">Calculated piece payouts</span>
        </div>

        {/* Present Workers */}
        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-700 tabular-nums">
            Present Workers
          </span>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-ink tabular-nums">{presentCount}</span>
            <span className="text-xs text-ink-muted font-semibold">Operators</span>
          </div>
          <span className="text-[11px] text-emerald-700 block font-medium">On factory floor</span>
        </div>

        {/* Overtime */}
        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <span className="text-xs font-medium text-purple-400 tabular-nums">
            Overtime Logged
          </span>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-black text-ink tabular-nums">{totalOvertime}</span>
            <span className="text-xs text-ink-muted font-semibold">Hours</span>
          </div>
          <span className="text-[11px] text-violet-700 block font-medium">Extra shift hours</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by worker name, employee ID (e.g. EMP-101), style code, or remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-border-ui rounded-md text-sm text-ink placeholder-stone-400 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white border border-border-ui px-3 py-2 rounded-md text-xs">
            <Calendar className="w-4 h-4 text-orange-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-ink focus:outline-none font-semibold"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="text-orange-400 hover:text-ink text-[10px] font-medium bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/30 hover:bg-orange-500/20 transition-all whitespace-nowrap"
              >
                View All History
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENT_LIST.map((d) => (
              <option key={d.code} value={d.code}>
                {d.workerTitle} ({d.label})
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium"
          >
            <option value="ALL">All Shifts</option>
            <option value="Day Shift">Day Shift</option>
            <option value="Morning Shift">Morning Shift</option>
            <option value="Night Shift">Night Shift</option>
          </select>
        </div>
      </div>

      {/* Log Book Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted text-sm">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading log book entries...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="panel border-dashed rounded-md p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-md bg-white border border-border-ui flex items-center justify-center text-ink-muted">
            <BookOpen className="w-7 h-7 text-stone-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">No Log Book Entries Found</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {selectedDate || selectedDept !== "ALL" || searchQuery
                ? "No entries match your active filters. Try clearing date or search filters."
                : "No daily operator logs recorded yet. Click below to record today's production shift output."}
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 font-medium text-black text-xs shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Daily Worker Log</span>
          </button>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-border-ui text-[10px] font-medium text-ink-muted">
                <tr>
                  <th className="px-5 py-4">Date & Worker</th>
                  <th className="px-4 py-4">Department</th>
                  <th className="px-4 py-4">Shift & Status</th>
                  <th className="px-4 py-4">Pairs Produced</th>
                  <th className="px-4 py-4">Piece Wages ({CURRENCY})</th>
                  <th className="px-4 py-4">Overtime</th>
                  <th className="px-4 py-4">Style / Remarks</th>
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
                            {log.employee?.employeeCode || "EMP"}
                          </span>
                          <span className="font-semibold text-ink tracking-tight">{log.employee?.name}</span>
                        </div>
                        <span className="text-[11px] text-ink-muted block mt-0.5 font-medium">
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`text-[10px] px-2.5 py-1 rounded-md border font-medium ${deptMeta.badgeClass}`}>
                          {deptMeta.workerTitle}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs">
                        <span className="text-ink font-medium block">{log.shift}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium inline-block mt-1 ${
                            log.attendance === "PRESENT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : log.attendance === "HALF_DAY"
                              ? "bg-accent/10 text-accent font-semibold border-accent/20"
                              : "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {log.attendance}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="tabular-nums font-semibold text-ink text-base">
                          {log.pairsProduced}
                        </span>
                        <span className="text-xs text-ink-muted ml-1">Pairs</span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="tabular-nums font-semibold text-orange-400 text-sm">
                          {formatCurrency(log.totalEarnings)}
                        </div>
                        <span className="text-[11px] text-ink-muted tabular-nums block">
                          @{formatCurrency(log.ratePerPair)}/pr
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs">
                        {log.overtimeHours > 0 ? (
                          <span className="tabular-nums text-violet-700 font-medium px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/40">
                            +{log.overtimeHours} hrs OT
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-xs">
                        {log.articleCode && (
                          <span className="tabular-nums text-amber-700 font-medium block">
                            {log.articleCode}
                          </span>
                        )}
                        <span className="text-ink-muted truncate max-w-[160px] block">
                          {log.remarks || "Regular shift"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-2 rounded-lg hover:bg-rose-950/50 text-ink-muted hover:text-rose-600 transition-colors"
                          title="Delete Entry"
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

      {/* RECORD DAILY LOG MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">Record Daily Worker Shift Log</h3>
                  <p className="text-xs text-ink-muted">Daily attendance, output pairs, and piece wage calculations in {CURRENCY}</p>
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

            <form onSubmit={handleSaveLog} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Select Factory Worker *
                </label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                >
                  <option value="">-- Choose Worker --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} - {emp.name} ({DEPARTMENTS[emp.department]?.workerTitle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Log Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Shift *
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="Day Shift">Day Shift (8 AM - 5 PM)</option>
                    <option value="Morning Shift">Morning Shift (6 AM - 2 PM)</option>
                    <option value="Night Shift">Night Shift (5 PM - 1 AM)</option>
                  </select>
                </div>
              </div>

              {/* Attendance & Overtime */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Attendance Status *
                  </label>
                  <select
                    value={formData.attendance}
                    onChange={(e) => setFormData({ ...formData, attendance: e.target.value as any })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="PRESENT">Full Day Present</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="LEAVE">Approved Leave</option>
                    <option value="ABSENT">Absent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Overtime (Hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0"
                    value={formData.overtimeHours}
                    onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink tabular-nums focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Pairs Crafted & Piece Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Pairs Completed Today *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    required
                    value={formData.pairsProduced}
                    onChange={(e) => setFormData({ ...formData, pairsProduced: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink tabular-nums focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Piece Rate ({CURRENCY} / pair) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0.00"
                    required
                    value={formData.ratePerPair}
                    onChange={(e) => setFormData({ ...formData, ratePerPair: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink tabular-nums focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Piece Wage Live Subtotal */}
              <div className="p-3.5 rounded-md bg-stone-50 border border-border-ui flex items-center justify-between">
                <span className="text-xs text-ink font-semibold">Total Calculated Daily Earnings:</span>
                <span className="tabular-nums font-semibold text-lg text-orange-400">
                  {formatCurrency((Number(formData.pairsProduced) || 0) * (Number(formData.ratePerPair) || 0))}
                </span>
              </div>

              {/* Article Style Code & Remarks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Style Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ART-902"
                    value={formData.articleCode}
                    onChange={(e) => setFormData({ ...formData, articleCode: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink tabular-nums uppercase focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Supervisor Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Extra heel stitching"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Actions */}
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
                  className="px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-semibold text-black text-xs transition-all shadow-orange-500/25 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? "Recording..." : "Save Daily Shift Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
