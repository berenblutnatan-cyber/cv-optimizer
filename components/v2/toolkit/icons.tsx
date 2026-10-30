import { BookOpen, HandCoins, Linkedin, Mail, MessageSquare, Scale, Users } from "lucide-react";
import type { ToolSpec } from "@/lib/toolkit/tools";

export const TOOL_ICONS: Record<ToolSpec["icon"], typeof Mail> = { Mail, MessageSquare, Linkedin, Users, HandCoins, Scale, BookOpen };
