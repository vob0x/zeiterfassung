import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { useMasterStore } from '../../stores/masterStore';
import { useEntriesStore } from '../../stores/entriesStore';
import { useI18n } from '../../i18n';
import { getUserData, setUserData } from '@/lib/userStorage';

interface ComboResult {
  stakeholder: string;
  projekt: string;
  taetigkeit: string;
  format?: string; // NEW: optional format (defaults to 'Einzelarbeit' if not selected)
  score: number;
  label: string;
}

interface FrecencyEntry {
  key: string; // stakeholder|projekt|taetigkeit|format
  count: number;
  lastUsed: number;
}

interface FuzzySearchProps {
  onSelect: (combo: { stakeholder: string; projekt: string; taetigkeit: string; format: string }) => void;
}

// Fuzzy match: does the option contain all characters of the query in order?
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact prefix match = highest score
  if (t.startsWith(q)) return 100;

  // Contains match
  if (t.includes(q)) return 80;

  // Fuzzy char-by-char
  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let prevMatch = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      consecutive = (prevMatch === ti - 1) ? consecutive + 1 : 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
      prevMatch = ti;
      qi++;
    }
  }

  if (qi < q.length) return 0; // Not all chars matched
  return 30 + maxConsecutive * 10;
}

// Multi-word fuzzy search across all dimensions
function searchCombos(
  query: string,
  stakeholders: string[],
  projects: string[],
  activities: string[],
  formats: string[],
  frecency: FrecencyEntry[]
): ComboResult[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const frecencyMap = new Map(frecency.map((f) => [f.key, f]));
  const results: ComboResult[] = [];
  const now = Date.now();

  // For each combination, check if all query words match at least one dimension
  for (const sh of stakeholders) {
    for (const pr of projects) {
      for (const act of ['', ...activities]) {
        for (const fmt of ['', ...formats]) { // NEW: iterate formats (empty = no filter)
          let totalScore = 0;
          let allWordsMatch = true;

          for (const word of words) {
            const shScore = fuzzyMatch(word, sh);
            const prScore = fuzzyMatch(word, pr);
            const actScore = act ? fuzzyMatch(word, act) : 0;
            const fmtScore = fmt ? fuzzyMatch(word, fmt) : 0; // NEW
            const bestScore = Math.max(shScore, prScore, actScore, fmtScore);

            if (bestScore === 0) {
              allWordsMatch = false;
              break;
            }
            totalScore += bestScore;
          }

          if (!allWordsMatch) continue;

          // Frecency boost
          const key = `${sh}|${pr}|${act}|${fmt}`; // NEW: include format in key
          const freq = frecencyMap.get(key);
          if (freq) {
            const recency = Math.max(0, 1 - (now - freq.lastUsed) / (14 * 24 * 60 * 60 * 1000)); // 14-day decay
            totalScore += freq.count * 5 + recency * 20;
          }

          let label = act
            ? `${sh} · ${pr} · ${act}`
            : `${sh} · ${pr}`;
          if (fmt) label += ` (${fmt})`; // NEW: show format in label

          results.push({ stakeholder: sh, projekt: pr, taetigkeit: act, format: fmt || 'Einzelarbeit', score: totalScore, label });
        }
      }
    }
  }

  // Sort by score descending, take top 8
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

const FuzzySearch: React.FC<FuzzySearchProps> = ({ onSelect }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { stakeholders, projects, activities, formats } = useMasterStore(); // NEW: add formats
  // entries store used indirectly via frecency tracking
  useEntriesStore();

  // Debounce search (100ms) — keeps UI responsive with large combo sets
  const updateDebouncedQuery = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 100);
  }, []);

  // Load frecency data
  const frecency = useMemo(() => {
    return getUserData<FrecencyEntry[]>('frecency', []);
  }, []);

  // Top frecency combos for empty-state suggestions
  const topCombos = useMemo(() => {
    const freq = getUserData<FrecencyEntry[]>('frecency', []);
    return freq
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((f) => {
        const [sh, pr, act, fmt] = f.key.split('|'); // NEW: parse format
        let label = act ? `${sh} · ${pr} · ${act}` : `${sh} · ${pr}`;
        if (fmt) label += ` (${fmt})`; // NEW: show format in label
        return { stakeholder: sh, projekt: pr, taetigkeit: act || '', format: fmt || 'Einzelarbeit', label };
      });
  }, []);

  // Search results (uses debounced query for performance)
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return searchCombos(debouncedQuery, stakeholders, projects, activities, formats, frecency); // NEW: pass formats
  }, [debouncedQuery, stakeholders, projects, activities, formats, frecency]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Global key listener: start typing anywhere to search (ghost keyboard)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if already in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Ignore modifier keys and navigation keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Only printable characters (single char keys)
      if (e.key.length === 1 && !e.repeat) {
        // Check if our container is visible (timer view is active)
        if (!containerRef.current || containerRef.current.offsetParent === null) return;
        setIsOpen(true);
        setQuery((prev) => {
          const next = prev + e.key;
          updateDebouncedQuery(next);
          return next;
        });
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [updateDebouncedQuery]);

  const handleSelect = (combo: { stakeholder: string; projekt: string; taetigkeit: string; format: string }) => {
    // Update frecency
    const key = `${combo.stakeholder}|${combo.projekt}|${combo.taetigkeit}|${combo.format}`; // NEW: include format
    const freq = getUserData<FrecencyEntry[]>('frecency', []);
    const existing = freq.find((f) => f.key === key);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = Date.now();
    } else {
      freq.push({ key, count: 1, lastUsed: Date.now() });
    }
    // Keep max 100 entries
    freq.sort((a, b) => b.count - a.count);
    setUserData('frecency', freq.slice(0, 100));

    onSelect(combo);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = results.length > 0 ? results : topCombos;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && items.length > 0) {
      e.preventDefault();
      const selected = items[selectedIndex];
      if (selected) handleSelect(selected);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const showResults = isOpen && (results.length > 0 || (query.trim() === '' && topCombos.length > 0));

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Search bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '12px',
          border: `1.5px solid ${isOpen ? 'rgba(201,169,98,0.25)' : 'var(--border)'}`,
          background: isOpen ? 'rgba(201,169,98,0.03)' : 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.25s',
        }}
      >
        <span style={{ fontSize: '14px', opacity: isOpen ? 0.8 : 0.3, transition: 'opacity 0.2s' }}>⚡</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            updateDebouncedQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('stack.searchPlaceholder')}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: 'var(--text)',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'var(--font)',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'var(--surface-solid, #1a1a2e)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          {query === '' && topCombos.length > 0 && (
            <div style={{
              padding: '6px 12px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Zap className="w-3 h-3" /> {t('stack.frequent')}
            </div>
          )}

          {/* Items */}
          {(results.length > 0 ? results : topCombos).map((item, idx) => (
            <button
              key={item.label}
              onClick={() => handleSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: idx === selectedIndex ? 'rgba(201,169,98,0.08)' : 'transparent',
                color: 'var(--text)',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: idx === selectedIndex ? 'var(--neon-cyan)' : 'var(--border)',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FuzzySearch;
