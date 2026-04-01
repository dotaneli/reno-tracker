"use client";

import dynamic from "next/dynamic";

const Page = process.env.NEXT_PUBLIC_UI_VERSION === "v2"
  ? dynamic(() => import("./page.v2"))
  : dynamic(() => import("./page.v1"));

export default Page;
