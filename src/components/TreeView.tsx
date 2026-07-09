import React, { useState, useEffect } from 'react';
import { LogNode } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  Settings, 
  Database, 
  AlertTriangle, 
  Clock, 
  Search, 
  Maximize2, 
  Minimize2,
  Cpu
} from 'lucide-react';

interface TreeViewProps {
  rootNode: LogNode;
  onSelectNode: (node: LogNode) => void;
  selectedNodeId: string | null;
}

export const TreeView: React.FC<TreeViewProps> = ({ rootNode, onSelectNode, selectedNodeId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);

  // Find max duration to calibrate flame/duration bars
  const maxDuration = getMaxDuration(rootNode);

  return (
    <div className="bg-[#14171C] border border-gray-800 rounded-lg shadow-xs overflow-hidden flex flex-col h-[650px]">
      {/* Header bar */}
      <div className="bg-[#1A1D23] border-b border-gray-800 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-gray-100 text-sm tracking-tight">Execution Call Tree & Profile</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search trace modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-800 rounded-sm bg-[#0F1115] text-gray-200 placeholder:text-gray-500 focus:outline-hidden focus:border-blue-500 w-44 font-mono"
            />
          </div>

          {/* Filter Errors */}
          <button
            onClick={() => setFilterErrorsOnly(!filterErrorsOnly)}
            className={`px-2.5 py-1.5 rounded-sm text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              filterErrorsOnly
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-[#1A1D23] border-gray-800 text-gray-400 hover:bg-[#1E2229]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Errors Only
          </button>

          {/* Expand / Collapse All */}
          <div className="flex rounded-sm border border-gray-800 overflow-hidden bg-[#1A1D23]">
            <button
              onClick={() => {
                setExpandAll(true);
                setCollapseAll(false);
                // Reset flag in next tick
                setTimeout(() => setExpandAll(false), 100);
              }}
              title="Expand All"
              className="p-1 px-2.5 hover:bg-[#1E2229] border-r border-gray-800 text-gray-400"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setCollapseAll(true);
                setExpandAll(false);
                setTimeout(() => setCollapseAll(false), 100);
              }}
              title="Collapse All"
              className="p-1 px-2.5 hover:bg-[#1E2229] text-gray-400"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-3.5 overflow-y-auto flex-1 font-sans text-xs select-none">
        {rootNode.children.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
            <Terminal className="w-8 h-8 mb-2 stroke-1" />
            <span>Empty execution trace</span>
          </div>
        ) : (
          <div className="space-y-1">
            {rootNode.children.map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                onSelectNode={onSelectNode}
                selectedNodeId={selectedNodeId}
                searchQuery={searchQuery}
                expandAll={expandAll}
                collapseAll={collapseAll}
                filterErrorsOnly={filterErrorsOnly}
                maxDuration={maxDuration}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="bg-[#1A1D23] border-t border-gray-800 px-4 py-2 flex justify-between text-[10px] text-gray-400 font-mono">
        <span>Click on any execution block to inspect raw registry status & variables</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Program</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Utility</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Subroutine</span>
        </div>
      </div>
    </div>
  );
};

/* Recursive Tree Node Item Component */
interface TreeNodeItemProps {
  node: LogNode;
  onSelectNode: (node: LogNode) => void;
  selectedNodeId: string | null;
  searchQuery: string;
  expandAll: boolean;
  collapseAll: boolean;
  filterErrorsOnly: boolean;
  maxDuration: number;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  onSelectNode,
  selectedNodeId,
  searchQuery,
  expandAll,
  collapseAll,
  filterErrorsOnly,
  maxDuration
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto expand when search query changes or when expandAll/collapseAll is triggered
  useEffect(() => {
    if (expandAll) setIsExpanded(true);
    if (collapseAll) setIsExpanded(false);
  }, [expandAll, collapseAll]);

  // If search query is present, check if this node or any child matches it
  const isSearchMatched = searchQuery 
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (node.details && node.details.toLowerCase().includes(searchQuery.toLowerCase()))
    : true;

  // Check if any recursive child matches search or errors filter
  const childMatchesSearch = hasMatchingDescendant(node, searchQuery, filterErrorsOnly);

  // If filtering error nodes, check if this node or descendants are marked as error
  const isErrorMatched = filterErrorsOnly ? node.isError : true;

  if (searchQuery && !isSearchMatched && !childMatchesSearch) {
    return null;
  }

  if (filterErrorsOnly && !node.isError && !childMatchesSearch) {
    return null;
  }

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(node);
  };

  // Determine Icon & Color theme for node type
  let icon = <Cpu className="w-4 h-4 text-blue-400" />;
  let badgeStyle = 'bg-blue-500/10 border-blue-500/20 text-blue-300';

  if (node.type === 'utility') {
    icon = <Settings className="w-4 h-4 text-indigo-400" />;
    badgeStyle = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300';
  } else if (node.type === 'paragraph') {
    icon = <Terminal className="w-3.5 h-3.5 text-amber-400" />;
    badgeStyle = 'bg-amber-500/10 border-amber-500/20 text-amber-300';
  } else if (node.type === 'log') {
    icon = <Database className="w-3.5 h-3.5 text-gray-500" />;
    badgeStyle = 'bg-[#1A1D23] border-gray-800 text-gray-400';
  }

  if (node.isError) {
    badgeStyle = 'bg-red-500/15 border-red-500/30 text-red-400';
  }

  // Calculate percentage width for duration profile bar
  const durationPercent = maxDuration && node.durationMs 
    ? Math.min(100, Math.max(2, (node.durationMs / maxDuration) * 100))
    : 0;

  return (
    <div className="pl-3 border-l border-dashed border-gray-800">
      {/* Node Entry row */}
      <div 
        onClick={handleSelect}
        className={`group flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-all ${
          isSelected 
            ? 'bg-blue-500/10 border-blue-500/40 border text-blue-200 shadow-xs' 
            : 'hover:bg-gray-800/40 border border-transparent text-gray-300'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Expand / Collapse click target */}
          {hasChildren ? (
            <button 
              onClick={handleToggle}
              className="p-0.5 rounded-sm hover:bg-gray-800 text-gray-500 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4.5"></span>
          )}

          {/* Node icon */}
          <div className="shrink-0">
            {node.isError ? <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" /> : icon}
          </div>

          {/* Node Name */}
          <span className={`font-mono truncate text-xs ${node.isError ? 'font-bold text-red-400' : 'font-medium'}`}>
            {node.name}
          </span>

          {/* Type Badge */}
          {node.type !== 'log' && (
            <span className={`text-[9px] px-1.5 py-0.2 rounded-sm border capitalize select-none shrink-0 font-mono ${badgeStyle}`}>
              {node.type}
            </span>
          )}

          {/* Timestamp if available */}
          {node.timestamp && (
            <span className="text-[10px] text-gray-500 font-mono ml-1.5">
              [{node.timestamp}]
            </span>
          )}
        </div>

        {/* Profile metrics (Duration / Timings bar) */}
        {node.durationMs !== undefined && (node.type === 'program' || node.type === 'utility' || node.type === 'paragraph') && (
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {/* Visual micro duration chart bar */}
            <div className="hidden sm:block w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${node.isError ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${durationPercent}%` }}
              />
            </div>
            {/* Numeric badge */}
            <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400 bg-[#1A1D23] border border-gray-800 rounded px-1.5 py-0.5">
              <Clock className="w-2.5 h-2.5 text-gray-500" />
              {node.durationMs >= 1000 
                ? `${(node.durationMs / 1000).toFixed(2)}s` 
                : `${node.durationMs}ms`
              }
            </span>
          </div>
        )}
      </div>

      {/* Children list */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId}
              searchQuery={searchQuery}
              expandAll={expandAll}
              collapseAll={collapseAll}
              filterErrorsOnly={filterErrorsOnly}
              maxDuration={maxDuration}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* Helper Functions */
function getMaxDuration(node: LogNode): number {
  let max = node.durationMs || 0;
  if (node.children) {
    for (const child of node.children) {
      const childMax = getMaxDuration(child);
      if (childMax > max) max = childMax;
    }
  }
  return max;
}

function hasMatchingDescendant(node: LogNode, query: string, errorsOnly: boolean): boolean {
  if (!node.children) return false;
  return node.children.some(child => {
    const isMatched = query 
      ? child.name.toLowerCase().includes(query.toLowerCase()) || 
        (child.details && child.details.toLowerCase().includes(query.toLowerCase()))
      : true;

    const isErrorMatched = errorsOnly ? child.isError : true;

    if (isMatched && isErrorMatched) return true;
    return hasMatchingDescendant(child, query, errorsOnly);
  });
}
