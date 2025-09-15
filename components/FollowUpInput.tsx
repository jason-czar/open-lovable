import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FollowUpInputProps {
  onSubmit: (instruction: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
  className?: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "Make the header background blue",
  "Add a search bar to the navigation",
  "Change the button style to rounded",
  "Fix the mobile responsive layout",
  "Add hover effects to the cards",
  "Change the color scheme to dark mode",
  "Add animations to the hero section",
  "Improve the typography spacing"
];

export default function FollowUpInput({
  onSubmit,
  isProcessing = false,
  placeholder = "Describe what you'd like to change or improve...",
  className,
  suggestions = DEFAULT_SUGGESTIONS
}: FollowUpInputProps) {
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isProcessing) {
      onSubmit(value.trim());
      setValue('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-sm">
        {/* Input area */}
        <div className="p-16 flex gap-12 items-start">
          <div className="mt-2 flex-shrink-0">
            <Wand2 className="w-20 h-20 text-heat-100" />
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (!value.trim()) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={placeholder}
            disabled={isProcessing}
            className="flex-1 bg-transparent text-body-medium text-accent-black placeholder:text-black-alpha-48 resize-none outline-none min-h-[24px] leading-6"
            rows={1}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Action bar */}
        <div className="px-16 pb-12 flex justify-between items-center">
          <div className="text-body-small text-black-alpha-48">
            {isFocused ? 'Press Enter to send, Shift+Enter for new line' : 'Click to add refinement instructions'}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isProcessing}
            className={cn(
              "flex items-center gap-6 px-12 py-6 rounded-8 text-label-small font-medium transition-all",
              value.trim() && !isProcessing
                ? "bg-heat-100 text-white hover:bg-heat-200 active:scale-[0.98]"
                : "bg-black-alpha-4 text-black-alpha-32 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <>
                <div className="w-14 h-14 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-14 h-14" />
                Refine
              </>
            )}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-8 bg-white border border-border-faint rounded-12 shadow-lg z-50 overflow-hidden"
          >
            <div className="p-12">
              <div className="flex items-center gap-8 mb-12">
                <Sparkles className="w-16 h-16 text-heat-100" />
                <div className="text-label-small text-black-alpha-64 font-medium">
                  Quick suggestions:
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-8 rounded-8 hover:bg-heat-4 text-body-small text-black-alpha-72 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}