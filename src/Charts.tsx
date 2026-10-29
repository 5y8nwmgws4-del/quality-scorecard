import { useMemo, useState } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { CATEGORY_COLORS, CATEGORIES, formatNumber, getStats } from "./data";
import type { Inspection } from "./data";

export function Sparkline({
  values,
  color = "#16866e",
}: {
  values: number[];
  color?: string;
}) {
  if (!values.length) return null;
  const min = Math.min(...values) - 2,
    max = Math.max(...values) + 2;
  const points = values
    .map((v, i) => `${i * 7},${35 - ((v - min) / (max - min)) * 30}`)
    .join(" ");
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${(values.length - 1) * 7} 42`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function smoothPath(points: [number, number][]) {
  if (!points.length) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1],
      curr = points[i],
      mx = (prev[0] + curr[0]) / 2;
    d += ` C ${mx} ${prev[1]}, ${mx} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }
  return d;
}
export function TrendChart({
  records,
  previous,
  range,
}: {
  records: Inspection[];
  previous: Inspection[];
  range: string;
}) {
  const [mode, setMode] = useState("Score");
  const [active, setActive] = useState<number | null>(null);
  const { values, oldValues, dates } = useMemo(() => {
    const groups = [
      ...new Set(records.filter((r) => r.score !== null).map((r) => r.date)),
    ].sort();
    const oldGroups = [
      ...new Set(previous.filter((r) => r.score !== null).map((r) => r.date)),
    ].sort();
    const bucketCount = range === "week" ? 7 : range === "quarter" ? 12 : 10;
    const series = (rows: Inspection[], allDates: string[]) =>
      Array.from({ length: Math.min(bucketCount, allDates.length) }, (_, i) => {
        const from = Math.floor(
          (i * allDates.length) / Math.min(bucketCount, allDates.length),
        );
        const to = Math.floor(
          ((i + 1) * allDates.length) / Math.min(bucketCount, allDates.length),
        );
        const subset = rows.filter((r) =>
          allDates.slice(from, to).includes(r.date),
        );
        const stats = getStats(subset);
        return {
          value: mode === "Score" ? stats.average : stats.passRate,
          date: allDates[Math.max(from, to - 1)],
        };
      });
    const now = series(records, groups),
      old = series(previous, oldGroups);
    return {
      values: now.map((p) => p.value),
      oldValues: now.map(
        (_, i) => old[Math.min(i, old.length - 1)]?.value ?? 0,
      ),
      dates: now.map((p) => p.date),
    };
  }, [records, previous, range, mode]);
  const y = (v: number) => 170 - ((v - 75) / 25) * 145;
  const points: [number, number][] = values.map((v, i) => [
    48 + (i / Math.max(values.length - 1, 1)) * 612,
    y(v),
  ]);
  const older: [number, number][] = oldValues.map((v, i) => [
    48 + (i / Math.max(values.length - 1, 1)) * 612,
    y(Math.max(75, v)),
  ]);
  const current = getStats(records),
    old = getStats(previous);
  const delta =
    mode === "Score"
      ? current.average - old.average
      : current.passRate - old.passRate;
  const idx = active ?? Math.max(0, points.length - 1);
  return (
    <section className="panel trend-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Quality performance{" "}
            <span
              className="info-dot"
              title="Average inspection score over the selected period"
            >
              i
            </span>
          </h2>
          <p>A little better, every day.</p>
        </div>
        <div className="segmented" aria-label="Chart metric">
          {["Score", "Pass rate"].map((item) => (
            <button
              key={item}
              className={mode === item ? "selected" : ""}
              onClick={() => {
                setMode(item);
                setActive(null);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-line green" />
          Current period
        </span>
        <span>
          <i className="legend-line gray" />
          Previous period
        </span>
        <span className="target-legend">
          <i />
          Target: 95%
        </span>
      </div>
      {points.length ? (
        <div className="trend-chart">
          <svg
            viewBox="0 0 690 208"
            role="img"
            aria-label={`${mode} trend, ${values[0]?.toFixed(1)} to ${values.at(-1)?.toFixed(1)} percent`}
          >
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16866e" stopOpacity=".13" />
                <stop offset="100%" stopColor="#16866e" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[75, 80, 85, 90, 95, 100].map((tick) => (
              <g key={tick}>
                <line
                  x1="48"
                  x2="660"
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 95 ? "#b7cec5" : "#eff1f3"}
                  strokeDasharray={tick === 95 ? "5 5" : "0"}
                />
                <text
                  x="31"
                  y={y(tick) + 4}
                  textAnchor="end"
                  className="chart-text"
                >
                  {tick}%
                </text>
              </g>
            ))}
            <path
              d={`${smoothPath(points)} L ${points.at(-1)![0]} 170 L 48 170 Z`}
              fill="url(#trend-fill)"
            />
            <path
              d={smoothPath(older)}
              fill="none"
              stroke="#c7cdd0"
              strokeWidth="2"
              strokeDasharray="5 6"
              strokeLinecap="round"
            />
            <path
              d={smoothPath(points)}
              fill="none"
              stroke="#16866e"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                {i % (points.length > 8 ? 2 : 1) === 0 ||
                i === points.length - 1 ? (
                  <text
                    x={p[0]}
                    y="200"
                    textAnchor="middle"
                    className="chart-text"
                  >
                    {new Date(`${dates[i]}T12:00:00Z`).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </text>
                ) : null}
                <rect
                  x={p[0] - 20}
                  y="10"
                  width="40"
                  height="165"
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${dates[i]}: ${values[i].toFixed(1)} percent`}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                />
              </g>
            ))}
            {points[idx] && (
              <g pointerEvents="none">
                <circle
                  cx={points[idx][0]}
                  cy={points[idx][1]}
                  r="5"
                  fill="#16866e"
                  stroke="white"
                  strokeWidth="3"
                />
                {active !== null && (
                  <>
                    <rect
                      x={Math.min(590, Math.max(48, points[idx][0] - 34))}
                      y={points[idx][1] - 35}
                      width="65"
                      height="26"
                      rx="5"
                      fill="#233c34"
                    />
                    <text
                      x={
                        Math.min(590, Math.max(48, points[idx][0] - 34)) + 32.5
                      }
                      y={points[idx][1] - 18}
                      textAnchor="middle"
                      fill="white"
                      fontSize="11"
                    >
                      {values[idx].toFixed(1)}%
                    </text>
                  </>
                )}
              </g>
            )}
          </svg>
        </div>
      ) : (
        <div className="empty-chart">
          No completed inspections in this period.
        </div>
      )}
      <div className="chart-footnote">
        <span className="trend-label">
          <TrendingUp size={15} />
          <strong>
            {Math.abs(delta).toFixed(1)} points{" "}
            {delta >= 0 ? "higher" : "lower"}
          </strong>
        </span>
        <span>than the previous period</span>
        <span className="chart-footnote-end">
          Keep the momentum going <ArrowUpRight size={14} />
        </span>
      </div>
    </section>
  );
}
export function OutcomeChart({
  records,
  onFilter,
}: {
  records: Inspection[];
  onFilter: (status: string) => void;
}) {
  const stats = getStats(records);
  const segments = [
    { label: "Passed", count: stats.passed, color: "#16866e" },
    { label: "Needs review", count: stats.review, color: "#e9ae58" },
    { label: "Failed", count: stats.failed, color: "#e77d77" },
  ];
  let offset = 0;
  const circumference = 2 * Math.PI * 62;
  const paths = segments.map((s) => {
    const length = stats.count ? (s.count / stats.count) * circumference : 0;
    const circle = (
      <circle
        key={s.label}
        cx="84"
        cy="84"
        r="62"
        fill="none"
        stroke={s.color}
        strokeWidth="15"
        strokeDasharray={`${Math.max(0, length - 3)} ${circumference - Math.max(0, length - 3)}`}
        strokeDashoffset={-offset}
        transform="rotate(-90 84 84)"
      />
    );
    offset += length;
    return circle;
  });
  return (
    <section className="panel outcome-panel">
      <div className="panel-heading">
        <div>
          <h2>Inspection outcomes</h2>
          <p>Good quality. Measurable results.</p>
        </div>
        <button
          className="icon-button subtle-icon"
          aria-label="View all inspection outcomes"
          onClick={() => onFilter("All inspections")}
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
      <div className="outcome-body">
        <div className="donut">
          <svg
            viewBox="0 0 168 168"
            role="img"
            aria-label={`${stats.passRate.toFixed(1)} percent of inspections passed`}
          >
            <circle
              cx="84"
              cy="84"
              r="62"
              fill="none"
              stroke="#eff4f1"
              strokeWidth="15"
            />
            {paths}
          </svg>
          <div className="donut-label">
            <strong>
              {stats.passRate.toFixed(1)}
              <small>%</small>
            </strong>
            <span>Pass rate</span>
          </div>
        </div>
        <div className="outcome-legend">
          {segments.map((s) => (
            <button
              key={s.label}
              onClick={() => onFilter(s.label)}
              title={`View ${s.label.toLowerCase()} inspections`}
            >
              <span>
                <i style={{ background: s.color }} />
                {s.label}
              </span>
              <strong>{formatNumber(s.count)}</strong>
              <small>
                {stats.count
                  ? ((s.count / stats.count) * 100).toFixed(1)
                  : "0.0"}
                %
              </small>
            </button>
          ))}
        </div>
      </div>
      <div className="outcome-footnote">
        <span className="tiny-dot" />
        Every inspection is a step toward better.
      </div>
    </section>
  );
}
export function CategoryChart({ records }: { records: Inspection[] }) {
  return (
    <section className="panel category-panel">
      <div className="panel-heading">
        <div>
          <h2>Quality by category</h2>
          <p>Find your strengths. Focus your efforts.</p>
        </div>
      </div>
      <div className="category-bars">
        {CATEGORIES.map((cat, i) => {
          const score = getStats(
            records.filter((r) => r.category === cat),
          ).average;
          return (
            <div className="category-row" key={cat}>
              <div>
                <span>{cat}</span>
                <strong>
                  {score.toFixed(1)}
                  <small>%</small>
                </strong>
              </div>
              <div className="progress-track">
                <span
                  style={{ width: `${score}%`, background: CATEGORY_COLORS[i] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
