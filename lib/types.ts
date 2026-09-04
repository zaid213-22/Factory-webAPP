export type DepartmentCode = "CUTTING" | "UPPER" | "BOTTOM" | "FINISH";
export type ArticleStage = "CUTTING" | "UPPER" | "BOTTOM" | "FINISH" | "COMPLETED";
export type ArticleStatus = "IN_PROGRESS" | "STOCKED" | "COMPLETED";

export const CURRENCY = "Rs.";

export function formatCurrency(amount: number): string {
  return `Rs. ${(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface DepartmentMeta {
  code: DepartmentCode;
  label: string;
  workerTitle: string;
  color: string;
  bgDark: string;
  borderColor: string;
  badgeClass: string;
  nextStage: ArticleStage | null;
  prevStage: ArticleStage | null;
  stepNumber: number;
  description: string;
}

export const DEPARTMENTS: Record<DepartmentCode, DepartmentMeta> = {
  CUTTING: {
    code: "CUTTING",
    label: "Cutting Stage",
    workerTitle: "Cutting Man",
    color: "#14b8a6",
    bgDark: "#042f2e",
    borderColor: "#0d9488",
    badgeClass: "bg-teal-950/80 text-teal-300 border-teal-700/60",
    nextStage: "UPPER",
    prevStage: null,
    stepNumber: 1,
    description: "Pattern cutting from leather/fabrics & component batching",
  },
  UPPER: {
    code: "UPPER",
    label: "Upper Stage",
    workerTitle: "Upper Man",
    color: "#818cf8",
    bgDark: "#1e1b4b",
    borderColor: "#6366f1",
    badgeClass: "bg-indigo-950/80 text-indigo-300 border-indigo-700/60",
    nextStage: "BOTTOM",
    prevStage: "CUTTING",
    stepNumber: 2,
    description: "Upper stitching, skiving, lining assembly, and eyelet placement",
  },
  BOTTOM: {
    code: "BOTTOM",
    label: "Bottom Stage",
    workerTitle: "Bottom Man",
    color: "#f59e0b",
    bgDark: "#451a03",
    borderColor: "#d97706",
    badgeClass: "bg-amber-950/80 text-amber-300 border-amber-700/60",
    nextStage: "FINISH",
    prevStage: "UPPER",
    stepNumber: 3,
    description: "Lasting, sole attachment, cementing, and sole molding",
  },
  FINISH: {
    code: "FINISH",
    label: "Finish Stage",
    workerTitle: "Finish Man",
    color: "#34d399",
    bgDark: "#064e3b",
    borderColor: "#059669",
    badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
    nextStage: "COMPLETED",
    prevStage: "BOTTOM",
    stepNumber: 4,
    description: "Cleaning, polishing, lacing, quality inspection, and packaging",
  },
};

export const DEPARTMENT_LIST: DepartmentMeta[] = [
  DEPARTMENTS.CUTTING,
  DEPARTMENTS.UPPER,
  DEPARTMENTS.BOTTOM,
  DEPARTMENTS.FINISH,
];

export const STANDARD_UNITS = [
  { value: "sq_ft", label: "Square Feet (sq. ft)" },
  { value: "meters", label: "Meters (m)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "pairs", label: "Pairs" },
  { value: "liters", label: "Liters (L)" },
  { value: "spools", label: "Spools" },
  { value: "pieces", label: "Pieces (pcs)" },
  { value: "rolls", label: "Rolls" },
];
