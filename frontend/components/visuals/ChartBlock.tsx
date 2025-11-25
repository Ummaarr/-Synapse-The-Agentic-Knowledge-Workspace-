"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Color palette for charts
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

export default function ChartBlock({ spec }: { spec: any }) {
  const { chartType = "line", title, data = [], xKey, yKey, multipleSeries } = spec || {};

  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-muted/50 rounded-xl text-muted-foreground text-sm mt-3 border border-border/50">
        No data to display.
      </div>
    );
  }

  const chartHeight = 400;
  const containerClass = "bg-card p-5 rounded-xl shadow-sm mt-3 border border-border/50";
  const titleClass = "text-lg font-semibold mb-4 text-foreground";
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    color: 'hsl(var(--popover-foreground))'
  };

  if (chartType === "line") {
    return (
      <div className={containerClass}>
        {title && <h4 className={titleClass}>{title}</h4>}
        <div style={{ width: "100%", height: chartHeight }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={xKey}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              {multipleSeries ? (
                multipleSeries.map((series: any, index: number) => (
                  <Line
                    key={series.key || index}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color || COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={{ fill: series.color || COLORS[index % COLORS.length], r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chartType === "bar") {
    return (
      <div className={containerClass}>
        {title && <h4 className={titleClass}>{title}</h4>}
        <div style={{ width: "100%", height: chartHeight }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={xKey}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              {multipleSeries ? (
                multipleSeries.map((series: any, index: number) => (
                  <Bar
                    key={series.key || index}
                    dataKey={series.key}
                    fill={series.color || COLORS[index % COLORS.length]}
                    radius={[8, 8, 0, 0]}
                  />
                ))
              ) : (
                <Bar
                  dataKey={yKey}
                  fill="#6366f1"
                  radius={[8, 8, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chartType === "area") {
    return (
      <div className={containerClass}>
        {title && <h4 className={titleClass}>{title}</h4>}
        <div style={{ width: "100%", height: chartHeight }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={xKey}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke="#6366f1"
                fill="url(#colorGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chartType === "pie") {
    return (
      <div className={containerClass}>
        {title && <h4 className={titleClass}>{title}</h4>}
        <div style={{ width: "100%", height: chartHeight }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey={yKey}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/50 rounded-xl text-muted-foreground text-sm mt-3 border border-border/50">
      Unsupported chart type: {chartType}
    </div>
  );
}



