"use client";

import dynamic from "next/dynamic";

export const StatusBadge = dynamic(
  () => process.env.NEXT_PUBLIC_UI_VERSION === "v2"
    ? import("./StatusBadge.v2").then(m => ({ default: m.StatusBadge }))
    : import("./StatusBadge.v1").then(m => ({ default: m.StatusBadge })),
);
