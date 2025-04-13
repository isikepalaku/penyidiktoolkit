import { ExtendedAgent } from "@/types";
import { Pill } from "lucide-react";

export const narkotikaAgent: ExtendedAgent = {
  id: 'narkotika_001',
  name: 'Res NARKOBA',
  type: 'narkotika_chat',
  status: 'on',
  description: 'Asisten AI yang fokus pada tindak pidana di bidang Narkotika, Psikotropika, dan zat adiktif lainnya',
  icon: Pill,
  iconClassName: 'text-amber-600',
  fields: [],
}; 