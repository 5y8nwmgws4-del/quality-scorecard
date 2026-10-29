import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleCheck,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Download,
  Ellipsis,
  FileBarChart2,
  Flag,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Minus,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CategoryChart, OutcomeChart, Sparkline, TrendChart } from "./Charts";
import {
  ANCHOR,
  CATEGORIES,
  INSPECTORS,
  LOCATIONS,
  avatarColors,
  downloadCsv,
  formatDate,
  formatNumber,
  getStats,
  initialInspections,
  initialIssues,
  initials,
  loadLocal,
  saveLocal,
  withinPeriod,
} from "./data";
import type { Inspection, Issue } from "./data";

type Page =
  | "Overview"
  | "Inspections"
  | "Issues"
  | "Corrective actions"
  | "Reports"
  | "Team members"
  | "Settings";
type Modal = "new" | "help" | "workspace" | "invite" | null;
const navigation: { name: Page; icon: LucideIcon }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Inspections", icon: ClipboardCheck },
  { name: "Issues", icon: Flag },
  { name: "Corrective actions", icon: ListChecks },
  { name: "Reports", icon: FileBarChart2 },
];
const readPage = (): Page => {
  const hash = decodeURIComponent(window.location.hash.slice(1));
  return [
    ...navigation.map((n) => n.name),
    "Team members",
    "Settings",
  ].includes(hash)
    ? (hash as Page)
    : "Overview";
};
function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <svg viewBox="0 0 34 34" aria-hidden="true">
          <path
            d="M7 8h13a7 7 0 0 1 7 7v12H14a7 7 0 0 1-7-7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
          />
          <path
            d="m12 17 5 5L29 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        qualis<span className="brand-period">.</span>
      </span>
    </div>
  );
}
function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const index = Math.max(0, INSPECTORS.indexOf(name));
  return (
    <span
      aria-hidden="true"
      className={`avatar ${avatarColors[index % avatarColors.length]} ${small ? "small" : ""}`}
    >
      {initials(name)}
    </span>
  );
}
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Passed" || status === "Resolved"
      ? "success"
      : status === "Failed" || status === "Critical"
        ? "danger"
        : status === "Needs review" ||
            status === "Major" ||
            status === "In progress"
          ? "warning"
          : "neutral";
  return (
    <span className={`status-badge ${cls}`}>
      <i />
      {status}
    </span>
  );
}
function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key === "Tab") {
        const focusable = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
          ) ?? []),
        ];
        const first = focusable[0],
          last = focusable.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", listener);
      previousFocus?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`dialog ${wide ? "wide-dialog" : ""}`}
      >
        <div className="dialog-heading">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Metric({
  title,
  value,
  suffix,
  icon: Icon,
  change,
  note,
  values,
  tone = "green",
  direction = "up",
}: {
  title: string;
  value: string;
  suffix?: string;
  icon: LucideIcon;
  change: string;
  note: string;
  values: number[];
  tone?: string;
  direction?: "up" | "down" | "steady";
}) {
  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={17} strokeWidth={1.7} />
        </span>
      </div>
      <div className="metric-main">
        <div className="metric-value">
          {value}
          <span>{suffix}</span>
        </div>
        {tone === "amber" ? (
          <div
            className="severity-mini"
            aria-label={`${values[0]} critical, ${values[1]} major, ${values[2]} minor issues`}
          >
            {values.map((value, i) => (
              <span
                key={i}
                style={{ height: `${Math.max(4, value * 3)}px` }}
                title={`${value} ${["critical", "major", "minor"][i]} issues`}
              />
            ))}
          </div>
        ) : (
          <Sparkline values={values} />
        )}
      </div>
      <div className="metric-bottom">
        <span
          className={`metric-change ${tone === "amber" ? "amber-change" : ""}`}
        >
          {tone === "amber" ? (
            <TriangleAlert size={11} />
          ) : direction === "steady" ? (
            <Minus size={12} />
          ) : direction === "down" ? (
            <ArrowDownToLine size={12} />
          ) : (
            <ArrowUpRight size={12} />
          )}{" "}
          {change}
        </span>
        <span>{note}</span>
      </div>
    </section>
  );
}
function EmptyState({
  title,
  message,
  onReset,
}: {
  title: string;
  message: string;
  onReset?: () => void;
}) {
  return (
    <div className="empty-state">
      <Search size={27} />
      <h3>{title}</h3>
      <p>{message}</p>
      {onReset && (
        <button className="button secondary small-button" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [mobileNav, setMobileNav] = useState(false);
  const [localInspections, setLocalInspections] = useState<Inspection[]>(() =>
    loadLocal("qualis.inspections.v1", []),
  );
  const [issues, setIssues] = useState<Issue[]>(() =>
    loadLocal("qualis.issues.v1", initialIssues),
  );
  const [range, setRange] = useState("month");
  const [location, setLocation] = useState("All locations");
  const [status, setStatus] = useState("All inspections");
  const [query, setQuery] = useState("");
  const [issueQuery, setIssueQuery] = useState("");
  const [issueFilter, setIssueFilter] = useState("All issues");
  const [tablePage, setTablePage] = useState(1);
  const [sort, setSort] = useState<"date" | "score" | "name">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [notificationRead, setNotificationRead] = useState(false);
  const [toast, setToast] = useState("");
  const [members, setMembers] = useState<
    { name: string; email: string; role: string }[]
  >(() =>
    loadLocal(
      "qualis.members.v1",
      INSPECTORS.map((name, i) => ({
        name,
        email: `${name.toLowerCase().replace(" ", ".")}@acme.example`,
        role: i === 4 ? "Admin" : "Inspector",
      })),
    ),
  );
  const [workspaceName, setWorkspaceName] = useState(() =>
    loadLocal("qualis.workspace.v1", "Acme Industries"),
  );
  const [formError, setFormError] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  function notify(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  useEffect(() => {
    const onHash = () => {
      setPage(readPage());
      setTablePage(1);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!notifications) return;
    const outside = (e: MouseEvent) => {
      if (!notificationRef.current?.contains(e.target as Node))
        setNotifications(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifications(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [notifications]);
  useEffect(() => {
    setTablePage(1);
  }, [query, status, range, location, sort, sortAsc]);
  useEffect(() => {
    document.title = `Qualis — ${page === "Overview" ? "Quality overview" : page}`;
  }, [page]);
  function navigate(next: Page) {
    setPage(next);
    window.location.hash = next;
    setMobileNav(false);
    setTablePage(1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const inspections = useMemo(() => {
    const ids = new Set(localInspections.map((r) => r.id));
    return [
      ...localInspections,
      ...initialInspections.filter((r) => !ids.has(r.id)),
    ];
  }, [localInspections]);
  const records = useMemo(
    () =>
      inspections.filter(
        (r) =>
          withinPeriod(r.date, range) &&
          (location === "All locations" || r.location === location),
      ),
    [inspections, range, location],
  );
  const previous = useMemo(
    () =>
      inspections.filter(
        (r) =>
          withinPeriod(r.date, range, true) &&
          (location === "All locations" || r.location === location),
      ),
    [inspections, range, location],
  );
  const stats = getStats(records),
    oldStats = getStats(previous);
  const sparkStats = useMemo(() => {
    const dates = [...new Set(records.map((r) => r.date))].sort().slice(-10);
    return dates.map((date) =>
      getStats(records.filter((r) => r.date === date)),
    );
  }, [records]);
  const deltaDirection = (delta: number): "up" | "down" | "steady" =>
    Math.abs(delta) < 0.05 ? "steady" : delta > 0 ? "up" : "down";
  const openIssues = issues.filter(
    (i) =>
      i.status !== "Resolved" &&
      (location === "All locations" || i.location === location),
  );
  const criticalIssues = openIssues.filter((i) => i.severity === "Critical");
  const rows = useMemo(
    () =>
      records
        .filter(
          (r) =>
            (status === "All inspections" || r.status === status) &&
            `${r.id} ${r.name} ${r.inspector} ${r.location}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => {
          const result =
            sort === "score"
              ? (a.score ?? -1) - (b.score ?? -1)
              : sort === "name"
                ? a.name.localeCompare(b.name)
                : a.date.localeCompare(b.date) ||
                  a.id.localeCompare(b.id, undefined, { numeric: true });
          return sortAsc ? result : -result;
        }),
    [records, status, query, sort, sortAsc],
  );
  const pageSize = page === "Overview" ? 5 : 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const shownPage = Math.min(tablePage, pageCount);
  const visibleRows = rows.slice(
    (shownPage - 1) * pageSize,
    shownPage * pageSize,
  );
  const rangeLabel =
    range === "month"
      ? "Oct 1 – Oct 29, 2026"
      : range === "week"
        ? "Oct 23 – Oct 29, 2026"
        : "Aug 1 – Oct 29, 2026";
  function filterTo(next: string) {
    setStatus(next);
    setQuery("");
    navigate("Inspections");
  }
  function storeInspection(record: Inspection) {
    const next = [
      record,
      ...localInspections.filter((i) => i.id !== record.id),
    ];
    setLocalInspections(next);
    return saveLocal("qualis.inspections.v1", next);
  }
  function updateIssue(issue: Issue, nextStatus: Issue["status"]) {
    const updated = { ...issue, status: nextStatus };
    const next = issues.map((i) => (i.id === issue.id ? updated : i));
    setIssues(next);
    setSelectedIssue(updated);
    notify(
      saveLocal("qualis.issues.v1", next)
        ? `Issue ${issue.id} ${nextStatus === "Resolved" ? "resolved" : "updated"}.`
        : "Updated for this session. Browser storage is unavailable.",
    );
  }
  function exportReport() {
    if (page === "Issues" || page === "Corrective actions") {
      downloadCsv(
        "qualis-issues.csv",
        ["ID", "Issue", "Severity", "Location", "Owner", "Due date", "Status"],
        filteredIssues.map((i) => [
          i.id,
          i.title,
          i.severity,
          i.location,
          i.owner,
          i.due,
          i.status,
        ]),
      );
    } else {
      downloadCsv(
        "qualis-quality-report.csv",
        [
          "ID",
          "Inspection",
          "Category",
          "Location",
          "Inspector",
          "Date",
          "Score",
          "Status",
        ],
        (page === "Reports" ? records : rows).map((r) => [
          r.id,
          r.name,
          r.category,
          r.location,
          r.inspector,
          r.date,
          r.score,
          r.status,
        ]),
      );
    }
    notify("Your report has been exported.");
  }
  function createInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    if (!name) {
      setFormError("Enter an inspection name.");
      return;
    }
    const nextId =
      Math.max(...inspections.map((r) => Number(r.id.replace("INS-", "")))) + 1;
    const inspection: Inspection = {
      id: `INS-${nextId}`,
      name,
      category: String(form.get("category")),
      location: String(form.get("location")),
      inspector: String(form.get("inspector")),
      date: String(form.get("date")),
      score: null,
      status: "Scheduled",
      notes: String(form.get("notes")).trim(),
    };
    const persisted = storeInspection(inspection);
    setModal(null);
    setFormError("");
    setRange("quarter");
    setLocation("All locations");
    setStatus("All inspections");
    setQuery("");
    setSort("date");
    setSortAsc(false);
    navigate("Inspections");
    setSelectedInspection(inspection);
    notify(
      persisted
        ? `Inspection ${inspection.id} created.`
        : "Created for this session. Browser storage is unavailable.",
    );
  }
  const filteredIssues = openOrResolvedIssues();
  function openOrResolvedIssues() {
    return issues.filter(
      (i) =>
        (location === "All locations" || i.location === location) &&
        (issueFilter === "All issues" ||
          i.severity === issueFilter ||
          i.status === issueFilter) &&
        `${i.id} ${i.title} ${i.owner}`
          .toLowerCase()
          .includes(issueQuery.toLowerCase()),
    );
  }
  function sortTable(next: "date" | "score" | "name") {
    if (sort === next) setSortAsc(!sortAsc);
    else {
      setSort(next);
      setSortAsc(next === "name");
    }
  }
  const pageDescriptions: Record<Page, { title: string; subtitle: string }> = {
    Overview: {
      title: "Quality overview",
      subtitle: "The big picture. The small details. All in one place.",
    },
    Inspections: {
      title: "Inspections",
      subtitle: "Build confidence in every product, process, and checkpoint.",
    },
    Issues: {
      title: "Issues",
      subtitle: "Spot the gaps. Take action. Keep getting better.",
    },
    "Corrective actions": {
      title: "Corrective actions",
      subtitle:
        "Turn findings into progress with clear ownership and next steps.",
    },
    Reports: {
      title: "Quality reports",
      subtitle: "The insights behind your next improvement.",
    },
    "Team members": {
      title: "Your quality team",
      subtitle: "Better quality starts with people who care.",
    },
    Settings: {
      title: "Workspace settings",
      subtitle: "A workspace that works the way you do.",
    },
  };
  function renderInspectionTable() {
    return (
      <section className="panel inspections-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {page === "Overview" ? "Recent inspections" : "All inspections"}
              <span className="count-badge">
                {formatNumber(records.length)}
              </span>
            </h2>
            <p>A closer look at your latest quality checks.</p>
          </div>
          {page === "Overview" && (
            <button
              className="text-button"
              onClick={() => {
                setStatus("All inspections");
                setQuery("");
                navigate("Inspections");
              }}
            >
              View all <ArrowUpRight size={14} />
            </button>
          )}
        </div>
        <div className="table-toolbar">
          <div
            className="table-tabs"
            role="group"
            aria-label="Filter inspections"
          >
            {[
              "All inspections",
              "Passed",
              "Needs review",
              "Failed",
              ...(page !== "Overview" ? ["Scheduled"] : []),
            ].map((s) => (
              <button
                key={s}
                className={status === s ? "active" : ""}
                onClick={() => setStatus(s)}
              >
                {s === "All inspections" ? "All" : s}
              </button>
            ))}
          </div>
          <label className="table-search">
            <Search size={15} />
            <input
              aria-label="Search inspections"
              placeholder="Search inspections..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={13} />
              </button>
            )}
          </label>
        </div>
        <div className="table-scroll">
          <table className="inspection-table">
            <thead>
              <tr>
                <th>
                  <button onClick={() => sortTable("name")}>
                    Inspection <ChevronsUpDown size={12} />
                  </button>
                </th>
                <th className="inspector-col">Inspector</th>
                {page !== "Overview" && (
                  <th>
                    <button onClick={() => sortTable("date")}>
                      Date <ChevronsUpDown size={12} />
                    </button>
                  </th>
                )}
                <th>
                  <button onClick={() => sortTable("score")}>
                    Score <ChevronsUpDown size={12} />
                  </button>
                </th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="inspection-name"
                      onClick={() => setSelectedInspection(r)}
                    >
                      <span
                        className={`inspection-row-icon ${r.status === "Failed" ? "failed-icon" : ""}`}
                      >
                        <ClipboardCheck size={16} />
                      </span>
                      <span>
                        <strong>{r.name}</strong>
                        <small>
                          {r.id}
                          <i />
                          {r.location}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td className="inspector-col">
                    <span className="person">
                      <Avatar name={r.inspector} small />
                      <span>{r.inspector}</span>
                    </span>
                  </td>
                  {page !== "Overview" && (
                    <td className="date-cell">
                      {formatDate(r.date, { month: "short", day: "numeric" })}
                    </td>
                  )}
                  <td>
                    <span
                      className={`score ${r.score === null ? "" : r.score < 80 ? "low" : r.score < 90 ? "medium" : ""}`}
                    >
                      {r.score === null ? "—" : `${r.score}%`}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <button
                      className="row-more icon-button"
                      aria-label={`View ${r.id}`}
                      onClick={() => setSelectedInspection(r)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <EmptyState
            title="No inspections found"
            message="Try a different search, location, or status."
            onReset={() => {
              setQuery("");
              setStatus("All inspections");
              setLocation("All locations");
            }}
          />
        )}
        <div className="table-pagination">
          <span>
            Showing{" "}
            <strong>
              {rows.length ? (shownPage - 1) * pageSize + 1 : 0}–
              {Math.min(shownPage * pageSize, rows.length)}
            </strong>{" "}
            of <strong>{formatNumber(rows.length)}</strong>
          </span>
          <div>
            <button
              className="pagination-arrow"
              aria-label="Previous page"
              disabled={shownPage === 1}
              onClick={() => setTablePage((p) => p - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {shownPage} of {pageCount}
            </span>
            <button
              className="pagination-arrow"
              aria-label="Next page"
              disabled={shownPage === pageCount}
              onClick={() => setTablePage((p) => p + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobileNav && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button
            className="workspace-picker"
            onClick={() => setModal("workspace")}
          >
            <span className="workspace-avatar">
              {workspaceName[0]?.toUpperCase()}
            </span>
            <span>
              <strong>{workspaceName}</strong>
              <small>Quality workspace</small>
            </span>
            <ChevronsUpDown size={14} />
          </button>
        </div>
        <nav aria-label="Main navigation">
          <div className="nav-label">WORKSPACE</div>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              className={`nav-item ${page === name ? "active" : ""}`}
              key={name}
              onClick={() => navigate(name)}
              aria-current={page === name ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{name}</span>
              {name === "Issues" && (
                <span className="nav-count">
                  {issues.filter((i) => i.status !== "Resolved").length}
                </span>
              )}
              {name === "Overview" && page === name && (
                <span className="active-nav-dot" />
              )}
            </button>
          ))}
          <div className="nav-label management-label">MANAGEMENT</div>
          <button
            className={`nav-item ${page === "Team members" ? "active" : ""}`}
            onClick={() => navigate("Team members")}
          >
            <Users size={18} strokeWidth={1.7} />
            <span>Team members</span>
          </button>
          <button
            className={`nav-item ${page === "Settings" ? "active" : ""}`}
            onClick={() => navigate("Settings")}
          >
            <Settings2 size={18} strokeWidth={1.7} />
            <span>Settings</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-spark">
              <Sparkles size={20} strokeWidth={1.5} />
            </span>
            <h3>A little help goes a long way.</h3>
            <p>
              Get more out of your
              <br />
              quality workspace.
            </p>
            <button onClick={() => setModal("help")}>
              Explore the help center <ArrowUpRight size={14} />
            </button>
            <svg
              className="help-decoration"
              viewBox="0 0 80 90"
              aria-hidden="true"
            >
              <circle cx="65" cy="75" r="40" />
              <circle cx="65" cy="75" r="29" />
              <circle cx="65" cy="75" r="18" />
            </svg>
          </div>
          <div className="demo-workspace">
            <span className="tiny-dot" />
            Demo workspace<span>v1.0</span>
          </div>
          <button className="profile" onClick={() => navigate("Settings")}>
            <Avatar name="Alex Morgan" />
            <span>
              <strong>Alex Morgan</strong>
              <small>Workspace admin</small>
            </span>
            <Ellipsis size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="workspace-status">
              <i />
              Workspace up to date
            </span>
            <div className="topbar-divider" />
            <button
              className="icon-button help-top"
              aria-label="Help center"
              onClick={() => setModal("help")}
            >
              <CircleHelp size={19} />
            </button>
            <div className="notification-container" ref={notificationRef}>
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {!notificationRead && <i />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <div>
                    <h3>Notifications</h3>
                    <button
                      className="text-button"
                      onClick={() => setNotificationRead(true)}
                    >
                      <CheckCheck size={14} />
                      Mark read
                    </button>
                  </div>
                  <button
                    className="notification-item"
                    onClick={() => {
                      setNotifications(false);
                      navigate("Issues");
                      setIssueFilter("Critical");
                    }}
                  >
                    <span className="notification-symbol amber">
                      <TriangleAlert size={18} />
                    </span>
                    <span>
                      <strong>
                        {criticalIssues.length} critical issues need a review
                      </strong>
                      <small>See the findings and assign next steps.</small>
                      <time>Today, 9:30 AM</time>
                    </span>
                  </button>
                  <button
                    className="notification-item"
                    onClick={() => {
                      setNotifications(false);
                      navigate("Reports");
                    }}
                  >
                    <span className="notification-symbol green">
                      <FileBarChart2 size={18} />
                    </span>
                    <span>
                      <strong>Your quality report is ready</strong>
                      <small>October performance, all in one place.</small>
                      <time>Today, 8:00 AM</time>
                    </span>
                  </button>
                  {notificationRead && (
                    <p className="all-read">
                      <Check size={13} />
                      You're all caught up.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              className="top-avatar"
              aria-label="Open profile settings"
              onClick={() => navigate("Settings")}
            >
              <Avatar name="Alex Morgan" small />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                <span />
                YOUR QUALITY, CONNECTED
              </div>
              <h1>{pageDescriptions[page].title}</h1>
              <p>{pageDescriptions[page].subtitle}</p>
            </div>
            <div className="page-actions">
              {!["Settings", "Team members"].includes(page) && (
                <button
                  className="button secondary export-button"
                  onClick={exportReport}
                >
                  <ArrowDownToLine size={16} />
                  Export report
                </button>
              )}
              {["Overview", "Inspections"].includes(page) && (
                <button
                  className="button primary"
                  onClick={() => {
                    setFormError("");
                    setModal("new");
                  }}
                >
                  <Plus size={17} />
                  New inspection
                </button>
              )}
              {page === "Team members" && (
                <button
                  className="button primary"
                  onClick={() => {
                    setFormError("");
                    setModal("invite");
                  }}
                >
                  <Plus size={17} />
                  Add member
                </button>
              )}
            </div>
          </div>
          {!["Settings", "Team members"].includes(page) && (
            <div className="global-filterbar">
              <div className="global-filters">
                <label className="select-control location-filter">
                  <MapPin size={15} />
                  <select
                    aria-label="Filter by location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  >
                    <option>All locations</option>
                    {LOCATIONS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </label>
                <label className="select-control date-filter">
                  <CalendarDays size={15} />
                  <select
                    aria-label="Date range"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                  >
                    <option value="month">
                      {range === "month" ? rangeLabel : "This month"}
                    </option>
                    <option value="week">
                      {range === "week" ? rangeLabel : "Last 7 days"}
                    </option>
                    <option value="quarter">
                      {range === "quarter" ? rangeLabel : "Last 90 days"}
                    </option>
                  </select>
                  <ChevronDown size={13} />
                </label>
              </div>
              <span className="updated-label">
                <span className="tiny-dot" />
                Demo data · Oct 29, 2026
              </span>
            </div>
          )}
          {page === "Overview" && (
            <>
              <div className="metrics-grid">
                <Metric
                  title="Overall quality score"
                  value={stats.average.toFixed(1)}
                  suffix="/ 100"
                  icon={ShieldCheck}
                  change={`${Math.abs(stats.average - oldStats.average).toFixed(1)} pts`}
                  note="vs. last period"
                  values={sparkStats.map((s) => s.average)}
                  direction={deltaDirection(stats.average - oldStats.average)}
                />
                <Metric
                  title="Inspections completed"
                  value={formatNumber(stats.count)}
                  icon={ClipboardCheck}
                  change={`${oldStats.count ? Math.abs(((stats.count - oldStats.count) / oldStats.count) * 100).toFixed(1) : "0.0"}%`}
                  note="vs. last period"
                  values={sparkStats.map((s) => s.count)}
                  direction={deltaDirection(stats.count - oldStats.count)}
                />
                <Metric
                  title="Inspection pass rate"
                  value={stats.passRate.toFixed(1)}
                  suffix="%"
                  icon={CircleCheck}
                  change={`${Math.abs(stats.passRate - oldStats.passRate).toFixed(1)} pts`}
                  note="vs. last period"
                  values={sparkStats.map((s) => s.passRate)}
                  direction={deltaDirection(stats.passRate - oldStats.passRate)}
                />
                <Metric
                  title="Open issues"
                  value={String(openIssues.length)}
                  icon={Flag}
                  change={`${criticalIssues.length} critical`}
                  note="need your attention"
                  values={[
                    criticalIssues.length,
                    openIssues.filter((i) => i.severity === "Major").length,
                    openIssues.filter((i) => i.severity === "Minor").length,
                  ]}
                  tone="amber"
                />
              </div>
              <div className="dashboard-charts">
                <TrendChart
                  records={records}
                  previous={previous}
                  range={range}
                />
                <OutcomeChart records={records} onFilter={filterTo} />
              </div>
              <div className="dashboard-bottom">
                {renderInspectionTable()}
                <div className="attention-stack">
                  <section className="panel attention-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          <span className="attention-heading-icon">
                            <Flag size={15} />
                          </span>
                          Needs attention
                          <span className="count-badge amber-badge">
                            {criticalIssues.length}
                          </span>
                        </h2>
                        <p>Small actions. A meaningful difference.</p>
                      </div>
                    </div>
                    <div className="attention-list">
                      {criticalIssues.length ? (
                        criticalIssues.slice(0, 3).map((issue, index) => (
                          <button
                            className="attention-item"
                            key={issue.id}
                            onClick={() => setSelectedIssue(issue)}
                          >
                            <span
                              className={`attention-item-icon ${index === 1 ? "amber" : "rose"}`}
                            >
                              {index === 1 ? (
                                <ClipboardCheck size={17} />
                              ) : (
                                <TriangleAlert size={17} />
                              )}
                            </span>
                            <span>
                              <strong>{issue.title}</strong>
                              <small>
                                {issue.id}
                                <i />
                                {issue.location}
                              </small>
                              <span className="attention-meta">
                                <span className="priority-dot" />
                                Critical
                                <span className="overdue">
                                  {new Date(`${issue.due}T12:00:00Z`) < ANCHOR
                                    ? "Overdue"
                                    : "Due today"}
                                </span>
                              </span>
                            </span>
                            <ChevronRight size={14} />
                          </button>
                        ))
                      ) : (
                        <div className="all-clear">
                          <CircleCheck size={26} />
                          <strong>You're all clear.</strong>
                          <p>No critical issues at this location.</p>
                        </div>
                      )}
                    </div>
                    <button
                      className="attention-footer"
                      onClick={() => {
                        setIssueFilter("All issues");
                        navigate("Issues");
                      }}
                    >
                      View all issues
                      <ArrowRight size={15} />
                    </button>
                  </section>
                  <div className="quality-note">
                    <span>
                      <TrendingUp size={19} />
                    </span>
                    <div>
                      <strong>Progress worth celebrating.</strong>
                      <p>
                        Your quality score is{" "}
                        {Math.abs(stats.average - oldStats.average).toFixed(1)}{" "}
                        points{" "}
                        {stats.average >= oldStats.average ? "up" : "down"} this
                        period.
                        <br />
                        Keep turning insights into improvements.
                      </p>
                    </div>
                    <Sparkles size={18} />
                  </div>
                </div>
              </div>
            </>
          )}
          {page === "Inspections" && (
            <>
              <div className="compact-summary">
                <span>
                  <ClipboardCheck size={17} />
                  <strong>{formatNumber(records.length)}</strong> inspections
                </span>
                <span>
                  <CircleCheck size={17} />
                  <strong>{formatNumber(stats.passed)}</strong> passed
                </span>
                <span>
                  <Clock3 size={17} />
                  <strong>
                    {records.filter((r) => r.status === "Scheduled").length}
                  </strong>{" "}
                  scheduled
                </span>
                <span>
                  <ShieldCheck size={17} />
                  <strong>{stats.average.toFixed(1)}%</strong> average score
                </span>
              </div>
              {renderInspectionTable()}
            </>
          )}
          {(page === "Issues" || page === "Corrective actions") && (
            <>
              <div className="issue-summary">
                <div>
                  <span className="summary-icon rose">
                    <Flag size={22} />
                  </span>
                  <div>
                    <strong>{openIssues.length}</strong>
                    <span>Open issues</span>
                  </div>
                </div>
                <div>
                  <span className="summary-icon amber">
                    <TriangleAlert size={22} />
                  </span>
                  <div>
                    <strong>{criticalIssues.length}</strong>
                    <span>Critical priority</span>
                  </div>
                </div>
                <div>
                  <span className="summary-icon blue">
                    <Activity size={22} />
                  </span>
                  <div>
                    <strong>
                      {
                        openIssues.filter((i) => i.status === "In progress")
                          .length
                      }
                    </strong>
                    <span>In progress</span>
                  </div>
                </div>
                <div>
                  <span className="summary-icon green">
                    <CircleCheck size={22} />
                  </span>
                  <div>
                    <strong>
                      {
                        issues.filter(
                          (i) =>
                            i.status === "Resolved" &&
                            (location === "All locations" ||
                              i.location === location),
                        ).length
                      }
                    </strong>
                    <span>Resolved</span>
                  </div>
                </div>
              </div>
              <div className="issue-view-toolbar">
                <div className="table-tabs">
                  {["All issues", "Critical", "In progress", "Resolved"].map(
                    (f) => (
                      <button
                        key={f}
                        className={issueFilter === f ? "active" : ""}
                        onClick={() => setIssueFilter(f)}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
                <label className="table-search">
                  <Search size={15} />
                  <input
                    aria-label="Search issues"
                    value={issueQuery}
                    onChange={(e) => setIssueQuery(e.target.value)}
                    placeholder="Search issues..."
                  />
                </label>
              </div>
              <div className="issue-grid">
                {filteredIssues.map((issue) => (
                  <button
                    className="panel issue-card"
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="issue-card-top">
                      <span>{issue.id}</span>
                      <StatusBadge status={issue.severity} />
                    </div>
                    <h2>{issue.title}</h2>
                    <p>
                      <MapPin size={13} />
                      {issue.location}
                    </p>
                    {page === "Corrective actions" && (
                      <div className="action-next-step">
                        <ListChecks size={16} />
                        {issue.status === "Resolved"
                          ? "Corrective action verified and closed"
                          : issue.status === "In progress"
                            ? "Review root cause and verify corrective action"
                            : "Investigate finding and document root cause"}
                      </div>
                    )}
                    <div className="issue-card-bottom">
                      <span className="person">
                        <Avatar name={issue.owner} small />
                        {issue.owner}
                      </span>
                      <StatusBadge status={issue.status} />
                    </div>
                    <div className="issue-due">
                      <CalendarDays size={13} />
                      Due {formatDate(issue.due)}
                      {new Date(`${issue.due}T12:00:00Z`) < ANCHOR &&
                        issue.status !== "Resolved" && <span>Overdue</span>}
                    </div>
                  </button>
                ))}
              </div>
              {!filteredIssues.length && (
                <section className="panel">
                  <EmptyState
                    title="No issues to show"
                    message="Try another filter, or enjoy a clear list."
                    onReset={() => {
                      setIssueQuery("");
                      setIssueFilter("All issues");
                    }}
                  />
                </section>
              )}
              <p className="data-scope-note">
                Issue records are filtered by location. Date range applies to
                inspection reports.
              </p>
            </>
          )}
          {page === "Reports" && (
            <>
              <div className="report-banner">
                <span className="report-banner-icon">
                  <FileBarChart2 size={27} />
                </span>
                <div>
                  <span className="eyebrow">YOUR PERIOD IN PERSPECTIVE</span>
                  <h2>Better decisions start with a clearer picture.</h2>
                  <p>
                    {formatNumber(stats.count)} completed inspections across{" "}
                    {location === "All locations"
                      ? "3 locations"
                      : location.toLowerCase()}
                    , {rangeLabel}.
                  </p>
                </div>
                <button className="button primary" onClick={exportReport}>
                  <Download size={16} />
                  Download CSV
                </button>
              </div>
              <div className="dashboard-charts">
                <TrendChart
                  records={records}
                  previous={previous}
                  range={range}
                />
                <CategoryChart records={records} />
              </div>
              <section className="panel location-report">
                <div className="panel-heading">
                  <div>
                    <h2>Location scorecard</h2>
                    <p>One standard. Every location.</p>
                  </div>
                  <SlidersHorizontal size={18} />
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>Completed</th>
                        <th>Quality score</th>
                        <th>Pass rate</th>
                        <th>Open issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LOCATIONS.filter(
                        (l) => location === "All locations" || l === location,
                      ).map((l) => {
                        const s = getStats(
                          records.filter((r) => r.location === l),
                        );
                        return (
                          <tr key={l}>
                            <td>
                              <span className="person">
                                <MapPin size={15} />
                                <strong>{l}</strong>
                              </span>
                            </td>
                            <td>{formatNumber(s.count)}</td>
                            <td>
                              <span className="score">
                                {s.average.toFixed(1)}%
                              </span>
                            </td>
                            <td>{s.passRate.toFixed(1)}%</td>
                            <td>
                              {
                                issues.filter(
                                  (i) =>
                                    i.location === l && i.status !== "Resolved",
                                ).length
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "Team members" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    People who make quality happen
                    <span className="count-badge">{members.length}</span>
                  </h2>
                  <p>Everyone has a part to play.</p>
                </div>
                <Users size={19} />
              </div>
              <div className="table-scroll">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Team member</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.email}>
                        <td>
                          <span className="person">
                            <Avatar name={member.name} />
                            <strong>{member.name}</strong>
                          </span>
                        </td>
                        <td>{member.email}</td>
                        <td>{member.role}</td>
                        <td>
                          <StatusBadge status="Active" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="local-data-notice">
                <CircleHelp size={15} />
                Demo team members are stored in this browser. Adding a member
                does not send an invitation.
              </div>
            </section>
          )}
          {page === "Settings" && (
            <div className="settings-layout">
              <section className="panel settings-panel">
                <div className="panel-heading">
                  <div>
                    <h2>General settings</h2>
                    <p>The little details that make this workspace yours.</p>
                  </div>
                  <Settings2 size={18} />
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = String(
                      new FormData(event.currentTarget).get("workspace"),
                    ).trim();
                    if (!name) return;
                    setWorkspaceName(name);
                    notify(
                      saveLocal("qualis.workspace.v1", name)
                        ? "Workspace settings saved."
                        : "Saved for this session. Browser storage is unavailable.",
                    );
                  }}
                >
                  <label className="form-field">
                    Workspace name
                    <input
                      name="workspace"
                      defaultValue={workspaceName}
                      required
                      maxLength={45}
                    />
                  </label>
                  <label className="form-field">
                    Industry
                    <input value="Manufacturing" readOnly />
                  </label>
                  <div className="settings-divider" />
                  <h3>Your profile</h3>
                  <div className="profile-settings">
                    <Avatar name="Alex Morgan" />
                    <div>
                      <strong>Alex Morgan</strong>
                      <p>Workspace admin</p>
                    </div>
                    <span className="status-badge success">Demo profile</span>
                  </div>
                  <button type="submit" className="button primary">
                    <Check size={16} />
                    Save changes
                  </button>
                </form>
              </section>
              <section className="panel data-info">
                <span className="summary-icon green">
                  <ShieldCheck size={23} />
                </span>
                <h2>Your demo workspace</h2>
                <p>
                  Explore Qualis with realistic sample inspections and issues.
                  New inspections, team members, and issue updates are saved in
                  this browser.
                </p>
                <p>
                  No live systems are connected, and no data is sent to a
                  server.
                </p>
                <span className="demo-info-label">
                  <span className="tiny-dot" />
                  LOCAL DEMO DATA
                </span>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={13} />
              Built for better quality.
            </span>
            <span>
              Qualis<span className="footer-dot">·</span>A little better, every
              day.
            </span>
          </footer>
        </main>
      </div>

      {modal === "new" && (
        <Dialog
          title="A new checkpoint for better quality."
          subtitle="Create an inspection and give every detail a closer look."
          onClose={() => setModal(null)}
        >
          <form className="inspection-form" onSubmit={createInspection}>
            <label className="form-field">
              Inspection name
              <input
                name="name"
                placeholder="e.g. Final product inspection"
                required
                maxLength={100}
              />
            </label>
            <div className="form-grid">
              <label className="form-field">
                Category
                <select aria-label="Category" name="category">
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Location
                <select
                  aria-label="Location"
                  name="location"
                  defaultValue={
                    location === "All locations" ? LOCATIONS[0] : location
                  }
                >
                  {LOCATIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Inspector
                <select aria-label="Inspector" name="inspector">
                  {INSPECTORS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Inspection date
                <input
                  name="date"
                  type="date"
                  required
                  min="2026-08-01"
                  max="2026-10-29"
                  defaultValue="2026-10-29"
                />
              </label>
            </div>
            <label className="form-field">
              Notes <span>(optional)</span>
              <textarea
                name="notes"
                rows={3}
                maxLength={1000}
                placeholder="Anything the inspector should know?"
              />
            </label>
            <div className="form-hint">
              <CircleHelp size={15} />
              The inspection starts as Scheduled. Add a score when it's
              complete.
            </div>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                <Plus size={16} />
                Create inspection
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {selectedInspection && (
        <Dialog
          title={selectedInspection.name}
          subtitle={`${selectedInspection.id} · ${selectedInspection.category}`}
          onClose={() => setSelectedInspection(null)}
        >
          <div className="inspection-detail">
            <div className="detail-summary">
              <div>
                <span>Inspection result</span>
                <StatusBadge status={selectedInspection.status} />
              </div>
              <div className="detail-score">
                {selectedInspection.score ?? "—"}
                <span>
                  {selectedInspection.score !== null ? "/ 100" : "Not scored"}
                </span>
              </div>
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Location</dt>
                <dd>
                  <MapPin size={14} />
                  {selectedInspection.location}
                </dd>
              </div>
              <div>
                <dt>Inspector</dt>
                <dd>
                  <Avatar name={selectedInspection.inspector} small />
                  {selectedInspection.inspector}
                </dd>
              </div>
              <div>
                <dt>Inspection date</dt>
                <dd>
                  <CalendarDays size={14} />
                  {formatDate(selectedInspection.date)}
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{selectedInspection.category}</dd>
              </div>
            </dl>
            <div className="detail-notes">
              <h3>Inspection notes</h3>
              <p>
                {selectedInspection.notes ||
                  "No notes have been added to this inspection."}
              </p>
            </div>
            {selectedInspection.status === "Scheduled" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const score = Number(
                    new FormData(event.currentTarget).get("score"),
                  );
                  const updated: Inspection = {
                    ...selectedInspection,
                    score,
                    status:
                      score >= 90
                        ? "Passed"
                        : score >= 80
                          ? "Needs review"
                          : "Failed",
                  };
                  const persisted = storeInspection(updated);
                  setSelectedInspection(updated);
                  notify(
                    persisted
                      ? "Inspection completed and score saved."
                      : "Completed for this session. Browser storage is unavailable.",
                  );
                }}
              >
                <label className="form-field">
                  Quality score (0–100)
                  <input
                    name="score"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    placeholder="Enter the completed inspection score"
                  />
                </label>
                <p className="form-hint">
                  90+ passes · 80–89 needs review · Below 80 fails
                </p>
                <div className="dialog-actions">
                  <button className="button primary" type="submit">
                    <Check size={16} />
                    Complete inspection
                  </button>
                </div>
              </form>
            ) : (
              <div className="detail-completed">
                <CircleCheck size={17} />
                This inspection is complete.
                <button
                  className="text-button"
                  onClick={() => {
                    downloadCsv(
                      `${selectedInspection.id}.csv`,
                      [
                        "ID",
                        "Inspection",
                        "Score",
                        "Status",
                        "Date",
                        "Inspector",
                      ],
                      [
                        [
                          selectedInspection.id,
                          selectedInspection.name,
                          selectedInspection.score,
                          selectedInspection.status,
                          selectedInspection.date,
                          selectedInspection.inspector,
                        ],
                      ],
                    );
                    notify("Inspection exported.");
                  }}
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            )}
          </div>
        </Dialog>
      )}
      {selectedIssue && (
        <Dialog
          title={selectedIssue.title}
          subtitle={`${selectedIssue.id} · Linked inspection ${selectedIssue.inspection}`}
          onClose={() => setSelectedIssue(null)}
        >
          <div className="issue-detail">
            <div className="detail-badges">
              <StatusBadge status={selectedIssue.severity} />
              <StatusBadge status={selectedIssue.status} />
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Location</dt>
                <dd>
                  <MapPin size={14} />
                  {selectedIssue.location}
                </dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>
                  <Avatar name={selectedIssue.owner} small />
                  {selectedIssue.owner}
                </dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>
                  <CalendarDays size={14} />
                  {formatDate(selectedIssue.due)}
                </dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>
                  {selectedIssue.severity} ·{" "}
                  {selectedIssue.severity === "Critical"
                    ? "Immediate attention"
                    : "Standard review"}
                </dd>
              </div>
            </dl>
            <div className="action-plan">
              <h3>
                <ListChecks size={17} />
                Corrective action plan
              </h3>
              <p>
                Investigate the finding, identify the root cause, and document
                the corrective action. Verify the result against your quality
                standard before closing.
              </p>
              <ol>
                <li>Review the inspection finding with the assigned owner.</li>
                <li>Apply a correction and check the affected process.</li>
                <li>Verify effectiveness and resolve the issue.</li>
              </ol>
            </div>
            <div className="dialog-actions">
              {selectedIssue.status === "Open" && (
                <button
                  className="button secondary"
                  onClick={() => updateIssue(selectedIssue, "In progress")}
                >
                  <Activity size={15} />
                  Start investigation
                </button>
              )}
              {selectedIssue.status !== "Resolved" ? (
                <button
                  className="button primary"
                  onClick={() => updateIssue(selectedIssue, "Resolved")}
                >
                  <Check size={16} />
                  Mark as resolved
                </button>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => updateIssue(selectedIssue, "Open")}
                >
                  Reopen issue
                </button>
              )}
            </div>
          </div>
        </Dialog>
      )}
      {modal === "workspace" && (
        <Dialog
          title={workspaceName}
          subtitle="One workspace. A shared commitment to quality."
          onClose={() => setModal(null)}
        >
          <div className="workspace-dialog">
            <p>Choose a location to focus your dashboard.</p>
            {["All locations", ...LOCATIONS].map((l) => (
              <button
                className={`workspace-location ${location === l ? "selected" : ""}`}
                key={l}
                onClick={() => {
                  setLocation(l);
                  setModal(null);
                }}
              >
                <span className="summary-icon green">
                  <MapPin size={19} />
                </span>
                <span>
                  <strong>{l}</strong>
                  <small>
                    {l === "All locations"
                      ? "A complete view of your quality performance"
                      : "Inspections, issues, and performance"}
                  </small>
                </span>
                {location === l ? (
                  <Check size={18} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {modal === "invite" && (
        <Dialog
          title="Great quality is a team effort."
          subtitle="Add a member to your local demo workspace."
          onClose={() => setModal(null)}
        >
          <form
            className="inspection-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const member = {
                name: String(form.get("name")).trim(),
                email: String(form.get("email")).trim().toLowerCase(),
                role: String(form.get("role")),
              };
              if (!member.name) {
                setFormError("Enter a member name.");
                return;
              }
              if (members.some((m) => m.email.toLowerCase() === member.email)) {
                setFormError("A member with this email already exists.");
                return;
              }
              const next = [...members, member];
              setMembers(next);
              const persisted = saveLocal("qualis.members.v1", next);
              setModal(null);
              setFormError("");
              notify(
                persisted
                  ? `${member.name} added to the demo team.`
                  : "Added for this session. Browser storage is unavailable.",
              );
            }}
          >
            <label className="form-field">
              Full name
              <input
                name="name"
                required
                maxLength={70}
                placeholder="e.g. Taylor Smith"
              />
            </label>
            <label className="form-field">
              Email address
              <input
                name="email"
                type="email"
                required
                placeholder="taylor@company.com"
              />
            </label>
            <label className="form-field">
              Role
              <select aria-label="Role" name="role">
                <option>Inspector</option>
                <option>Viewer</option>
                <option>Admin</option>
              </select>
            </label>
            <div className="form-hint">
              <CircleHelp size={15} />
              This adds a local demo member. No email invitation is sent.
            </div>
            {formError && (
              <p role="alert" className="form-error">
                {formError}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setModal(null);
                  setFormError("");
                }}
              >
                Cancel
              </button>
              <button className="button primary" type="submit">
                <Plus size={16} />
                Add member
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog
          title="A little guidance. A lot of possibility."
          subtitle="Your quick guide to a healthier quality process."
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            {[
              {
                icon: LayoutDashboard,
                title: "See the bigger picture",
                text: "Use the location and date filters to explore your quality score, pass rate, and inspection trends. The dashed line shows the previous period.",
              },
              {
                icon: ClipboardCheck,
                title: "Make every inspection count",
                text: "Create an inspection, assign an inspector, then open it to add a score. Scores of 90 or above pass; 80–89 need review; below 80 fail.",
              },
              {
                icon: ListChecks,
                title: "Turn issues into improvements",
                text: "Open any issue to see the owner, due date, and corrective action plan. Start an investigation or resolve the issue when the correction is verified.",
              },
              {
                icon: Download,
                title: "Take your insights with you",
                text: "Export report downloads a CSV of the currently filtered inspections or issues. Your additions and changes stay in this browser.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div className="help-topic" key={title}>
                <span className="summary-icon green">
                  <Icon size={21} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
            <button className="button primary" onClick={() => setModal(null)}>
              Got it, let's get better <ArrowRight size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
