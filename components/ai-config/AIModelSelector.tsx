"use client";

import { useState } from 'react';
import { ChevronDown, Zap, Brain, Sparkles, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { appConfig } from '@/config/app.config';
import { cn } from '@/utils/cn';

interface AIModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
  showCapabilities?: boolean;
}

const MODEL_ICONS = {
  'openai/gpt-5': Brain,
  'moonshotai/kimi-k2-instruct-0905': Zap,
  'anthropic/claude-sonnet-4-20250514': Sparkles,
  'google/gemini-2.0-flash-exp': Globe
};

const MODEL_DESCRIPTIONS = {
  'openai/gpt-5': 'Most advanced reasoning and code generation',
  'moonshotai/kimi-k2-instruct-0905': 'Fast and efficient via Groq infrastructure',
  'anthropic/claude-sonnet-4-20250514': 'Excellent at following instructions precisely',
  'google/gemini-2.0-flash-exp': 'Experimental model with latest capabilities'
};

export function AIModelSelector({
  selectedModel,
  onModelChange,
  className,
  showCapabilities = true
}: AIModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedModelInfo = {
    id: selectedModel,
    name: appConfig.ai.modelDisplayNames[selectedModel] || selectedModel,
    description: MODEL_DESCRIPTIONS[selectedModel as keyof typeof MODEL_DESCRIPTIONS],
    icon: MODEL_ICONS[selectedModel as keyof typeof MODEL_ICONS] || Brain
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full p-12 bg-white border border-black-alpha-8 rounded-8 transition-all",
          "hover:border-black-alpha-12 hover:bg-black-alpha-2",
          "focus:border-heat-100 focus:outline-none",
          isOpen && "border-heat-100 bg-black-alpha-2"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <selectedModelInfo.icon className="w-20 h-20 text-heat-100" />
            <div className="text-left">
              <div className="text-label-medium text-accent-black">
                {selectedModelInfo.name}
              </div>
              {showCapabilities && selectedModelInfo.description && (
                <div className="text-body-small text-black-alpha-56 mt-2">
                  {selectedModelInfo.description}
                </div>
              )}
            </div>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-16 h-16 text-black-alpha-48" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-4 bg-white border border-border-faint rounded-8 shadow-lg z-50 overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {appConfig.ai.availableModels.map((modelId) => {
                const modelInfo = {
                  id: modelId,
                  name: appConfig.ai.modelDisplayNames[modelId] || modelId,
                  description: MODEL_DESCRIPTIONS[modelId as keyof typeof MODEL_DESCRIPTIONS],
                  icon: MODEL_ICONS[modelId as keyof typeof MODEL_ICONS] || Brain
                };

                const isSelected = modelId === selectedModel;

                return (
                  <button
                    key={modelId}
                    onClick={() => {
                      onModelChange(modelId);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full p-12 text-left transition-all border-b border-border-faint last:border-b-0",
                      "hover:bg-black-alpha-4",
                      isSelected && "bg-heat-4 border-heat-100"
                    )}
                  >
                    <div className="flex items-center gap-12">
                      <modelInfo.icon className={cn(
                        "w-20 h-20",
                        isSelected ? "text-heat-100" : "text-black-alpha-48"
                      )} />
                      <div className="flex-1">
                        <div className={cn(
                          "text-label-medium",
                          isSelected ? "text-heat-100" : "text-accent-black"
                        )}>
                          {modelInfo.name}
                        </div>
                        {showCapabilities && modelInfo.description && (
                          <div className="text-body-small text-black-alpha-56 mt-2">
                            {modelInfo.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-16 h-16 bg-heat-100 rounded-full flex items-center justify-center">
                          <div className="w-8 h-8 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}