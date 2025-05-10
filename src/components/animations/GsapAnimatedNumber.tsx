// src/components/animations/GsapAnimatedNumber.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';

interface GsapAnimatedNumberProps {
  value: number;
  duration?: number;
  precision?: number;
  className?: string;
}

const GsapAnimatedNumber: React.FC<GsapAnimatedNumberProps> = ({
  value,
  duration = 0.5,
  precision = 2,
  className,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const anmValue = useRef({ val: 0 });

  useEffect(() => {
    anmValue.current.val = parseFloat(spanRef.current?.textContent || '0');
    gsap.to(anmValue.current, {
      val: value,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (spanRef.current) {
          spanRef.current.textContent = anmValue.current.val.toFixed(precision);
        }
      },
    });
  }, [value, duration, precision]);

  return (
    <span ref={spanRef} className={cn(className)}>
      {value.toFixed(precision)}
    </span>
  );
};

export default GsapAnimatedNumber;
