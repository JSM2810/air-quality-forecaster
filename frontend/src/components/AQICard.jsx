// src/components/AQICard.jsx
export default function AQICard({ city, aqi, forecastAt }) {

  const getInfo = (val) => {
    if (!val) return { label: "No Data", bg: "#f1f5f9", text: "#64748b", accent: "#94a3b8", bar: "#cbd5e1" };
    if (val <= 50)  return { label: "Good",        bg: "#f0fdf4", text: "#166534", accent: "#22c55e", bar: "#22c55e" };
    if (val <= 100) return { label: "Moderate",    bg: "#fffbeb", text: "#92400e", accent: "#f59e0b", bar: "#f59e0b" };
    if (val <= 150) return { label: "Unhealthy for Sensitive Groups", bg: "#fff7ed", text: "#9a3412", accent: "#f97316", bar: "#f97316" };
    if (val <= 200) return { label: "Unhealthy",   bg: "#fef2f2", text: "#991b1b", accent: "#ef4444", bar: "#ef4444" };
    if (val <= 300) return { label: "Very Unhealthy", bg: "#faf5ff", text: "#6b21a8", accent: "#9333ea", bar: "#9333ea" };
    return           { label: "Hazardous",         bg: "#fff1f2", text: "#881337", accent: "#e11d48", bar: "#e11d48" };
  };

  const { label, bg, text, accent, bar } = getInfo(aqi);
  const displayAqi = aqi !== null && aqi !== undefined ? Math.round(aqi) : "—";
  const time = forecastAt ? new Date(forecastAt).toLocaleString() : "—";

  // Progress bar width (max AQI ~300)
  const barWidth = aqi ? Math.min(100, (aqi / 300) * 100) : 0;

  return (
    <div style={{
      background: bg,
      borderRadius: "18px",
      padding: "22px 26px",
      minWidth: "220px",
      border: `1.5px solid ${accent}33`,
      boxShadow: `0 4px 20px ${accent}22`,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      {/* City name */}
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent }}>
        📍 {city}
      </div>

      {/* AQI number */}
      <div style={{ fontSize: "64px", fontWeight: 800, color: text, lineHeight: 1, letterSpacing: "-2px" }}>
        {displayAqi}
      </div>

      {/* Label */}
      <div style={{ fontSize: "14px", fontWeight: 600, color: text }}>
        {label}
      </div>

      {/* Progress bar */}
      <div style={{ background: `${accent}22`, borderRadius: "99px", height: "5px", overflow: "hidden" }}>
        <div style={{ width: `${barWidth}%`, height: "100%", background: bar, borderRadius: "99px", transition: "width 0.5s ease" }} />
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: "10px", color: `${text}99`, marginTop: "2px" }}>
        PM2.5 AQI • {time}
      </div>
    </div>
  );
}