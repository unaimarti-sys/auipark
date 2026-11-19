import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import api from '../../services/api.js';

/**
 * Buscador de direcciones con OpenStreetMap (Nominatim). Busca al pulsar «Buscar» o Intro,
 * no en cada tecla, para respetar la política de uso de Nominatim.
 */
export default function SearchBox({ onPick, autoFocus = false, placeholder = 'Ciudad, dirección o lugar…' }) {
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pick = (result) => {
    setValue(result.name);
    setOpen(false);
    setResults([]);
    onPick?.(result);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = value.trim();
    if (text.length < 3) {
      setError('Escribe al menos 3 caracteres');
      setOpen(true);
      return;
    }
    setSearching(true);
    setError(null);
    setOpen(true);
    try {
      const data = await api.get(`/geo/search?q=${encodeURIComponent(text)}`);
      const list = data.results || [];
      if (list.length === 1) pick(list[0]);
      else setResults(list);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="search-box" ref={boxRef}>
      <form onSubmit={handleSubmit} className="search-box__form" role="search">
        <Search size={18} className="search-box__icon" aria-hidden="true" />
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Buscar ubicación"
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {value && (
          <button
            type="button"
            className="search-box__clear"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              setValue('');
              setResults([]);
              setError(null);
              onPick?.(null);
            }}
          >
            <X size={16} />
          </button>
        )}
        <button type="submit" className="btn btn--primary search-box__btn" disabled={searching}>
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {open && (searching || error || results.length > 0) && (
        <ul className="search-box__suggestions" role="listbox">
          {searching && <li className="search-box__hint">Buscando en OpenStreetMap…</li>}
          {!searching && error && <li className="search-box__hint">{error}</li>}
          {!searching && !error && results.length === 0 && <li className="search-box__hint">Sin resultados</li>}
          {results.map((item, index) => (
            <li key={`${item.lat}-${item.lon}-${index}`}>
              <button type="button" onClick={() => pick(item)}>
                <MapPin size={15} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.formatted}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
