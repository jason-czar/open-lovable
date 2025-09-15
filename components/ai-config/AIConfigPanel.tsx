"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Save, Trash2, RotateCcw, Info } from 'lucide-react';
import { useAIConfig } from '@/hooks/useAIConfig';
import { AIParameterSlider } from './AIParameterSlider';
import Button from '@/components/ui/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/shadcn/dialog';
import Input from '@/components/ui/shadcn/input';
import { cn } from '@/utils/cn';

interface AIConfigPanelProps {
  modelId: string;
  onModelChange: (modelId: string) => void;
  onConfigChange: (config: any) => void;
  className?: string;
  compact?: boolean;
}

export function AIConfigPanel({
  modelId,
  onModelChange,
  onConfigChange,
  className,
  compact = false
}: AIConfigPanelProps) {
  const aiConfig = useAIConfig(modelId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Notify parent of config changes
  const handleConfigUpdate = (updates: any) => {
    aiConfig.updateConfig(updates);
    onConfigChange({ ...aiConfig.currentConfig, ...updates });
  };

  const handleModelChange = (newModelId: string) => {
    aiConfig.updateModel(newModelId);
    onModelChange(newModelId);
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      aiConfig.saveAsPreset(presetName.trim(), presetDescription.trim());
      setShowSaveDialog(false);
      setPresetName('');
      setPresetDescription('');
    }
  };

  const resetToDefaults = () => {
    const defaultConfig = aiConfig.modelCapabilities.defaultConfig;
    aiConfig.updateConfig(defaultConfig);
    onConfigChange(defaultConfig);
  };

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="tertiary"
          size="default"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-6"
        >
          <Settings className="w-16 h-16" />
          AI Settings
          {aiConfig.isCustomConfig && (
            <div className="w-6 h-6 bg-heat-100 rounded-full" />
          )}
        </Button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-8 w-80 bg-white border border-border-faint rounded-12 shadow-lg z-50 p-16"
            >
              <AIConfigContent
                aiConfig={aiConfig}
                onConfigUpdate={handleConfigUpdate}
                onModelChange={handleModelChange}
                onSavePreset={() => setShowSaveDialog(true)}
                onResetDefaults={resetToDefaults}
                compact
              />
            </motion.div>
          )}
        </AnimatePresence>

        <SavePresetDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          onSave={handleSavePreset}
          presetName={presetName}
          setPresetName={setPresetName}
          presetDescription={presetDescription}
          setPresetDescription={setPresetDescription}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-16", className)}>
      <AIConfigContent
        aiConfig={aiConfig}
        onConfigUpdate={handleConfigUpdate}
        onModelChange={handleModelChange}
        onSavePreset={() => setShowSaveDialog(true)}
        onResetDefaults={resetToDefaults}
      />

      <SavePresetDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSavePreset}
        presetName={presetName}
        setPresetName={setPresetName}
        presetDescription={presetDescription}
        setPresetDescription={setPresetDescription}
      />
    </div>
  );
}

function AIConfigContent({
  aiConfig,
  onConfigUpdate,
  onModelChange,
  onSavePreset,
  onResetDefaults,
  compact = false
}: {
  aiConfig: ReturnType<typeof useAIConfig>;
  onConfigUpdate: (updates: any) => void;
  onModelChange: (modelId: string) => void;
  onSavePreset: () => void;
  onResetDefaults: () => void;
  compact?: boolean;
}) {
  const { currentConfig, presets, selectedPreset, isCustomConfig, modelCapabilities, validationErrors } = aiConfig;

  return (
    <div className="space-y-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-label-large text-accent-black font-medium">AI Parameters</h3>
          {!compact && (
            <p className="text-body-small text-black-alpha-56 mt-2">
              Fine-tune AI behavior for your specific needs
            </p>
          )}
        </div>
        {isCustomConfig && (
          <div className="flex items-center gap-6 text-body-small text-heat-100">
            <div className="w-6 h-6 bg-heat-100 rounded-full" />
            Custom
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-12 bg-red-50 border border-red-200 rounded-8">
          <div className="flex items-start gap-8">
            <Info className="w-16 h-16 text-red-600 mt-2 flex-shrink-0" />
            <div>
              <p className="text-label-small text-red-800 font-medium">Configuration Issues</p>
              <ul className="mt-4 space-y-2">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-body-small text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preset Selection */}
      <div className="space-y-8">
        <label className="text-label-small text-black-alpha-64">Preset</label>
        <select
          value={selectedPreset || 'custom'}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              // Keep current config but mark as custom
            } else {
              aiConfig.applyPreset(e.target.value);
            }
          }}
          className="w-full px-12 py-8 text-body-medium bg-white border border-black-alpha-8 rounded-8 focus:border-heat-100 focus:outline-none"
        >
          <option value="custom">Custom Configuration</option>
          {presets
            .filter(p => p.modelId === 'all' || p.modelId === aiConfig.modelId)
            .map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name} - {preset.description}
              </option>
            ))}
        </select>
      </div>

      {/* Parameters */}
      <div className="space-y-20">
        {/* Temperature */}
        {modelCapabilities.supportsTemperature && (
          <AIParameterSlider
            label="Temperature"
            description="Controls randomness. Higher values make output more creative but less focused."
            value={currentConfig.temperature}
            min={modelCapabilities.temperatureRange[0]}
            max={modelCapabilities.temperatureRange[1]}
            step={0.1}
            onChange={(temperature) => onConfigUpdate({ temperature })}
            formatValue={(v) => v.toFixed(1)}
          />
        )}

        {/* Top-p */}
        {modelCapabilities.supportsTopP && (
          <AIParameterSlider
            label="Top-p"
            description="Controls diversity. Lower values focus on more likely tokens."
            value={currentConfig.topP}
            min={modelCapabilities.topPRange[0]}
            max={modelCapabilities.topPRange[1]}
            step={0.05}
            onChange={(topP) => onConfigUpdate({ topP })}
            formatValue={(v) => v.toFixed(2)}
          />
        )}

        {/* Max Tokens */}
        {modelCapabilities.supportsMaxTokens && (
          <AIParameterSlider
            label="Max Tokens"
            description="Maximum length of the generated response."
            value={currentConfig.maxTokens}
            min={modelCapabilities.maxTokensRange[0]}
            max={modelCapabilities.maxTokensRange[1]}
            step={100}
            onChange={(maxTokens) => onConfigUpdate({ maxTokens })}
            formatValue={(v) => v.toLocaleString()}
          />
        )}

        {/* Frequency Penalty */}
        {modelCapabilities.supportsFrequencyPenalty && (
          <AIParameterSlider
            label="Frequency Penalty"
            description="Reduces repetition by penalizing frequently used tokens."
            value={currentConfig.frequencyPenalty || 0}
            min={-2}
            max={2}
            step={0.1}
            onChange={(frequencyPenalty) => onConfigUpdate({ frequencyPenalty })}
            formatValue={(v) => v.toFixed(1)}
          />
        )}

        {/* Presence Penalty */}
        {modelCapabilities.supportsPresencePenalty && (
          <AIParameterSlider
            label="Presence Penalty"
            description="Encourages talking about new topics by penalizing tokens that have appeared."
            value={currentConfig.presencePenalty || 0}
            min={-2}
            max={2}
            step={0.1}
            onChange={(presencePenalty) => onConfigUpdate({ presencePenalty })}
            formatValue={(v) => v.toFixed(1)}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-8 pt-8 border-t border-border-faint">
        <Button
          variant="secondary"
          size="default"
          onClick={onSavePreset}
          disabled={!isCustomConfig}
          className="gap-6"
        >
          <Save className="w-14 h-14" />
          Save Preset
        </Button>
        
        <Button
          variant="tertiary"
          size="default"
          onClick={onResetDefaults}
          className="gap-6"
        >
          <RotateCcw className="w-14 h-14" />
          Reset
        </Button>

        {selectedPreset && !presets.find(p => p.id === selectedPreset)?.isDefault && (
          <Button
            variant="tertiary"
            size="default"
            onClick={() => aiConfig.deletePreset(selectedPreset)}
            className="gap-6 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-14 h-14" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function SavePresetDialog({
  isOpen,
  onClose,
  onSave,
  presetName,
  setPresetName,
  presetDescription,
  setPresetDescription
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  presetName: string;
  setPresetName: (name: string) => void;
  presetDescription: string;
  setPresetDescription: (description: string) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save AI Preset</DialogTitle>
          <DialogDescription>
            Save your current AI parameters as a reusable preset.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-16 py-16">
          <div className="space-y-8">
            <label className="text-label-small text-black-alpha-64">Preset Name</label>
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g., Creative Writing"
              className="w-full"
            />
          </div>
          
          <div className="space-y-8">
            <label className="text-label-small text-black-alpha-64">Description (optional)</label>
            <Input
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              placeholder="e.g., Higher creativity for content generation"
              className="w-full"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-8">
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={onSave}
            disabled={!presetName.trim()}
          >
            Save Preset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}