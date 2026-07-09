import React, { useState, useEffect } from 'react';
import { LogNode } from '../types';
import { 
  Database, 
  Settings2, 
  Terminal, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  PlayCircle, 
  Clock, 
  Layers, 
  ArrowRight,
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';

export interface PipelineStep {
  id: string;
  phase: string;
  title: string;
  paragraph: string;
  status: 'success' | 'failed' | 'skipped' | 'active';
  duration: string;
  recordsProcessed?: number;
  description: string;
  details: {
    program: string;
    sqlcode?: string;
    dataset?: string;
    registers: string;
    diagnostics: string;
  };
}

interface PipelineViewProps {
  rawLog: string;
  parsedTree: LogNode | null;
  onFilterLog?: (searchTerm: string) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ rawLog, parsedTree, onFilterLog }) => {
  const [selectedStepId, setSelectedStepId] = useState<string>('p1');
  const [steps, setSteps] = useState<PipelineStep[]>([]);

  // Calculate transaction states dynamically based on raw logs
  useEffect(() => {
    if (!rawLog) {
      setSteps([]);
      return;
    }

    const logUpper = rawLog.toUpperCase();
    
    // Parse dataset names if present
    const datasetMatch = rawLog.match(/SYS1\.PROD\.[A-Z0-9.]+/i);
    const activeDataset = datasetMatch ? datasetMatch[0] : 'SYS1.PROD.GL.CONTROL';

    // 1. Diagnose DB Logon Status
    const hasLogonSuccess = logUpper.includes('DB LOGON SUCCESSFULLY') || logUpper.includes('GOOD DB SIGNOFF');
    const hasLogonFailed = logUpper.includes('DB LOGON FAILED') || logUpper.includes('FILE STATUS = 35');
    const logonStatus = hasLogonFailed ? 'failed' : hasLogonSuccess ? 'success' : 'skipped';

    // 2. Diagnose Prep/Shared Memory Status
    const hasPrepSuccess = logUpper.includes('UT0008') && !hasLogonFailed;
    const hasPrepFailed = hasLogonFailed && logUpper.includes('UT8500');
    const prepStatus = hasPrepFailed ? 'failed' : hasPrepSuccess ? 'success' : 'skipped';

    // 3. Diagnose DB Declare Status
    const hasDeclareSuccess = logUpper.includes('DECLARE-GLDM') || logUpper.includes('OPEN-GLDM');
    const declareStatus = hasLogonFailed ? 'skipped' : hasDeclareSuccess ? 'success' : 'skipped';

    // 4. Diagnose Batch Process Status
    const hasProcessError = logUpper.includes('CURSOR FETCH ERROR') || logUpper.includes('SQLCODE: -140') || logUpper.includes('SQLCODE -140') || logUpper.includes('RC = 12');
    const hasProcessSuccess = logUpper.includes('EOF REACHED SUCCESSFULLY') || logUpper.includes('RC = 00') || logUpper.includes('RC = 0') || (logUpper.includes('E100-FETCH-GLDM') && !hasProcessError);
    const processStatus = hasLogonFailed ? 'skipped' : hasProcessError ? 'failed' : hasProcessSuccess ? 'success' : 'skipped';

    // Count records processed
    let recordsCount = 0;
    if (logUpper.includes('PROCESSED RECORD')) {
      const matches = rawLog.match(/RECORD\s+(\d+)/gi);
      recordsCount = matches ? matches.length : 4;
    } else if (logUpper.includes('CURSOR FETCH ERROR')) {
      recordsCount = 140; // Default sample size for cursor fetch error log
    }

    // 5. Diagnose Commit Status
    const hasCommitPerformed = logUpper.includes('COMMIT') || logUpper.includes('COMMITED') || logUpper.includes('UTCMMT');
    const commitStatus = (hasLogonFailed || hasProcessError) ? 'skipped' : hasCommitPerformed ? 'success' : 'skipped';

    // 6. Diagnose Signoff Return Code Status
    const rcMatch = rawLog.match(/RC\s*=\s*(\d+)/i);
    const rcVal = rcMatch ? parseInt(rcMatch[1], 10) : (hasProcessError ? 12 : hasLogonFailed ? 8 : 0);
    const signoffStatus = rcVal === 0 ? 'success' : 'failed';

    const pipelineSteps: PipelineStep[] = [
      {
        id: 'p1',
        phase: 'PHASE_01',
        title: 'DB Connection Logon',
        paragraph: 'A100-DBIO-LOGON',
        status: logonStatus,
        duration: logonStatus === 'skipped' ? '0ms' : '110ms',
        description: 'Authenticates application runtime privileges and maps underlying table schemas.',
        details: {
          program: 'UT8500 / GL1199',
          registers: 'SYS-REG: 0x011A | ADDR_PTR: 0x3FC200',
          diagnostics: logonStatus === 'failed' 
            ? 'CRITICAL: DB Logon aborted because a physical control file or connection segment is inaccessible.'
            : 'STATUS RC_00: Handshake verified. Table space GLDM linked cleanly.'
        }
      },
      {
        id: 'p2',
        phase: 'PHASE_02',
        title: 'Shared Memory & Prep',
        paragraph: 'UT0008-INIT-SHMEM',
        status: prepStatus,
        duration: prepStatus === 'skipped' ? '0ms' : '430ms',
        description: 'Initializes global shared memory segments and retrieves execution parameters.',
        details: {
          program: 'UT0008 / IOMISC',
          dataset: activeDataset,
          registers: 'SHM_KEY: 0x543F0001 | ADDR_MEM: 0x4B3A80',
          diagnostics: prepStatus === 'failed'
            ? `EXCEPTION: FILE STATUS = 35. Mainframe failed to locate dataset index: "${activeDataset}".`
            : 'STATUS RC_00: Regional memory blocks initialized and control addresses registered.'
        }
      },
      {
        id: 'p3',
        phase: 'PHASE_03',
        title: 'Cursor Declaration',
        paragraph: 'C100-DECLARE-GLDM',
        status: declareStatus,
        duration: declareStatus === 'skipped' ? '0ms' : '40ms',
        description: 'Declares SQL cursor mappings and prepares query execution trees.',
        details: {
          program: 'DBIODIST',
          sqlcode: '0',
          registers: 'SQL_CURS_GLDM: OPEN | ROWS_SET: ALL',
          diagnostics: declareStatus === 'skipped'
            ? 'BYPASSED: Cursor declaration skipped because logon or memory registration failed.'
            : 'STATUS RC_00: SQL query compilation complete. Dynamic cursor structure allocated.'
        }
      },
      {
        id: 'p4',
        phase: 'PHASE_04',
        title: 'Batch Ledger Loop',
        paragraph: 'E100-FETCH-GLDM',
        status: processStatus,
        duration: processStatus === 'skipped' ? '0ms' : hasProcessError ? '850ms' : '1200ms',
        recordsProcessed: recordsCount,
        description: 'Sequential iteration of ledger transactions, applying mapping algorithms.',
        details: {
          program: 'GL1199 (Mainline)',
          sqlcode: hasProcessError ? '-140' : '000',
          registers: `REC_COUNT: ${recordsCount} | EOF_FLAG: ${hasProcessError ? 'N' : 'Y'}`,
          diagnostics: hasProcessError
            ? 'FATAL EXCEPTION: CURSOR FETCH ERROR (SQLCODE -140). The fetch request was denied due to an invalid cursor state or active transaction lock.'
            : `STATUS RC_00: Fetched and parsed all ${recordsCount} active ledger rows successfully.`
        }
      },
      {
        id: 'p5',
        phase: 'PHASE_05',
        title: 'SQL Commit Sequence',
        paragraph: 'Z100-SQL-COMMIT',
        status: commitStatus,
        duration: commitStatus === 'skipped' ? '0ms' : '340ms',
        description: 'Commits all pending database updates and releases page/row level locking.',
        details: {
          program: 'UTCMMT / IOMISC',
          sqlcode: '0',
          registers: 'LOCK_VAL: RELEASED | TXN_ID: GL_COMM_902',
          diagnostics: commitStatus === 'skipped'
            ? 'BYPASSED: DB transaction rolled back. No database updates were written to disk.'
            : 'STATUS RC_00: Database lock table freed. Disk synchronization complete.'
        }
      },
      {
        id: 'p6',
        phase: 'PHASE_06',
        title: 'Safe Signoff Exit',
        paragraph: 'G100-SIGN-OFF',
        status: signoffStatus,
        duration: '15ms',
        description: 'Terminates connection pools, closes open file streams, and returns Return Code.',
        details: {
          program: 'GL1199 / DB2',
          registers: `SYS_RC: ${rcVal.toString().padStart(2, '0')} | POOL_FLUSH: TRUE`,
          diagnostics: rcVal === 0
            ? 'STATUS RC_00: Warm termination. Run logs synchronized. Safe transaction boundary accomplished.'
            : `STATUS RC_${rcVal.toString().padStart(2, '0')}: Program terminated with severe error code. Check system diagnostics.`
        }
      }
    ];

    setSteps(pipelineSteps);
  }, [rawLog]);

  const activeStep = steps.find(s => s.id === selectedStepId) || steps[0];

  const getStatusIcon = (status: PipelineStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400 animate-pulse" />;
      case 'active':
        return <PlayCircle className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusStyles = (status: PipelineStep['status'], isSelected: boolean) => {
    if (isSelected) {
      switch (status) {
        case 'success':
          return 'border-green-500/50 bg-green-950/20 text-green-300';
        case 'failed':
          return 'border-red-500/50 bg-red-950/20 text-red-300';
        default:
          return 'border-blue-500/50 bg-blue-950/20 text-blue-300';
      }
    }

    switch (status) {
      case 'success':
        return 'border-green-500/20 bg-green-500/5 hover:border-green-500/40 text-gray-300';
      case 'failed':
        return 'border-red-500/20 bg-red-500/5 hover:border-red-500/40 text-gray-300';
      default:
        return 'border-gray-800 bg-[#1A1D23] hover:border-gray-700 text-gray-400';
    }
  };

  if (!rawLog || steps.length === 0 || !activeStep) {
    return (
      <div className="bg-[#1A1D23] border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center h-[650px] text-center">
        <Database className="w-10 h-10 text-gray-600 mb-3" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">No Log Loaded to Map</h4>
        <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">Please load or paste a COBOL trace log to construct the interactive execution pipeline.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#14171C] border border-gray-800 rounded-lg shadow-xs overflow-hidden flex flex-col h-[650px]">
      {/* Header telemetry */}
      <div className="bg-[#1A1D23] border-b border-gray-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-gray-200 text-xs font-mono uppercase tracking-wider">EXECUTION PIPELINE FLOW</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          TRANSACTION TIME-SEGMENTS MAP
        </div>
      </div>

      {/* Horizontal scrolling pipeline layout */}
      <div className="p-4 border-b border-gray-800 bg-[#0F1115] overflow-x-auto select-none">
        <div className="flex items-stretch gap-2.5 min-w-[750px] pb-1">
          {steps.map((step, idx) => {
            const isSelected = step.id === selectedStepId;
            return (
              <React.Fragment key={step.id}>
                {/* Stage card */}
                <button
                  onClick={() => setSelectedStepId(step.id)}
                  className={`flex-1 text-left border rounded p-2.5 transition-all cursor-pointer relative ${getStatusStyles(step.status, isSelected)}`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-[8px] font-mono font-bold tracking-wider opacity-60">
                      {step.phase}
                    </span>
                    {getStatusIcon(step.status)}
                  </div>

                  <h4 className="text-[11px] font-mono font-bold truncate mb-0.5 uppercase tracking-wide">
                    {step.title}
                  </h4>
                  <p className="text-[9px] font-mono opacity-50 truncate">
                    {step.paragraph}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[8px] font-mono opacity-60 pt-1.5 border-t border-gray-800/40">
                    <span>{step.duration}</span>
                    {step.recordsProcessed !== undefined && (
                      <span>Rows: {step.recordsProcessed}</span>
                    )}
                  </div>

                  {/* Active highlight marker */}
                  {isSelected && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rotate-45 border-r border-b border-blue-500"></div>
                  )}
                </button>

                {/* Connecting arrow */}
                {idx < steps.length - 1 && (
                  <div className="flex items-center justify-center text-gray-700">
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail panel of selected pipeline stage */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#14171C]">
        {/* Stage details header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 font-mono">
              {activeStep.phase} INSPECTION
            </span>
            <h3 className="text-xs font-bold font-mono text-gray-200 uppercase tracking-wide flex items-center gap-1.5">
              {activeStep.title}
              <span className="text-[10px] font-normal text-gray-400 font-mono">({activeStep.paragraph})</span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300">
              PROG: {activeStep.details.program}
            </span>
            {activeStep.details.sqlcode && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                activeStep.details.sqlcode === '0' || activeStep.details.sqlcode === '000'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/15 border-red-500/20 text-red-400'
              }`}>
                SQLCODE: {activeStep.details.sqlcode}
              </span>
            )}
          </div>
        </div>

        {/* Diagnostic Narrative card */}
        <div className="bg-[#1A1D23] border border-gray-800 rounded p-3.5 space-y-1.5">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-blue-400" />
            Phase Diagnostic Narrative
          </span>
          <p className="text-xs text-gray-300 leading-relaxed">
            {activeStep.details.diagnostics}
          </p>
        </div>

        {/* Sub grid values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Hardware & Register States */}
          <div className="bg-[#0A0C10] border border-gray-800 rounded p-3 space-y-2">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono block">
              COBOL SYSTEM REGISTER STATE
            </span>
            <div className="bg-black/40 rounded p-2.5 font-mono text-[11px] text-green-400 border border-gray-900 leading-relaxed whitespace-pre select-text">
              {activeStep.details.registers}
            </div>
          </div>

          {/* Logical Data Mappings */}
          <div className="bg-[#0A0C10] border border-gray-800 rounded p-3 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono block">
                MAINFRAME DATASET MAPPING
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center border-b border-gray-800/40 pb-1">
                  <span className="text-gray-500 font-mono">Mapped Program:</span>
                  <span className="font-mono text-gray-300">{activeStep.details.program}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800/40 pb-1">
                  <span className="text-gray-500 font-mono">Assigned File:</span>
                  <span className="font-mono text-gray-300">{activeStep.details.dataset || 'N/A (SYS DIRECT)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-mono">Phase Role:</span>
                  <span className="font-mono text-gray-400 text-[10px] uppercase truncate max-w-xs">{activeStep.description}</span>
                </div>
              </div>
            </div>

            {/* Quick action button to copy paragraph name for Console search */}
            {onFilterLog && (
              <button
                onClick={() => onFilterLog(activeStep.paragraph)}
                className="w-full mt-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all tracking-wide cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Query Logs for: {activeStep.paragraph}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
