import { z } from "zod";

/** نفس قياس قوة كلمة المرور في تصميم الدخول */
export function passwordScore(pw: string) {
  return (pw.length >= 8 ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[A-Za-z؀-ۿ]/.test(pw) ? 1 : 0) + (pw.length >= 12 ? 1 : 0);
}

export const newPasswordSchema = z
  .string()
  .max(72, "كلمة المرور طويلة جداً")
  .refine((pw) => pw.length >= 8 && /[0-9]/.test(pw) && /[A-Za-z؀-ۿ]/.test(pw), {
    message: "8 أحرف على الأقل، فيها حروف وأرقام",
  });

export const STRENGTH_TEXT = ["8 أحرف على الأقل، فيها حروف وأرقام", "ضعيفة", "مقبولة، أضف أرقاماً أو حروفاً", "جيدة", "قوية"];
export const STRENGTH_COLOR = ["#e6edf8", "#c22b33", "#f2bf55", "#1baf7a", "#0d7a63"];

/** يحوّل أرقام الجوال العربية/الدولية إلى 05xxxxxxxx */
export function normalizeIdentifier(raw: string) {
  const v = raw.trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (v.includes("@")) return v.toLowerCase();
  const digits = v.replace(/[\s-]/g, "");
  if (/^(\+?966)5\d{8}$/.test(digits)) return "0" + digits.replace(/^\+?966/, "");
  return digits;
}
