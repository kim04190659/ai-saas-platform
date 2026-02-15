'use client';

import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const filters = ['Users', 'Messages', 'Files', 'All'];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', query, 'Filters:', selectedFilters);
    // Implement actual search logic here
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, messages, files..."
            className="w-full pl-12 pr-24 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} className="text-gray-400" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isFilterOpen || selectedFilters.length > 0
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Filter Dropdown */}
        {isFilterOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Filter by type
            </h3>
            <div className="space-y-2">
              {filters.map((filter) => (
                <label
                  key={filter}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedFilters.includes(filter)}
                    onChange={() => toggleFilter(filter)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{filter}</span>
                </label>
              ))}
            </div>
            {selectedFilters.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFilters([])}
                className="mt-3 w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </form>

      {/* Selected Filters Display */}
      {selectedFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedFilters.map((filter) => (
            <span
              key={filter}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {filter}
              <button
                type="button"
                onClick={() => toggleFilter(filter)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
