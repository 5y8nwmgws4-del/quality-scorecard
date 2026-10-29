export type InspectionStatus =
  | "Passed"
  | "Failed"
  | "Needs review"
  | "Scheduled";
export type Inspection = {
  id: string;
  name: string;
  category: string;
  location: string;
  inspector: string;
  date: string;
  score: number | null;
  status: InspectionStatus;
  notes: string;
};
export type Issue = {
  id: string;
  title: string;
  inspection: string;
  location: string;
  severity: "Critical" | "Major" | "Minor";
  owner: string;
  due: string;
  status: "Open" | "In progress" | "Resolved";
};
export const LOCATIONS = ["North facility", "East facility", "West facility"];
export const INSPECTORS = [
  "Sarah Chen",
  "James Wilson",
  "Emily Davis",
  "Michael Brown",
  "Alex Morgan",
];
export const CATEGORIES = [
  "Product quality",
  "Process compliance",
  "Safety & environment",
  "Supplier quality",
];
export const ANCHOR = new Date("2026-10-29T12:00:00Z");
export const CATEGORY_COLORS = ["#16866e", "#5c9c90", "#86b9ac", "#b1d2c7"];
const names = [
  "Final product inspection",
  "Production line audit",
  "Incoming material check",
  "Workplace safety inspection",
  "Packaging quality check",
  "Supplier compliance audit",
  "Equipment calibration check",
  "Assembly process review",
  "Environmental compliance",
  "Raw material verification",
  "Finished goods inspection",
  "Process control audit",
];
const notes = [
  "All checkpoints meet the quality standard. Documentation and measurements have been verified.",
  "Routine assessment of production standards, traceability, and process consistency.",
  "Incoming materials checked against specifications. Sampling completed per the inspection plan.",
];
function seedInspections(): Inspection[] {
  const records: Inspection[] = [];
  for (let month = 5; month <= 10; month++) {
    const count = month === 10 ? 1284 : month === 9 ? 1136 : 1048;
    const days = month === 10 ? 29 : [6, 9].includes(month) ? 30 : 31;
    for (let i = 0; i < count; i++) {
      const day = Math.min(days, Math.floor((i * days) / count) + 1);
      const bucket = (i * 37 + month * 13) % 100;
      const status: InspectionStatus =
        bucket < 3 ? "Failed" : bucket < 7 ? "Needs review" : "Passed";
      const progress = (month - 7) * 0.9 + day * 0.12;
      const score =
        status === "Failed"
          ? 58 + (i % 18)
          : status === "Needs review"
            ? 80 + (i % 10)
            : Math.max(
                90,
                Math.min(100, Math.round(89 + progress + ((i * 7) % 6))),
              );
      records.push({
        id: `INS-${String(records.length + 1001).padStart(4, "0")}`,
        name: names[i % names.length],
        category: CATEGORIES[i % 4],
        location: LOCATIONS[i % 3],
        inspector: INSPECTORS[i % INSPECTORS.length],
        date: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        score,
        status,
        notes:
          status === "Failed"
            ? "A deviation was identified during this inspection. Review the measurements and assign a corrective action before the next production run."
            : notes[i % notes.length],
      });
    }
  }
  return records.reverse();
}
export const initialInspections = seedInspections();
const issueNames = [
  "Surface finish outside tolerance",
  "Missing batch traceability label",
  "Calibration certificate expired",
  "Inconsistent seal integrity",
  "Material dimension variance",
  "Safety guard requires replacement",
  "Incomplete process documentation",
  "Packaging alignment deviation",
  "Supplier test report missing",
  "Temperature reading above limit",
  "Assembly torque inconsistency",
  "Storage conditions out of range",
];
const failedInspections = initialInspections.filter(
  (r) => r.status === "Failed",
);
export const initialIssues: Issue[] = Array.from({ length: 24 }, (_, i) => ({
  id: `NCR-${String(241 + i).padStart(4, "0")}`,
  title: issueNames[i % issueNames.length],
  inspection: failedInspections[i].id,
  location: failedInspections[i].location,
  severity: i < 6 ? "Critical" : i < 15 ? "Major" : "Minor",
  owner: INSPECTORS[i % 5],
  due: `2026-${i < 6 ? "10" : "11"}-${String(i < 6 ? 24 + i : 1 + (i % 8)).padStart(2, "0")}`,
  status: i % 3 === 0 ? "In progress" : "Open",
}));
export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);
export const formatDate = (
  date: string,
  options?: Intl.DateTimeFormatOptions,
) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(
    "en-US",
    options ?? { month: "short", day: "numeric", year: "numeric" },
  );
export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
export const avatarColors = ["lilac", "sand", "blue", "rose", "mint"];
export function getStats(records: Inspection[]) {
  const completed = records.filter((r) => r.score !== null);
  const passed = completed.filter((r) => r.status === "Passed").length;
  return {
    count: completed.length,
    passed,
    failed: completed.filter((r) => r.status === "Failed").length,
    review: completed.filter((r) => r.status === "Needs review").length,
    average: completed.length
      ? completed.reduce((sum, r) => sum + r.score!, 0) / completed.length
      : 0,
    passRate: completed.length ? (passed / completed.length) * 100 : 0,
  };
}
export function withinPeriod(date: string, range: string, previous = false) {
  const d = new Date(`${date}T12:00:00Z`);
  if (range === "month")
    return previous ? d.getUTCMonth() === 8 : d.getUTCMonth() === 9;
  const days = range === "week" ? 7 : 90;
  const age = (ANCHOR.getTime() - d.getTime()) / 86400000;
  return previous ? age >= days && age < days * 2 : age >= 0 && age < days;
}
export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
) {
  const escape = (value: string | number | null) => {
    let text = String(value ?? "");
    if (/^[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv =
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
