// AI Configuration Types
export interface AIModelConfig {
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface AIPreset {
  id: string;
  name: string;
  description: string;
  config: AIModelConfig;
  modelId: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AIModelCapabilities {
  supportsTemperature: boolean;
  supportsTopP: boolean;
  supportsMaxTokens: boolean;
  supportsFrequencyPenalty: boolean;
  supportsPresencePenalty: boolean;
  supportsStopSequences: boolean;
  temperatureRange: [number, number];
  topPRange: [number, number];
  maxTokensRange: [number, number];
  defaultConfig: AIModelConfig;
}

export interface AIConfigState {
  currentConfig: AIModelConfig;
  presets: AIPreset[];
  selectedPreset: string | null;
  isCustomConfig: boolean;
}