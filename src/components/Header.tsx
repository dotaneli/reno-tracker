"use client";

import dynamic from "next/dynamic";

export const Header = dynamic(
  () => process.env.NEXT_PUBLIC_UI_VERSION === "v2"
    ? import("./Header.v2").then(m => ({ default: m.Header }))
    : import("./Header.v1").then(m => ({ default: m.Header })),
);
