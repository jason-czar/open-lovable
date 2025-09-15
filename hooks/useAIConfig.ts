import { useState, useEffect, useCallback } from 'react';
import { AIConfigState, AIPreset, AIModelConfig } from '@/types/ai-config';
import { PresetManager } from '@/lib/ai-config/preset-manager';
import { getModelCapabilities, validateConfig } from '@/lib/ai-config/model-capabilities';

export function useAIConfig(initialModelId: string) {
  const [state, setState] = useState<AIConfigState>({
    currentConfig: getModelCapabilities(initialModelId).defaultConfig,
    presets: [],
    selectedPreset: null,
    isCustomConfig: false
  });

  const [modelId, setModelId] = useState(initialModelId);

  // Load presets on mount
  useEffect(() => {
    const presets = PresetManager.getPresets();
    const defaultPreset = PresetManager.getPresetForModel(presets, modelId);
    
    setState(prev => ({
      ...prev,
      presets,
      selectedPreset: defaultPreset?.id || null,
      currentConfig: defaultPreset?.config || getModelCapabilities(modelId).defaultConfig,
      isCustomConfig: !defaultPreset
    }));
  }, [modelId]);

  // Update config when model changes
  const updateModel = useCallback((newModelId: string) => {
    setModelId(newModelId);
    const presets = PresetManager.getPresets();
    const defaultPreset = PresetManager.getPresetForModel(presets, newModelId);
    
    setState(prev => ({
      ...prev,
      selectedPreset: defaultPreset?.id || null,
      currentConfig: defaultPreset?.config || getModelCapabilities(newModelId).defaultConfig,
      isCustomConfig: !defaultPreset
    }));
  }, []);

  // Update current config
  const updateConfig = useCallback((config: Partial<AIModelConfig>) => {
    setState(prev => ({
      ...prev,
      currentConfig: { ...prev.currentConfig, ...config },
      isCustomConfig: true,
      selectedPreset: null
    }));
  }, []);

  // Apply preset
  const applyPreset = useCallback((presetId: string) => {
    const preset = state.presets.find(p => p.id === presetId);
    if (preset) {
      setState(prev => ({
        ...prev,
        currentConfig: preset.config,
        selectedPreset: presetId,
        isCustomConfig: false
      }));
    }
  }, [state.presets]);

  // Save current config as preset
  const saveAsPreset = useCallback((name: string, description: string) => {
    const newPreset = PresetManager.createPreset(name, description, state.currentConfig, modelId);
    const updatedPresets = [...state.presets, newPreset];
    
    PresetManager.savePresets(updatedPresets);
    
    setState(prev => ({
      ...prev,
      presets: updatedPresets,
      selectedPreset: newPreset.id,
      isCustomConfig: false
    }));

    return newPreset;
  }, [state.currentConfig, state.presets, modelId]);

  // Delete preset
  const deletePreset = useCallback((presetId: string) => {
    const updatedPresets = PresetManager.deletePreset(state.presets, presetId);
    PresetManager.savePresets(updatedPresets);
    
    setState(prev => ({
      ...prev,
      presets: updatedPresets,
      selectedPreset: prev.selectedPreset === presetId ? null : prev.selectedPreset,
      isCustomConfig: prev.selectedPreset === presetId ? true : prev.isCustomConfig
    }));
  }, [state.presets]);

  // Validate current config
  const validationErrors = validateConfig(state.currentConfig, modelId);
  const isValid = validationErrors.length === 0;

  return {
    ...state,
    modelId,
    updateModel,
    updateConfig,
    applyPreset,
    saveAsPreset,
    deletePreset,
    validationErrors,
    isValid,
    modelCapabilities: getModelCapabilities(modelId)
  };
}