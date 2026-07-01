import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { LOCATIONS } from '../constants/locationConstants';

export default function LocationSelector({ selectedLocationId, onChange, activeTheme = {}, customTrigger = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const selectedLocation = LOCATIONS.find(loc => loc.id === selectedLocationId) || LOCATIONS[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (locId) => {
    onChange(locId);
    setIsOpen(false);
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {customTrigger ? (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors group outline-none cursor-pointer border-none bg-transparent"
        >
          <span className="text-xs">{selectedLocation.icon}</span>
          <span className="text-sm font-medium text-white">{selectedLocation.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-200 group outline-none cursor-pointer"
        >
          <span className="text-sm">{selectedLocation.icon}</span>
          <span className="text-sm font-medium text-white">{selectedLocation.name}</span>
          <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02]">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Select Region</span>
          </div>
          <div className="p-2 max-h-[300px] overflow-y-auto hide-scrollbar">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelect(loc.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors text-left outline-none cursor-pointer border-none ${
                  loc.id === selectedLocationId 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-ink-muted bg-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{loc.icon}</span>
                  <span>{loc.name}</span>
                </span>
                {loc.id === selectedLocationId && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
