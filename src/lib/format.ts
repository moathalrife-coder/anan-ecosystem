/** المبلغ مع «ر.س» ملتصقة بمسافة غير قابلة للكسر */
export function formatSAR(amount: number) {
  return `${new Intl.NumberFormat("ar-SA-u-nu-latn", { maximumFractionDigits: 2 }).format(amount)} ر.س`;
}

const dtf = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Riyadh",
});
const df = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "long", timeZone: "Asia/Riyadh" });

export const formatDateTime = (d: string | Date) => dtf.format(new Date(d));
export const formatDate = (d: string | Date) => df.format(new Date(d));
