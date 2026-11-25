import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ghost" | "onNavy" | "link";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold text-[14px] min-h-10 px-4 " +
  "transition-[transform,background-color] duration-150 ease-[cubic-bezier(.2,0,0,1)] " +
  "hover:-translate-y-px active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer no-underline";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:text-white hover:bg-[#2d539a]",
  ghost: "bg-surface text-navy border border-line-strong hover:text-navy",
  onNavy: "bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:text-white",
  link: "bg-transparent text-blue px-0 hover:translate-y-0 hover:text-navy",
};
const sizes: Record<Size, string> = { md: "", lg: "min-h-[52px] text-[16px] w-full" };

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
