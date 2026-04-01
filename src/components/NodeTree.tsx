"use client";

import dynamic from "next/dynamic";

export const NodeTree = dynamic(
  () => process.env.NEXT_PUBLIC_UI_VERSION === "v2"
    ? import("./NodeTree.v2").then(m => ({ default: m.NodeTree }))
    : import("./NodeTree.v1").then(m => ({ default: m.NodeTree })),
);
