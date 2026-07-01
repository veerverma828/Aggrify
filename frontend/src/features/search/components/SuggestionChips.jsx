import React from 'react';

const SUGGESTIONS = [
  'amul butter',
  'milk',
  'lays',
  'coca cola',
  'paneer',
  'surf excel',
  'maggi',
  'bread',
  'eggs',
  'onion'
];

export default function SuggestionChips({ onChipClick, variant = 'home' }) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto hide-scrollbar ${variant === 'home' ? 'justify-center max-w-4xl mx-auto flex-wrap' : 'max-w-full'}`}>
      {SUGGESTIONS.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onChipClick(suggestion)}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border border-white/10 bg-white/5 text-ink-muted hover:text-white hover:bg-white/10 hover:border-white/20`}
        >
          {variant === 'home' && <span className="text-white/30 text-xs">#</span>}
          {suggestion}
        </button>
      ))}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
