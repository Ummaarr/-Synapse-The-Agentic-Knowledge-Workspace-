"use client";

import React from "react";
import ChatPanel from "../components/ChatPanel";

export default function Page() {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      <ChatPanel />
    </div>
  );
}
