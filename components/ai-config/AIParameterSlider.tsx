"use client";

import { useState } from 'react';
import { Slider } from '@/components/ui/shadcn/slider';
import { cn } from '@/utils/cn';

interface AIParameterSliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  formatValue?: (value: number) => string;
}

export function AIParameterSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  className,
  formatValue = (v) => v.toString()
}: AIParameterSliderProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={cn("space-y-8", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <label className="text-label-medium text-accent-black font-medium">
            {label}
          </label>
          <p className={cn(
            "text-body-small text-black-alpha-56 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-70"
          )}>
            {description}
          </p>
        </div>
        <div className="text-label-large text-heat-100 font-medium min-w-16 text-right">
          {formatValue(value)}
        </div>
      </div>
      
      <div className="relative">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            "transition-opacity duration-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        
        {/* Visual range indicators */}
        <div className="flex justify-between mt-4 text-body-small text-black-alpha-40">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      </div>
    </div>
  );
}