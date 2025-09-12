"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";

interface AppDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  isGenerating?: boolean;
}

const APP_SUGGESTIONS = [
  "Build a note-taking app with rich text editing",
  "Create a todo list with priority levels",
  "Make a weather app with 5-day forecast",
  "Build a calculator with history",
  "Create a blog platform with categories",
  "Make a portfolio website with projects",
  "Build an e-commerce product catalog",
  "Create an analytics dashboard with charts"
];

export default function AppDescriptionInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Describe the app you want to build...",
  className = "",
  isGenerating = false
}: AppDescriptionInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
    
    // Show suggestions when focused and empty
    if (isFocused && !value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [value, isFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isGenerating) {
        onSubmit();
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className={`max-w-552 mx-auto w-full relative z-[11] rounded-20 ${className}`}>
      <div className="relative">
        <label className="p-16 flex gap-8 items-start w-full relative border-b border-black-alpha-5">
          <div className="mt-2 flex-shrink-0">
            {/* App/Code icon */}
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-40"
            >
              <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 8L9 10L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-body-input text-accent-black placeholder:text-black-alpha-48 resize-none outline-none min-h-[24px] leading-6"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow suggestion clicks
            rows={1}
            disabled={isGenerating}
            style={{
              height: 'auto',
              overflow: 'hidden'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        </label>

        <div className="p-10 flex justify-end items-center relative">
          <button
            onClick={onSubmit}
            disabled={!value.trim() || isGenerating}
            className={`
              button relative rounded-10 px-8 py-8 text-label-medium font-medium
              flex items-center justify-center gap-6
              ${value.trim() && !isGenerating
                ? 'button-primary text-accent-white active:scale-[0.995]' 
                : 'bg-black-alpha-4 text-black-alpha-24 cursor-not-allowed'
              }
            `}
          >
            {value.trim() && !isGenerating && <div className="button-background absolute inset-0 rounded-10 pointer-events-none" />}
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="px-6 relative">Generating...</span>
              </>
            ) : value.trim() ? (
              <>
                <span className="px-6 relative">Build App</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.5 3.5L13 8L8.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            ) : (
              <div className="w-60 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.5 3.5L13 8L8.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* App suggestions */}
      {showSuggestions && (
        <div className="mt-16 bg-white rounded-12 border border-black-alpha-8 shadow-lg p-12 max-h-64 overflow-y-auto">
          <div className="text-sm text-black-alpha-64 mb-8 font-medium">Try these examples:</div>
          <div className="space-y-2">
            {APP_SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-8 rounded-8 hover:bg-black-alpha-4 text-sm text-black-alpha-80 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes suggestionSlideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .suggestion-animation {
          animation: suggestionSlideDown 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
