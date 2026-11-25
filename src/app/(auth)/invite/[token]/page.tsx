import type { Metadata } from "next";
import { AuthFrame, AuthHeading } from "@/components/auth/AuthFrame";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeAssignment, type RoleAssignment } from "@/lib/roles";
import { hashToken } from "@/lib/auth/token";
import { InviteForm } from "./InviteForm";

export const metadata: Metadata = { title: "تفعيل الدعوة" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{32,128}$/.test(token);
  const inv = valid
    ? ((await createAdminClient().rpc("invitation_by_token", { p_token_hash: hashToken(token) })).data as
        | { full_name: string; roles: RoleAssignment[] }
        | null)
    : null;

  if (!inv) {
    return (
      <AuthFrame>
        <AuthHeading title="رابط الدعوة غير صالح" />
        <Alert tone="error">الرابط منتهي (صالح 7 أيام) أو مستخدم من قبل. اطلب دعوة جديدة من مدير المشاريع.</Alert>
        <ButtonLink href="/login" variant="ghost" size="lg">الذهاب لصفحة الدخول</ButtonLink>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <AuthHeading
        title="مرحباً بك في عنان"
        sub={
          <>
            دعاك مدير المشاريع بصفة <b>{inv.roles.map(describeAssignment).join("، ")}</b>. عيّن كلمة مرورك لتبدأ.
          </>
        }
      />
      <InviteForm token={token} fullName={inv.full_name} />
    </AuthFrame>
  );
}
