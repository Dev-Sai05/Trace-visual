import React from 'react';
import { PRESET_SAMPLES, PresetSample } from './SampleLogs';
import { Play, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface SampleLoaderProps {
  onLoadSample: (sample: PresetSample) => void;
  selectedId: string | null;
}

export const SampleLoader: React.FC<SampleLoaderProps> = ({ onLoadSample, selectedId }) => {
  return (
    <div className="bg-[#1A1D23] border border-gray-800 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">Mainframe Trace Presets</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Select a preset scenario to instantly populate the trace analyzer with realistic COBOL batch log traces.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESET_SAMPLES.map((sample) => {
          const isSelected = selectedId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => onLoadSample(sample)}
              className={`text-left p-3.5 rounded border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500/80 bg-blue-500/10 text-blue-200 ring-1 ring-blue-500/20 shadow-xs'
                  : 'border-gray-800 hover:border-gray-700 hover:bg-[#1C2026] bg-[#14171C]'
              }`}
            >
              <div className="w-full">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-bold text-xs text-gray-200 leading-snug font-mono">
                    {sample.title}
                  </span>
                  {sample.expectedRc === 0 ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm bg-green-500/10 text-green-400 border border-green-500/20 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> RC 00
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border shrink-0 ${
                      sample.expectedRc === 12
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      <AlertCircle className="w-2.5 h-2.5" /> RC {String(sample.expectedRc).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2 mb-3 leading-relaxed font-sans">
                  {sample.description}
                </p>
              </div>

              <div className={`flex items-center gap-1 text-[11px] font-mono font-semibold mt-auto ${
                isSelected ? 'text-blue-300' : 'text-blue-400 group-hover:text-blue-300'
              }`}>
                <Play className="w-3 h-3 fill-current" />
                LOAD SCENARIO
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
