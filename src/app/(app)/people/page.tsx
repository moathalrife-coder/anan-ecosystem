import type { Metadata } from "next";
import { NavPage } from "@/components/pages/NavPage";
import { NAV } from "@/lib/roles";

export const metadata: Metadata = { title: NAV.find((n) => n.key === "people")!.label };

export default function Page() {
  return <NavPage navKey="people" />;
}
