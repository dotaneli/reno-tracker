"use client";

import dynamic from "next/dynamic";

export const ItemMilestones = dynamic(
  () => process.env.NEXT_PUBLIC_UI_VERSION === "v2"
    ? import("./ItemMilestones.v2").then(m => ({ default: m.ItemMilestones }))
    : import("./ItemMilestones.v1").then(m => ({ default: m.ItemMilestones })),
);
