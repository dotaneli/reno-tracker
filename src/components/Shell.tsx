"use client";

import dynamic from "next/dynamic";

export const Shell = dynamic(
  () => process.env.NEXT_PUBLIC_UI_VERSION === "v2"
    ? import("./Shell.v2").then(m => ({ default: m.Shell }))
    : import("./Shell.v1").then(m => ({ default: m.Shell })),
);
