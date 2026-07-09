import React, { useState, useMemo } from 'react';
import { Terminal, Search, AlertTriangle, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';

interface MainframeConsoleProps {
  rawLog: string;
}

export const MainframeConsole: React.FC<MainframeConsoleProps> = ({ rawLog }) => {
  const [search, setSearch] = useState('');
  const [terminalColor, setTerminalColor] = useState<'green' | 'amber' | 'cyan'>('green');
  const [lineNumbers, setLineNumbers] = useState(true);

  // Split lines
  const lines = useMemo(() => {
    return rawLog.split('\n');
  }, [rawLog]);

  // Handle line highlighting and categorization
  const processedLines = useMemo(() => {
    return lines.map((line, index) => {
      const trimmed = line.trim();
      const isBoundary = trimmed.startsWith('START OF') || trimmed.startsWith('END OF') || trimmed.startsWith('*** Start') || trimmed.startsWith('*** End');
      const isError = trimmed.toUpperCase().includes('ERROR') || trimmed.toUpperCase().includes('FAIL') || trimmed.toUpperCase().includes('RC =') || trimmed.toUpperCase().includes('RC=');
      const isCommit = trimmed.toUpperCase().includes('COMMIT') || trimmed.toUpperCase().includes('COMMITED');
      
      return {
        text: line,
        index: index + 1,
        isBoundary,
        isError,
        isCommit
      };
    });
  }, [lines]);

  // Filter matched search indices
  const matchedLineIndices = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();
    return processedLines
      .filter(line => line.text.toLowerCase().includes(query))
      .map(line => line.index);
  }, [search, processedLines]);

  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const handleNextMatch = () => {
    if (matchedLineIndices.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % matchedLineIndices.length);
    scrollToLine(matchedLineIndices[(activeMatchIndex + 1) % matchedLineIndices.length]);
  };

  const handlePrevMatch = () => {
    if (matchedLineIndices.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + matchedLineIndices.length) % matchedLineIndices.length);
    scrollToLine(matchedLineIndices[(activeMatchIndex - 1 + matchedLineIndices.length) % matchedLineIndices.length]);
  };

  const scrollToLine = (lineNum: number) => {
    const el = document.getElementById(`console-line-${lineNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Color theme mapping
  const colorMap = {
    green: {
      bg: 'bg-[#0a0f0d]',
      border: 'border-[#1b3b22]',
      text: 'text-[#33ff33]',
      textLight: 'text-[#88ff88]',
      caret: 'bg-[#33ff33]',
      selection: 'selection:bg-[#1a401a]'
    },
    amber: {
      bg: 'bg-[#0f0b05]',
      border: 'border-[#3b2d15]',
      text: 'text-[#ffb000]',
      textLight: 'text-[#ffd088]',
      caret: 'bg-[#ffb000]',
      selection: 'selection:bg-[#402a00]'
    },
    cyan: {
      bg: 'bg-[#050f14]',
      border: 'border-[#15343d]',
      text: 'text-[#00e5ff]',
      textLight: 'text-[#88f5ff]',
      caret: 'bg-[#00e5ff]',
      selection: 'selection:bg-[#003840]'
    }
  };

  const currentTheme = colorMap[terminalColor];

  return (
    <div className="bg-[#14171C] border border-gray-800 rounded-lg shadow-xs overflow-hidden flex flex-col h-[650px]">
      {/* Console toolbar */}
      <div className="bg-[#1A1D23] border-b border-gray-800 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-gray-200 text-xs font-mono uppercase tracking-wider">IBM 3270 Virtual Display</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Theme Selector */}
          <div className="flex rounded border border-gray-800 overflow-hidden text-[9px] font-mono">
            <button
              onClick={() => setTerminalColor('green')}
              className={`px-2 py-1 cursor-pointer transition-all ${terminalColor === 'green' ? 'bg-[#33ff33]/15 text-[#33ff33]' : 'bg-[#0F1115] text-gray-400'}`}
            >
              P31 (GREEN)
            </button>
            <button
              onClick={() => setTerminalColor('amber')}
              className={`px-2 py-1 border-l border-gray-800 cursor-pointer transition-all ${terminalColor === 'amber' ? 'bg-[#ffb000]/15 text-[#ffb000]' : 'bg-[#0F1115] text-gray-400'}`}
            >
              P4 (AMBER)
            </button>
            <button
              onClick={() => setTerminalColor('cyan')}
              className={`px-2 py-1 border-l border-gray-800 cursor-pointer transition-all ${terminalColor === 'cyan' ? 'bg-[#00e5ff]/15 text-[#00e5ff]' : 'bg-[#0F1115] text-gray-400'}`}
            >
              P12 (CYAN)
            </button>
          </div>

          {/* Line Numbers Toggle */}
          <button
            onClick={() => setLineNumbers(!lineNumbers)}
            className={`px-2 py-1 rounded text-[9px] font-mono border cursor-pointer transition-all ${
              lineNumbers ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-[#0F1115] border-gray-800 text-gray-500'
            }`}
          >
            LN_NUMS
          </button>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
            <input
              type="text"
              placeholder="Grep raw logs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveMatchIndex(0);
              }}
              className="pl-7 pr-10 py-1 text-xs border border-gray-800 rounded bg-[#0F1115] text-gray-200 focus:outline-hidden focus:border-blue-500 w-36 font-mono"
            />
            {matchedLineIndices.length > 0 && (
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 font-mono">
                {activeMatchIndex + 1}/{matchedLineIndices.length}
              </span>
            )}
          </div>

          {/* Search navigation */}
          {matchedLineIndices.length > 0 && (
            <div className="flex rounded border border-gray-800 overflow-hidden bg-[#0F1115]">
              <button
                onClick={handlePrevMatch}
                className="p-1 hover:bg-gray-800 border-r border-gray-800 text-gray-400 cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                onClick={handleNextMatch}
                className="p-1 hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Terminal View Area */}
      <div 
        className={`flex-1 overflow-auto p-4 font-mono text-xs select-text relative leading-relaxed ${currentTheme.bg} ${currentTheme.selection}`}
        style={{ textShadow: terminalColor === 'green' ? '0 0 2px rgba(51,255,51,0.3)' : terminalColor === 'amber' ? '0 0 2px rgba(255,176,0,0.3)' : '0 0 2px rgba(0,229,255,0.3)' }}
      >
        {/* CRT Overlay Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.15)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.03),_rgba(0,255,0,0.01),_rgba(0,0,255,0.03))] bg-[length:100%_4px,_6px_100%] opacity-35"></div>

        <div className="space-y-0.5">
          {processedLines.map((line) => {
            const isMatch = matchedLineIndices.includes(line.index);
            const isActiveMatch = isMatch && matchedLineIndices[activeMatchIndex] === line.index;

            // Highlight matching text block
            const lineText = line.text;

            let textColor = currentTheme.text;
            if (line.isBoundary) {
              textColor = currentTheme.textLight;
            } else if (line.isError) {
              textColor = 'text-rose-500 font-semibold';
            } else if (line.isCommit) {
              textColor = 'text-emerald-400';
            }

            return (
              <div
                key={line.index}
                id={`console-line-${line.index}`}
                className={`flex items-start rounded-xs ${
                  isActiveMatch
                    ? 'bg-slate-750 border-y border-dashed border-slate-600'
                    : isMatch
                    ? 'bg-slate-800/40'
                    : 'hover:bg-slate-800/10'
                }`}
              >
                {/* Line number rail */}
                {lineNumbers && (
                  <span className="text-slate-600 text-right w-12 pr-4 select-none shrink-0 border-r border-slate-850/50 mr-4">
                    {String(line.index).padStart(4, '0')}
                  </span>
                )}

                {/* Line text contents */}
                <span className={`whitespace-pre flex-1 ${textColor}`}>
                  {isMatch ? (
                    <HighlightText text={lineText} query={search} />
                  ) : (
                    lineText || ' '
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Console bottom metrics */}
      <div className="bg-slate-950 border-t border-slate-850 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500 font-mono select-none">
        <div className="flex gap-4">
          <span>COBOL/JCL TRACE LOGGER</span>
          <span>ONLINE</span>
        </div>
        <div className="flex gap-3">
          <span>LINES: {lines.length}</span>
          {matchedLineIndices.length > 0 && (
            <span className="text-indigo-400">FOUND: {matchedLineIndices.length}</span>
          )}
        </div>
      </div>
    </div>
  );
};

/* Helper subcomponent to highlight matching text queries */
const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-400 text-slate-950 px-0.5 rounded-xs font-bold shadow-xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};
