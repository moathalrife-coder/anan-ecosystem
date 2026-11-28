import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { PageBody } from "./PageBody";
import { TitleTile } from "@/components/shell/TitleTile";

export function Forbidden({ title }: { title: string }) {
  return (
    <PageBody>
      <TitleTile title={title} />
      <Card>
        <CardTitle>
          <Icon name="lock" size={24} className="text-blue" />
          هذه الصفحة ليست ضمن صلاحيات دورك الحالي
        </CardTitle>
        <Caption>إذا كنت تحمل أكثر من دور، بدّل الدور من أعلى الشاشة. لطلب صلاحية تواصل مع مدير المشاريع.</Caption>
        <div>
          <ButtonLink href="/" variant="ghost">
            <Icon name="home" size={20} />
            العودة إلى لوحتي
          </ButtonLink>
        </div>
      </Card>
    </PageBody>
  );
}
