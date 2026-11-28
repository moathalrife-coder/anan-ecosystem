import {
  House, Folders, CheckSquare, CalendarBlank, Users, Wallet, Package, Megaphone, BookOpen,
  IdentificationCard, GearSix, ChartBar, Flag, ListChecks, ChatsCircle, User, CheckCircle, Coins,
  Camera, ClockCounterClockwise, Archive, Bell, List, MagnifyingGlass, CaretDown, Warning, Info,
  Lock, Eye, EyeSlash, ArrowRight, ArrowLeft, X, SignOut, Export, ShieldCheck, EnvelopeSimple, Phone, Check,
  Plus, Trash, ArrowUp, ArrowDown, Copy, WhatsappLogo, PencilSimple, Link as LinkIcon, PaperPlaneTilt, Prohibit,
  Airplane, Star,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { IconName } from "@/lib/roles";

// RTL: «رجوع» يشير لليمين، و«التالي» لليسار.
const MAP: Record<IconName, PhosphorIcon> = {
  home: House, projects: Folders, task: CheckSquare, calendar: CalendarBlank, users: Users,
  wallet: Wallet, package: Package, megaphone: Megaphone, book: BookOpen, "id-card": IdentificationCard,
  settings: GearSix, chart: ChartBar, flag: Flag, checklist: ListChecks, chat: ChatsCircle, user: User,
  success: CheckCircle, coins: Coins, camera: Camera, clock: ClockCounterClockwise, archive: Archive,
  bell: Bell, menu: List, search: MagnifyingGlass, "chevron-down": CaretDown, warning: Warning,
  info: Info, lock: Lock, view: Eye, hide: EyeSlash, back: ArrowRight, forward: ArrowLeft, close: X,
  logout: SignOut, export: Export, shield: ShieldCheck, mail: EnvelopeSimple, phone: Phone, check: Check,
  plus: Plus, trash: Trash, up: ArrowUp, down: ArrowDown, copy: Copy, whatsapp: WhatsappLogo, edit: PencilSimple,
  link: LinkIcon, send: PaperPlaneTilt, block: Prohibit, flight: Airplane, star: Star,
};

export function Icon({
  name,
  size = 20,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  className?: string;
  /** نص بديل؛ اتركه فارغاً إذا كانت الأيقونة بجانب نص */
  label?: string;
}) {
  const C = MAP[name];
  return (
    <C
      size={size}
      weight="duotone"
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      style={{ flex: "none" }}
    />
  );
}
