"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Briefcase } from "lucide-react";
import { JOB_TITLES, searchJobTitles, isValidJobTitle } from "@/constants/jobTitles";

interface GoalSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * GoalSelector - Searchable Combobox for Job Title Selection
 * 
 * Features:
 * - Strict validation: only allows selection from predefined list
 * - Search/filter functionality
 * - Keyboard navigation
 * - Clear button
 */
export function GoalSelector({ value, onChange, error }: GoalSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter job titles based on search
  const filteredTitles = searchJobTitles(search);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search to selected value
        if (value && isValidJobTitle(value)) {
          setSearch("");
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (title: string) => {
    onChange(title);
    setSearch("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredTitles.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredTitles[highlightedIndex]) {
          handleSelect(filteredTitles[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  const displayValue = isOpen ? search : value;

  return (
    <div ref={containerRef} className="relative">
      {/* Input Container */}
      <div
        className={`relative flex items-center gap-2 px-4 py-3.5 bg-white border-2 rounded-xl transition-all cursor-text ${
          isOpen
            ? "border-indigo-500 ring-4 ring-indigo-500/10"
            : error
              ? "border-red-300"
              : value
                ? "border-indigo-200 bg-indigo-50/30"
                : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 ${value ? "text-indigo-600" : "text-slate-400"}`}>
          {isOpen ? (
            <Search className="w-5 h-5" />
          ) : (
            <Briefcase className="w-5 h-5" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="What is your target role?"
          className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
        />

        {/* Clear / Chevron */}
        {value && !isOpen ? (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown List */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto"
          style={{
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          }}
        >
          {filteredTitles.length === 0 ? (
            <li className="px-4 py-3 text-slate-500 text-sm text-center">
              No matching roles found
            </li>
          ) : (
            filteredTitles.map((title, index) => {
              const isHighlighted = index === highlightedIndex;
              const isSelected = title === value;
              
              // Categorize for visual grouping
              const isCategory = [
                "General Application",
                "Student / Intern",
                "Career Change",
                "Entry Level Position",
                "Senior / Leadership Role",
              ].includes(title);

              return (
                <li
                  key={`${title}-${index}`}
                  onClick={() => handleSelect(title)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center gap-3 ${
                    isHighlighted
                      ? "bg-indigo-50"
                      : isSelected
                        ? "bg-slate-50"
                        : "hover:bg-slate-50"
                  } ${isCategory ? "font-medium text-indigo-700 bg-indigo-50/50" : "text-slate-700"}`}
                >
                  {isCategory && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  )}
                  <span className={isCategory ? "" : "pl-5"}>{title}</span>
                  {isSelected && (
                    <span className="ml-auto text-indigo-600 text-sm">✓</span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
