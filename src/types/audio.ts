// Types for audio processing
export interface AudioFormData extends Record<string, unknown> {
  audio_file: File | null;
  task_type: string;
}

export interface AudioTaskMetadata {
  duration?: string;
  numSpeakers?: number;
  quality?: string;
}