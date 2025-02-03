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
  type: string;
  status: string;
  description: string;
}

export type AgentType = 
  | 'spkt'
  | 'case_research'
  | 'image'
  | 'hoax_checker'
  | 'image_processor'
  | 'modus_kejahatan';

export interface ExtendedAgent {
  id: string;
  name: string;
  type: AgentType;
  status: 'on' | 'off';
  description: string;
  fields: AgentField[];
}

export interface AgentField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'file';
  placeholder?: string;
  accept?: string;
}

export type FormDataValue = string | File | null;

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