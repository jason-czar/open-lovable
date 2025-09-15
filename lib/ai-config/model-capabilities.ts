import { AIModelCapabilities, AIModelConfig } from '@/types/ai-config';

// Model capabilities and default configurations
export const MODEL_CAPABILITIES: Record<string, AIModelCapabilities> = {
  'openai/gpt-5': {
    supportsTemperature: true,
    supportsTopP: true,
    supportsMaxTokens: true,
    supportsFrequencyPenalty: true,
    supportsPresencePenalty: true,
    supportsStopSequences: true,
    temperatureRange: [0, 2],
    topPRange: [0, 1],
    maxTokensRange: [1, 16384],
    defaultConfig: {
      temperature: 0.7,
      topP: 1,
      maxTokens: 8000,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: []
    }
  },
  'moonshotai/kimi-k2-instruct-0905': {
    supportsTemperature: true,
    supportsTopP: true,
    supportsMaxTokens: true,
    supportsFrequencyPenalty: false,
    supportsPresencePenalty: false,
    supportsStopSequences: false,
    temperatureRange: [0, 1],
    topPRange: [0, 1],
    maxTokensRange: [1, 8192],
    defaultConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 8000
    }
  },
  'anthropic/claude-sonnet-4-20250514': {
    supportsTemperature: true,
    supportsTopP: true,
    supportsMaxTokens: true,
    supportsFrequencyPenalty: false,
    supportsPresencePenalty: false,
    supportsStopSequences: true,
    temperatureRange: [0, 1],
    topPRange: [0, 1],
    maxTokensRange: [1, 8192],
    defaultConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 8000,
      stopSequences: []
    }
  },
  'google/gemini-2.0-flash-exp': {
    supportsTemperature: true,
    supportsTopP: true,
    supportsMaxTokens: true,
    supportsFrequencyPenalty: false,
    supportsPresencePenalty: false,
    supportsStopSequences: true,
    temperatureRange: [0, 2],
    topPRange: [0, 1],
    maxTokensRange: [1, 8192],
    defaultConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 8000,
      stopSequences: []
    }
  }
};

// Default presets for different use cases
export const DEFAULT_PRESETS: Omit<AIPreset, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Balanced',
    description: 'Good balance of creativity and consistency',
    config: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 8000
    },
    modelId: 'all',
    isDefault: true
  },
  {
    name: 'Creative',
    description: 'More creative and varied outputs',
    config: {
      temperature: 0.9,
      topP: 0.95,
      maxTokens: 8000
    },
    modelId: 'all'
  },
  {
    name: 'Precise',
    description: 'More deterministic and focused outputs',
    config: {
      temperature: 0.3,
      topP: 0.8,
      maxTokens: 8000
    },
    modelId: 'all'
  },
  {
    name: 'Code Focused',
    description: 'Optimized for code generation tasks',
    config: {
      temperature: 0.2,
      topP: 0.85,
      maxTokens: 12000
    },
    modelId: 'all'
  }
];

export function getModelCapabilities(modelId: string): AIModelCapabilities {
  return MODEL_CAPABILITIES[modelId] || MODEL_CAPABILITIES['openai/gpt-5'];
}

export function validateConfig(config: AIModelConfig, modelId: string): string[] {
  const errors: string[] = [];
  const capabilities = getModelCapabilities(modelId);

  if (config.temperature < capabilities.temperatureRange[0] || 
      config.temperature > capabilities.temperatureRange[1]) {
    errors.push(`Temperature must be between ${capabilities.temperatureRange[0]} and ${capabilities.temperatureRange[1]}`);
  }

  if (config.topP < capabilities.topPRange[0] || 
      config.topP > capabilities.topPRange[1]) {
    errors.push(`Top-p must be between ${capabilities.topPRange[0]} and ${capabilities.topPRange[1]}`);
  }

  if (config.maxTokens < capabilities.maxTokensRange[0] || 
      config.maxTokens > capabilities.maxTokensRange[1]) {
    errors.push(`Max tokens must be between ${capabilities.maxTokensRange[0]} and ${capabilities.maxTokensRange[1]}`);
  }

  return errors;
}