// components/AutocompleteInput.jsx
import React, { useState, useEffect, useRef } from 'react';

const AutocompleteInput = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  className = '',
  onSelect 
}) => {
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value.length >= 2) {
      const filtered = options.filter(opt =>
        opt.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered.slice(0, 8)); // máximo 8 sugerencias
      setShowDropdown(filtered.length > 0);
    } else {
      setShowDropdown(false);
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue) => {
    onChange(selectedValue);
    setShowDropdown(false);
    if (onSelect) onSelect(selectedValue);
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showDropdown && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredOptions.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(opt)}
              className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-white text-sm border-b border-slate-700 last:border-0"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;

