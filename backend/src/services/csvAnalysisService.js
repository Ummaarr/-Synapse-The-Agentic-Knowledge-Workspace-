// backend/src/services/csvAnalysisService.js
import fs from "fs";
import { parse } from "csv-parse/sync";

/**
 * readCsvFromPath - reads CSV from a local path and returns records
 * NOTE: your platform will transform a path -> url if needed. We accept an absolute path here.
 */
export const readCsvFromPath = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
    });
    return records;
  } catch (err) {
    console.error("Error reading CSV:", err);
    return [];
  }
};

/**
 * analyzeCsvForChart - create a basic line chart spec for a simple sales CSV.
 * It tries to detect numeric columns. You can extend logic for aggregates.
 */
export const analyzeCsvForChart = (filePath, opts = {}) => {
  const rows = readCsvFromPath(filePath);
  
  if (!rows || rows.length === 0) {
    return { error: "CSV empty or unreadable" };
  }

  // Heuristic: find first string column for x-axis, first numeric for y-axis
  const sample = rows[0];
  const keys = Object.keys(sample);
  let xKey = null;
  let yKey = null;

  // detect numeric columns
  for (const k of keys) {
    const v = sample[k];
    if (!isNaN(Number(v)) && v !== "" && v !== null) {
      if (!yKey) yKey = k;
    } else {
      if (!xKey) xKey = k;
    }
  }

  // fallback if detection failed
  if (!xKey) xKey = keys[0];
  if (!yKey) {
    // try second key
    yKey = keys.find((k) => k !== xKey) || keys[0];
  }

  // Build data array (coerce numeric)
  const data = rows.map((r) => {
    const obj = { ...r };
    obj[yKey] = Number(r[yKey]) || 0;
    return obj;
  });

  // Create a chart spec that the frontend understands
  const chartSpec = {
    type: "chart",
    chartType: "line", // might choose 'bar' depending on distribution
    title: opts.title || `Analysis of ${filePath.split("/").pop()}`,
    xKey,
    yKey,
    data,
  };

  // compute a simple insight
  const total = data.reduce((s, it) => s + (Number(it[yKey]) || 0), 0);
  const avg = total / data.length;
  const insights = `Detected x="${xKey}", y="${yKey}". Rows=${data.length}. Sum=${total.toFixed(
    2
  )}, Avg=${avg.toFixed(2)}.`;

  return { chart: chartSpec, insights };
};



