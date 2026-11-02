import { BookOpen, HandCoins, Linkedin, Mail, MessageSquare, Scale, ShieldCheck, Users } from "lucide-react";
import type { ToolSpec } from "@/lib/toolkit/tools";

export const TOOL_ICONS: Record<ToolSpec["icon"], typeof Mail> = { Mail, ShieldCheck, MessageSquare, Linkedin, Users, HandCoins, Scale, BookOpen };
