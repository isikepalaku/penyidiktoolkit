export interface Field {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  accept?: string;
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