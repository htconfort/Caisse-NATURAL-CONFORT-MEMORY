import React from 'react';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  placeholder = "Rechercher un produit..." 
}) => {
  return (
    <div className="mb-4">
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input w-full md:w-96"
      />
    </div>
  );
};
