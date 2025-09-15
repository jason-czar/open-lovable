import { AIPreset, AIModelConfig } from '@/types/ai-config';
import { DEFAULT_PRESETS } from './model-capabilities';

const STORAGE_KEY = 'open-lovable-ai-presets';

export class PresetManager {
  static getPresets(): AIPreset[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const presets = JSON.parse(stored);
        return presets;
      }
    } catch (error) {
      console.error('Failed to load AI presets:', error);
    }
    
    // Return default presets with generated IDs
    return DEFAULT_PRESETS.map(preset => ({
      ...preset,
      id: `default-${preset.name.toLowerCase().replace(/\s+/g, '-')}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
  }

  static savePresets(presets: AIPreset[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save AI presets:', error);
    }
  }

  static createPreset(
    name: string, 
    description: string, 
    config: AIModelConfig, 
    modelId: string
  ): AIPreset {
    return {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      config,
      modelId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  static updatePreset(presets: AIPreset[], presetId: string, updates: Partial<AIPreset>): AIPreset[] {
    return presets.map(preset => 
      preset.id === presetId 
        ? { ...preset, ...updates, updatedAt: Date.now() }
        : preset
    );
  }

  static deletePreset(presets: AIPreset[], presetId: string): AIPreset[] {
    return presets.filter(preset => preset.id !== presetId);
  }

  static getPresetForModel(presets: AIPreset[], modelId: string): AIPreset | null {
    // First try to find a model-specific preset
    const modelSpecific = presets.find(p => p.modelId === modelId && p.isDefault);
    if (modelSpecific) return modelSpecific;

    // Fall back to general default preset
    const generalDefault = presets.find(p => p.modelId === 'all' && p.isDefault);
    if (generalDefault) return generalDefault;

    // Fall back to first preset
    return presets[0] || null;
  }
}