import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check, ChevronDown, Search } from 'lucide-react';
import { LOCATIONS } from '../constants/locationConstants';

export default function LocationSelector({ selectedLocationId, onChange, customTrigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const currentLocation = LOCATIONS.find(loc => loc.id === selectedLocationId) || LOCATIONS[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (locId) => {
    onChange(locId);
    setIsOpen(false);
  };

  const filteredLocations = LOCATIONS.filter((loc) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      loc.name.toLowerCase().includes(query) ||
      loc.locality.toLowerCase().includes(query) ||
      loc.city.toLowerCase().includes(query) ||
      loc.pincode.toLowerCase().includes(query) ||
      loc.state.toLowerCase().includes(query)
    );
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="location-selector-container">
      {customTrigger ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="uppercase tracking-widest font-mono text-[10px] cursor-pointer font-bold border-none bg-transparent outline-none flex flex-row items-center gap-1"
        >
          {currentLocation.name}
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          id="location-selector-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/85 transition-all duration-200 text-xs text-zinc-350 hover:text-white font-extrabold shadow-inner"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-500 animate-pulse stroke-[2.5]" />
          <span className="max-w-[120px] truncate">{currentLocation.name} ({currentLocation.locality})</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && (
        <div
          id="location-dropdown"
          className={customTrigger 
            ? "absolute right-0 mt-2 w-64 border border-ink-faint bg-bg shadow-xl p-2 z-50"
            : "absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.7)] p-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200"}
        >
          <div className="px-3 py-2 border-b border-ink-faint mb-1.5 flex flex-col space-y-2">
            <span className={customTrigger ? "text-[9px] font-bold font-mono uppercase tracking-widest opacity-50" : "text-[9px] font-black uppercase tracking-widest text-zinc-550"}>Select Delivery Location</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location..."
                className={customTrigger 
                  ? "w-full pl-8 pr-3 py-1.5 bg-ink-faint border-none outline-none text-ink text-xs font-sans"
                  : "w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"}
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => {
                const isSelected = loc.id === selectedLocationId;
                return (
                  <button
                    key={loc.id}
                    id={`loc-option-${loc.id}`}
                    type="button"
                    onClick={() => handleSelect(loc.id)}
                    className={customTrigger 
                      ? `w-full flex items-center justify-between text-left px-3 py-2 transition-colors cursor-pointer border-none outline-none text-ink ${isSelected ? 'bg-ink-faint font-bold' : 'hover:bg-ink-faint bg-transparent opacity-70 hover:opacity-100'}`
                      : `w-full flex items-center justify-between text-left px-3 py-2 rounded-xl transition-all duration-150 group ${
                      isSelected
                        ? 'bg-zinc-900 text-white font-bold border border-zinc-800'
                        : 'hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <span className="text-sm mt-0.5" role="img" aria-label={loc.name}>
                        {loc.icon}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-tight group-hover:text-white">
                          {loc.name}
                        </span>
                        <span className="text-[10px] opacity-60 leading-normal">
                          {loc.locality}, {loc.pincode}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs opacity-50">
                No locations match your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
