import { LogNode } from '../types';

// Helper to generate unique IDs
const genId = () => Math.random().toString(36).substring(2, 9);

// A list of standard mainframe/COBOL utility modules for special categorization
const COBOL_UTILITIES = new Set([
  'UT8500', 'UT9004', 'UT0008', 'UTCMMT', 'DBIODIST', 'IOMISC'
]);

export function parseCobolLog(rawLog: string): LogNode {
  const lines = rawLog.split('\n').map(l => l.trimEnd());
  
  // Root node that will hold the entire execution tree
  const rootNode: LogNode = {
    id: 'root',
    type: 'program',
    name: 'Trace Execution Root',
    level: 0,
    children: [],
    rawLines: []
  };

  const stack: LogNode[] = [rootNode];

  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const rawLine = lines[lineIndex];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      lineIndex++;
      continue;
    }

    // Capture the line in the current parent node
    const currentParent = stack[stack.length - 1];
    currentParent.rawLines.push(rawLine);

    // 1. Detect program boundary start (e.g. "START OF GL1199", "*** Start of  GL1199")
    const startOfMatch = trimmed.match(/(?:START OF|Start of)\s+([A-Z0-9\-]+)/i);
    const endOfMatch = trimmed.match(/(?:END OF|End of)\s+([A-Z0-9\-]+)/i);

    if (startOfMatch) {
      const progName = startOfMatch[1].toUpperCase();
      const isUtil = COBOL_UTILITIES.has(progName);
      
      const newNode: LogNode = {
        id: genId(),
        type: isUtil ? 'utility' : 'program',
        name: progName,
        level: stack.length,
        children: [],
        rawLines: [rawLine]
      };
      
      currentParent.children.push(newNode);
      stack.push(newNode);
      lineIndex++;
      continue;
    }

    // 2. Detect program boundary end
    if (endOfMatch) {
      const progName = endOfMatch[1].toUpperCase();
      // Look back in stack to find matching program and pop up to it
      let foundIndex = -1;
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].name === progName) {
          foundIndex = i;
          break;
        }
      }
      
      if (foundIndex !== -1) {
        // Pop all nested paragraphs/sub-routines under this program too
        while (stack.length > foundIndex + 1) {
          stack.pop();
        }
        // Capture the end line in the program node
        stack[stack.length - 1].rawLines.push(rawLine);
        // Pop the program itself
        stack.pop();
      }
      lineIndex++;
      continue;
    }

    // 3. Detect Timestamped Trace lines, e.g. "   -   |12:35:02.894100|    DBIO:(A100)..."
    const timestampMatch = trimmed.match(/\|(\d{2}:\d{2}:\d{2}\.\d+)\|/);
    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      const message = trimmed.split(`|${timestamp}|`)[1]?.trim() || trimmed;
      const isErrorLine = trimmed.toUpperCase().includes('ERROR') || trimmed.toUpperCase().includes('FAIL');

      const logNode: LogNode = {
        id: genId(),
        type: isErrorLine ? 'error' : 'log',
        name: message.length > 50 ? message.substring(0, 50) + '...' : message,
        timestamp,
        details: message,
        isError: isErrorLine,
        level: stack.length,
        children: [],
        rawLines: [rawLine]
      };

      currentParent.children.push(logNode);
      lineIndex++;
      continue;
    }

    // 4. Detect Specific Error / Status Outputs, e.g. "GL1199(E100-FETCH-GLDM):CURSOR FETCH ERROR..."
    const statusMatch = trimmed.match(/^([A-Z0-9]+)\(([^)]+)\):\s*(.*)$/);
    if (statusMatch) {
      const prog = statusMatch[1];
      const context = statusMatch[2];
      const message = statusMatch[3];
      const isError = message.toUpperCase().includes('ERROR') || message.toUpperCase().includes('FAIL') || trimmed.toUpperCase().includes('RC =') || trimmed.toUpperCase().includes('RC=');

      const statusNode: LogNode = {
        id: genId(),
        type: isError ? 'error' : 'log',
        name: `${context}: ${message}`,
        details: trimmed,
        isError,
        level: stack.length,
        children: [],
        rawLines: [rawLine]
      };

      currentParent.children.push(statusNode);
      if (isError) {
        // propagate error up the stack
        for (let i = stack.length - 1; i >= 0; i--) {
          stack[i].isError = true;
        }
      }
      lineIndex++;
      continue;
    }

    // 5. Detect Return Code markers, e.g., "*** End of GL1199 at ... RC = 12"
    const rcMatch = trimmed.match(/RC\s*=\s*(\d+)/i);
    if (rcMatch) {
      const rcVal = parseInt(rcMatch[1], 10);
      const isError = rcVal !== 0;

      const rcNode: LogNode = {
        id: genId(),
        type: isError ? 'error' : 'log',
        name: `Return Code (RC) = ${rcVal}`,
        details: trimmed,
        isError,
        level: stack.length,
        children: [],
        rawLines: [rawLine]
      };

      currentParent.children.push(rcNode);
      if (isError) {
        for (let i = stack.length - 1; i >= 0; i--) {
          stack[i].isError = true;
        }
      }
      lineIndex++;
      continue;
    }

    // 6. Detect COBOL Paragraph Entry / Exit
    // Paragraph names typically look like A000-MAINLINE, B000-INITIALISE, D100-ENTRY, D199-EXIT, A100-EXIT-PARA, A-GOBACK, etc.
    const isParagraphIndicator = trimmed.match(/^[A-Z]\d{3}-[A-Z0-9\-]+|^[A-Z]-[A-Z0-9\-]+/);
    if (isParagraphIndicator) {
      const paraName = trimmed;
      const isExit = paraName.toUpperCase().includes('EXIT') || paraName.toUpperCase().includes('GOBACK');

      if (isExit) {
        // If we are exiting, try to pop paragraph node from stack
        if (stack.length > 1 && stack[stack.length - 1].type === 'paragraph') {
          const finishedPara = stack.pop();
          if (finishedPara) {
            finishedPara.rawLines.push(rawLine);
          }
        }
      } else {
        // It's entering a new paragraph. If we are already in a paragraph, we pop it first (siblings)
        if (stack.length > 1 && stack[stack.length - 1].type === 'paragraph') {
          stack.pop();
        }

        const paraNode: LogNode = {
          id: genId(),
          type: 'paragraph',
          name: paraName,
          level: stack.length,
          children: [],
          rawLines: [rawLine]
        };

        // Add as child to the active program/utility or previous active container
        const currentActive = stack[stack.length - 1];
        currentActive.children.push(paraNode);
        stack.push(paraNode);
      }

      lineIndex++;
      continue;
    }

    // Default fallback: treat as a general log entry inside the current context
    const textNode: LogNode = {
      id: genId(),
      type: 'log',
      name: trimmed.length > 60 ? trimmed.substring(0, 60) + '...' : trimmed,
      details: trimmed,
      level: stack.length,
      children: [],
      rawLines: [rawLine]
    };
    currentParent.children.push(textNode);
    
    lineIndex++;
  }

  // Post-process to ensure errors are propagated up fully and durations are set (simulated based on log order or dummy data)
  propagateErrorFlag(rootNode);
  calculateNodeDurations(rootNode);

  return rootNode;
}

function propagateErrorFlag(node: LogNode): boolean {
  let hasError = node.isError || false;
  for (const child of node.children) {
    if (propagateErrorFlag(child)) {
      hasError = true;
    }
  }
  if (hasError) {
    node.isError = true;
  }
  return hasError;
}

function calculateNodeDurations(node: LogNode) {
  // If there are timestamps in the children, compute the time difference
  const timestamps = findTimestamps(node);
  if (timestamps.length >= 2) {
    const start = parseTimeToMs(timestamps[0]);
    const end = parseTimeToMs(timestamps[timestamps.length - 1]);
    node.durationMs = Math.max(0, end - start);
  } else {
    // Assign reasonable dummy durations for visual hierarchy
    if (node.type === 'program' || node.type === 'utility') {
      node.durationMs = Math.floor(Math.random() * 200) + 50;
    } else if (node.type === 'paragraph') {
      node.durationMs = Math.floor(Math.random() * 30) + 5;
    }
  }

  for (const child of node.children) {
    calculateNodeDurations(child);
  }
}

function findTimestamps(node: LogNode): string[] {
  const list: string[] = [];
  if (node.timestamp) {
    list.push(node.timestamp);
  }
  for (const child of node.children) {
    list.push(...findTimestamps(child));
  }
  return list;
}

function parseTimeToMs(ts: string): number {
  const parts = ts.split(':');
  if (parts.length < 3) return 0;
  const hrs = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  const secsParts = parts[2].split('.');
  const secs = parseInt(secsParts[0], 10);
  const ms = secsParts[1] ? parseInt(secsParts[1].substring(0, 3), 10) : 0;
  return ((hrs * 60 + mins) * 60 + secs) * 1000 + ms;
}
