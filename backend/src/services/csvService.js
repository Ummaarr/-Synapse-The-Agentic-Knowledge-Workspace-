import fs from "fs";
import { parse } from "csv-parse";

export const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve({ rows, text: JSON.stringify(rows) }))
      .on("error", reject);
  });
};
