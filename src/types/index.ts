import { LucideIcon } from 'lucide-react';

export interface Field {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  accept?: string;
}

export type Priority = 'high' | 'medium' | 'low';
export type Status = 'open' | 'in_progress' | 'closed';

export interface Case {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  last_updated: string;
  assigned_to?: string;
  tags?: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: string;
  icon?: string;
  color?: string;
  fields?: Array<{
    id: string;
    label: string;
    type: string;
    placeholder?: string;
  }>;
}

export type AgentType =
  | 'image'
  | 'image_processor'
  | 'case_research'
  | 'hoax_checker'
  | 'crime_trend_analyst'
  | 'sentiment_analyst'
  | 'spkt'
  | 'perkaba_chat'
  | 'perkaba_search'
  | 'bantek_chat'
  | 'wassidik_chat'
  | 'undang_chat'
  | 'kuhp_chat'
  | 'kuhap_chat'
  | 'ite_chat'
  | 'ciptakerja_chat'
  | 'kesehatan_chat'
  | 'tipidkor_chat'
  | 'tipidter_chat'
  | 'tipikor_analyst'
  | 'modus_kejahatan'
  | 'medical_image'
  | 'penyidik_chat'
  | 'fismondev_chat'
  | 'siber_chat'
  | 'perbankan_chat'
  | 'emp_chat'
  | 'indagsi_chat'
  | 'narkotika_chat'
  | 'pdf_image_analyzer'
  | 'ppa_ppo_chat';

export interface ExtendedAgent {
  id: string;
  name: string;
  type: AgentType;
  status: 'on' | 'off';
  description: string;
  baseUrl?: string;
  fields: AgentField[];
  icon?: LucideIcon;
  iconClassName?: string;
  warning?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface AgentField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'file' | 'select';
  placeholder?: string;
  accept?: string;
  options?: SelectOption[];
  required?: boolean;
  multiple?: boolean;
}

export type FormDataValue = string | File | File[] | null;

export interface FormData {
  [key: string]: FormDataValue;
}

export interface DocumentMetadata {
  nomor_putusan: string | null;
  tanggal_putusan: string | null;
  pasal_disangkakan: string | null;
  hukuman_penjara: string | null;
  hukuman_denda: string | null;
  kronologis_singkat: string | null;
  file_url?: string | null;
  link_gdrive?: string | null;
}

export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  category: 'contract' | 'policy' | 'agreement' | 'regulation';
  dateAdded: string;
  tags: string[];
  file_path: string;
  file_url?: string;
  link_gdrive?: string;
  metadata: DocumentMetadata;
}

export interface SearchResult {
  document: LegalDocument;
  relevanceScore: number;
  matchedSegments: string[];
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  agent: string;
}
