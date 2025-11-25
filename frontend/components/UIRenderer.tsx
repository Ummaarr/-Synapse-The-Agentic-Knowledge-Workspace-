"use client";

import ChartBlock from "./visuals/ChartBlock";

export default function UIRenderer({ ui }: { ui: any }) {
  if (!ui) return null;

  if (Array.isArray(ui)) {
    return (
      <>
        {ui.map((block, i) => (
          <UIRenderer key={i} ui={block} />
        ))}
      </>
    );
  }

  switch (ui.type) {
    case "chart":
      return <ChartBlock spec={ui} />;
    // future: table, kpi, etc
    default:
      return null;
  }
}



