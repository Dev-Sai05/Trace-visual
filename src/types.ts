export interface LogNode {
  id: string;
  type: 'program' | 'paragraph' | 'log' | 'error' | 'utility';
  name: string;
  timestamp?: string;
  details?: string;
  isError?: boolean;
  level: number;
  children: LogNode[];
  rawLines: string[];
  durationMs?: number;
}

export interface AIAnalysisReport {
  success: boolean;
  summary: string;
  errorExplanation?: {
    rawError: string;
    decodedMeaning: string;
    probableCause: string;
    severity: 'critical' | 'warning' | 'info';
    reconciliationSteps: string[];
  };
  moduleBreakdown: {
    moduleName: string;
    role: string;
    description: string;
  }[];
  cobolCodeRecommendation?: {
    paragraph: string;
    originalConcept: string;
    fixedSnippet: string;
    explanation: string;
  };
  metrics: {
    totalErrors: number;
    dbCommitPerformed: boolean;
    dbioOperationsCount: number;
    totalRecordsProcessed: number;
  };
}

export type AppTheme = 'modern' | 'retro';
