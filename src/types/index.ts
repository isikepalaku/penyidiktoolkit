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

export interface ExtendedAgent extends Agent {
  fields: Field[];
}

export type FormDataValue = string | File | null;

export interface FormData {
  [key: string]: FormDataValue;
}