"use client";

import dynamic from "next/dynamic";

export const Nav = dynamic(
  () => process.env.NEXT_PUBLIC_UI_VERSION === "v2"
    ? import("./Nav.v2").then(m => ({ default: m.Nav }))
    : import("./Nav.v1").then(m => ({ default: m.Nav })),
);
