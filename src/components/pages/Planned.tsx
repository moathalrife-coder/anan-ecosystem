import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { BUILD_PHASE_NAME, type IconName } from "@/lib/roles";

/** بطاقة صادقة لصفحة لم تُبنَ بعد: متى تُبنى وماذا ستحتوي. */
export function Planned({ phase, icon, points }: { phase: number; icon: IconName; points: string[] }) {
  return (
    <Card>
      <CardTitle>
        <Icon name={icon} size={24} className="text-blue" />
        تُبنى في المرحلة {phase}: {BUILD_PHASE_NAME[phase]}
      </CardTitle>
      <Caption>الهيكل جاهز، والمحتوى يُضاف بعد اعتماد المراحل السابقة. ما ستحتويه هذه الصفحة:</Caption>
      <ul className="m-0 ps-5 flex flex-col gap-1.5 text-[15px] leading-[26px]">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Card>
  );
}
