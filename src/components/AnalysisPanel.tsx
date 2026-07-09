import React, { useState } from 'react';
import { AIAnalysisReport } from '../types';
import { 
  Terminal, 
  CheckCircle, 
  XCircle, 
  AlertOctagon, 
  Code, 
  Copy, 
  Check, 
  HelpCircle, 
  Layers, 
  Activity, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface AnalysisPanelProps {
  report: AIAnalysisReport | null;
  isLoading: boolean;
  onRunAnalysis: () => void;
  errorMsg: string | null;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  report,
  isLoading,
  onRunAnalysis,
  errorMsg
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'code' | 'modules'>('diagnostics');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-[#1A1D23] border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center h-[650px]">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-14 h-14 border-4 border-gray-800 border-t-blue-500 rounded-full animate-spin"></div>
          <Code className="w-5 h-5 text-blue-400 absolute animate-pulse" />
        </div>
        <h3 className="font-bold text-gray-100 text-sm uppercase tracking-wider mb-2">Analyzing Mainframe Trace Log...</h3>
        <p className="text-xs text-gray-400 text-center max-w-xs leading-relaxed font-sans">
          Gemini is parsing the paragraph states, mapping SQL/file handlers, decoding system error flags, and formulating COBOL code corrections.
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-[#1A1D23] border border-red-500/30 rounded-lg p-8 flex flex-col items-center justify-center h-[650px]">
        <AlertOctagon className="w-12 h-12 text-red-400 mb-4 animate-bounce" />
        <h3 className="font-bold text-red-400 text-sm uppercase tracking-wider mb-2">Analysis Failed</h3>
        <p className="text-xs text-red-300 text-center max-w-sm mb-6 bg-red-500/10 p-4 border border-red-500/20 rounded font-mono">
          {errorMsg}
        </p>
        <button
          onClick={onRunAnalysis}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded transition-all"
        >
          Retry AI Analysis
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-[#1A1D23] border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center h-[650px] text-center">
        <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded flex items-center justify-center mb-5 mx-auto">
          <Terminal className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-gray-100 text-sm uppercase tracking-wider mb-2">Request Server-Side AI Diagnostics</h3>
        <p className="text-xs text-gray-400 max-w-xs mb-6 mx-auto leading-relaxed">
          Submit the parsed trace log to a secure, server-side Gemini intelligence engine to unlock deep SQLCODE diagnostics, module role mappings, and precise COBOL remediation code recommendations.
        </p>
        <button
          onClick={onRunAnalysis}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <Code className="w-3.5 h-3.5" />
          RUN GEMINI DEEP DIAGNOSTICS
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#14171C] border border-gray-800 rounded-lg shadow-xs overflow-hidden flex flex-col h-[650px]">
      {/* Tab Selectors */}
      <div className="bg-[#1A1D23] border-b border-gray-800 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex rounded bg-[#0F1115] p-1 self-start border border-gray-800/60">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'diagnostics'
                ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Remediation Fix
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'modules'
                ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Modules
          </button>
        </div>

        {/* Quick status banner */}
        <div className="flex items-center gap-1.5 self-end">
          {report.success ? (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              <CheckCircle className="w-3 h-3 text-green-400" /> STATUS: RC_00 (SUCCESS)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">
              <XCircle className="w-3 h-3 text-red-400" /> STATUS: RC_12 (EXCEPTION)
            </span>
          )}
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-4 overflow-y-auto flex-1 space-y-5">
        {activeTab === 'diagnostics' && (
          <div className="space-y-5">
            {/* Overview summary */}
            <div className="bg-[#1A1D23] border border-gray-800 rounded p-4">
              <h4 className="text-xs font-bold text-gray-200 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Execution Summary
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {report.summary}
              </p>
            </div>

            {/* Error Diagnostics Box */}
            {report.errorExplanation ? (
              <div className="border border-red-500/25 bg-red-950/10 rounded p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                    <AlertOctagon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">Decoded Error Diagnostics</h4>
                    <p className="text-[11px] text-red-300 font-mono mt-1">
                      Raw Marker: &quot;{report.errorExplanation.rawError}&quot;
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#0A0C10] border border-gray-800 rounded p-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-400 font-mono block mb-1">Decoded Meaning</span>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {report.errorExplanation.decodedMeaning}
                    </p>
                  </div>

                  <div className="bg-[#0A0C10] border border-gray-800 rounded p-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-400 font-mono block mb-1">Probable Root Cause</span>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {report.errorExplanation.probableCause}
                    </p>
                  </div>
                </div>

                {/* Steps to resolve */}
                <div className="bg-[#0A0C10] border border-gray-800 rounded p-3.5">
                  <span className="text-xs font-bold font-mono text-gray-300 uppercase tracking-wider block mb-3">
                    Actionable Reconciliation Steps
                  </span>
                  <ol className="space-y-2.5">
                    {report.errorExplanation.reconciliationSteps.map((step, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-gray-300">
                        <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold font-mono shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed font-sans">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <div className="border border-green-500/20 bg-green-500/5 rounded p-5 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mb-2.5" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-green-400 font-mono">Pristine Execution Diagnostics</h4>
                <p className="text-xs text-gray-300 max-w-xs mt-1.5 leading-relaxed font-sans">
                  No critical faults or terminal system error markers detected. The transaction committed safely and clean database closures were executed.
                </p>
              </div>
            )}

            {/* Metrics Dashboard */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2.5 font-mono">Execution Metrics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#1A1D23] border border-gray-800 rounded p-3 text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">Errors / Faults</span>
                  <p className="text-lg font-bold font-mono text-red-400 mt-1">{report.metrics.totalErrors}</p>
                </div>
                <div className="bg-[#1A1D23] border border-gray-800 rounded p-3 text-center flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">DB Commit</span>
                  <p className={`text-[10px] font-mono font-bold mt-1.5 inline-block mx-auto px-2 py-0.5 rounded ${
                    report.metrics.dbCommitPerformed 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {report.metrics.dbCommitPerformed ? 'PERFORMED' : 'NONE'}
                  </p>
                </div>
                <div className="bg-[#1A1D23] border border-gray-800 rounded p-3 text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">DB I/O Calls</span>
                  <p className="text-lg font-bold font-mono text-blue-400 mt-1">{report.metrics.dbioOperationsCount}</p>
                </div>
                <div className="bg-[#1A1D23] border border-gray-800 rounded p-3 text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">Records Read</span>
                  <p className="text-lg font-bold font-mono text-gray-200 mt-1">{report.metrics.totalRecordsProcessed || 'EOF'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="space-y-5">
            {report.cobolCodeRecommendation ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Code className="w-4.5 h-4.5 text-blue-400" />
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider font-mono">Recommended Code Fix</h4>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3.5 flex gap-3">
                  <HelpCircle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-300 font-mono">
                      Paragraph Affected: {report.cobolCodeRecommendation.paragraph}
                    </h5>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed font-sans">
                      <strong>Problem Concept:</strong> {report.cobolCodeRecommendation.originalConcept}
                    </p>
                  </div>
                </div>

                {/* Code Block Terminal */}
                <div className="rounded border border-gray-800 overflow-hidden shadow-lg">
                  {/* editor header */}
                  <div className="bg-[#1A1D23] border-b border-gray-800 px-3.5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                      <span className="text-[10px] text-gray-400 font-mono ml-2">GL1199.CBL (Area B Spacing)</span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(report.cobolCodeRecommendation!.fixedSnippet)}
                      className="text-gray-300 hover:text-white transition-colors px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-1 text-[10px] font-bold font-mono"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          COPIED
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          COPY CODE
                        </>
                      )}
                    </button>
                  </div>

                  {/* Editor body */}
                  <div className="bg-[#0A0C10] p-4 overflow-x-auto text-[11px] font-mono leading-relaxed text-emerald-400 h-64 select-text">
                    <pre>{report.cobolCodeRecommendation.fixedSnippet}</pre>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-[#1A1D23] border border-gray-800 rounded p-4">
                  <h5 className="text-xs font-bold text-gray-200 mb-2 uppercase tracking-wider font-mono">Technical Implementation Details</h5>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {report.cobolCodeRecommendation.explanation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-10 h-10 text-green-500 mb-3 mx-auto" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-green-400 font-mono">No Code Corrections Required</h4>
                <p className="text-xs text-gray-300 max-w-xs mx-auto mt-1.5 leading-relaxed font-sans">
                  The logs confirm this trace ran successfully. There are no COBOL source-level exceptions or SQLCODE exceptions to repair.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4.5 h-4.5 text-blue-400" />
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider font-mono">Trace Module Inventory</h4>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              The following mainframe modules, JCL jobs, or subroutines were identified as participating in the transaction execution block:
            </p>

            <div className="space-y-3 pt-1">
              {report.moduleBreakdown.map((mod, idx) => (
                <div key={idx} className="bg-[#1A1D23] border border-gray-800 hover:border-blue-500/40 rounded p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-200 bg-[#0F1115] border border-gray-800 rounded px-2 py-0.5">
                        {mod.moduleName}
                      </span>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">
                        {mod.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed pt-1 font-sans">
                      {mod.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-gray-600 hidden sm:block">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
