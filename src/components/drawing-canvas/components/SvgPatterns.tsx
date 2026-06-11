import React from 'react';

export default function SvgPatterns() {
  return (
    <defs>
      <pattern
        id="striped-amber-pattern"
        width="10"
        height="10"
        patternTransform="rotate(45 0 0)"
        patternUnits="userSpaceOnUse"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="10"
          stroke="#f59e0b"
          strokeWidth="2"
          className="opacity-30"
        />
      </pattern>
      <pattern
        id="building-diagonal-pattern"
        width="8"
        height="8"
        patternTransform="rotate(45 0 0)"
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="1.5" />
      </pattern>
      <pattern
        id="striped-emerald-pattern"
        width="12"
        height="12"
        patternTransform="rotate(45 0 0)"
        patternUnits="userSpaceOnUse"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="12"
          stroke="#10b981"
          strokeWidth="1.5"
          className="opacity-20"
        />
      </pattern>
      <pattern
        id="striped-red-pattern"
        width="12"
        height="12"
        patternTransform="rotate(45 0 0)"
        patternUnits="userSpaceOnUse"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="12"
          stroke="#dc2626"
          strokeWidth="2"
          className="opacity-25"
        />
      </pattern>
    </defs>
  );
}
