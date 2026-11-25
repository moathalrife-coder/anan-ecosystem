import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** رمز الدعوة لا يُخزَّن، فقط بصمته */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newInviteToken = () => randomBytes(32).toString("base64url");
