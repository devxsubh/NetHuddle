"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { CircleLoading } from "@/components/shared/CircleLoading";

interface ParsedMetric {
  name: string;
  type: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}

export const MetricsPageClient = () => {
  const [metrics, setMetrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/v1/metrics`, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.text();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchMetrics]);

  // Parse Prometheus metrics into displayable format
  const displayLines = useMemo(() => {
    if (!metrics) return [];

    const lines: string[] = [];
    const parsed: ParsedMetric[] = [];
    let currentType = '';
    let currentHelp = '';

    // Parse metrics
    const metricLines = metrics.split('\n');
    for (const line of metricLines) {
      if (line.startsWith('# TYPE ')) {
        const match = line.match(/# TYPE (\w+) (\w+)/);
        if (match) {
          currentType = match[2];
        }
      } else if (line.startsWith('# HELP ')) {
        const match = line.match(/# HELP (\w+) (.+)/);
        if (match) {
          currentHelp = match[2];
        }
      } else if (line && !line.startsWith('#') && line.includes(' ')) {
        const parts = line.split(' ');
        const namePart = parts[0];
        const valuePart = parts[parts.length - 1];

        let name = namePart;
        let labels: Record<string, string> | undefined;
        if (namePart.includes('{')) {
          const labelMatch = namePart.match(/(\w+)\{(.+)\}/);
          if (labelMatch) {
            name = labelMatch[1];
            const labelStr = labelMatch[2];
            labels = {};
            labelStr.split(',').forEach((label) => {
              const [key, value] = label.split('=');
              if (key && value) {
                labels![key.trim()] = value.trim().replace(/"/g, '');
              }
            });
          }
        }

        const value = parseFloat(valuePart);
        if (!isNaN(value)) {
          parsed.push({
            name,
            type: currentType,
            help: currentHelp,
            value,
            labels,
          });
        }
      }
    }

    // Group by category and format for display
    const categories: Record<string, ParsedMetric[]> = {};
    parsed.forEach((metric) => {
      let category = 'Other';
      
      if (metric.name.includes('http')) {
        category = 'HTTP';
      } else if (metric.name.includes('websocket')) {
        category = 'WebSocket';
      } else if (metric.name.includes('network')) {
        category = 'Network';
      } else if (metric.name.includes('file_transfer')) {
        category = 'File Transfer';
      } else if (metric.name.includes('webrtc')) {
        category = 'WebRTC';
      } else if (metric.name.includes('quic')) {
        category = 'QUIC';
      } else if (metric.name.includes('database')) {
        category = 'Database';
      } else if (metric.name.includes('process_') || metric.name.includes('nodejs_')) {
        category = 'System';
      }

      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(metric);
    });

    // Format as terminal output
    lines.push(`═══════════════════════════════════════════════════════════════`);
    lines.push(`  SYSTEM METRICS MONITOR - ${new Date().toLocaleTimeString()}`);
    lines.push(`═══════════════════════════════════════════════════════════════`);
    lines.push(``);

    // Display by category
    Object.entries(categories).sort().forEach(([category, metrics]) => {
      lines.push(`[${category}]`);
      lines.push(`─────────────────────────────────────────────────────────────`);
      
      metrics.forEach((metric) => {
        let displayName = metric.name;
        if (metric.labels && Object.keys(metric.labels).length > 0) {
          const labelStr = Object.entries(metric.labels)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          displayName = `${metric.name}{${labelStr}}`;
        }

        let formattedValue = metric.value.toString();
        if (metric.type === 'histogram' || metric.type === 'summary') {
          formattedValue = metric.value.toFixed(2);
        } else if (metric.value >= 1000000) {
          formattedValue = (metric.value / 1000000).toFixed(2) + 'M';
        } else if (metric.value >= 1000) {
          formattedValue = (metric.value / 1000).toFixed(2) + 'K';
        } else if (metric.value < 1 && metric.value > 0) {
          formattedValue = metric.value.toFixed(4);
        }

        lines.push(`  ${displayName.padEnd(60)} ${formattedValue.padStart(15)}`);
      });
      
      lines.push(``);
    });

    lines.push(`═══════════════════════════════════════════════════════════════`);
    lines.push(`  Total Metrics: ${parsed.length} | Categories: ${Object.keys(categories).length}`);
    lines.push(`═══════════════════════════════════════════════════════════════`);

    return lines;
  }, [metrics]);

  // Auto-scroll to bottom when new data arrives
  useEffect(() => {
    if (scrollContainerRef.current && displayLines.length > 0) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [displayLines]);

  if (loading && !metrics) {
    return (
      <div className="flex justify-center items-center h-full">
        <CircleLoading size="8" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Metrics Monitor</h1>
            <p className="text-sm text-secondary-darker mt-1">
              Real-time system performance metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Auto-refresh</span>
            </label>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Terminal/Monitor Screen */}
      <div className="flex-1 overflow-hidden bg-black m-4 rounded-lg border-4 border-gray-800 shadow-2xl">
        <div className="h-full flex flex-col">
          {/* Monitor Frame Top */}
          <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-400 font-mono">METRICS TERMINAL</span>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {autoRefresh ? '● LIVE' : '○ PAUSED'}
            </div>
          </div>

          {/* Terminal Content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6 font-mono text-sm"
            style={{
              background: 'linear-gradient(to bottom, #0a0a0a 0%, #000000 100%)',
            }}
          >
            {error ? (
              <div className="text-red-400">
                <div className="mb-2">[ERROR]</div>
                <div>{error}</div>
              </div>
            ) : (
              <div className="text-green-400 space-y-0.5">
                {displayLines.map((line, index) => {
                  // Color coding for different line types
                  let lineColor = 'text-green-400';
                  if (line.includes('═══')) {
                    lineColor = 'text-green-500 font-bold';
                  } else if (line.includes('[') && line.includes(']')) {
                    lineColor = 'text-cyan-400 font-bold';
                  } else if (line.includes('────────────────')) {
                    lineColor = 'text-gray-500';
                  } else if (line.includes('Total Metrics')) {
                    lineColor = 'text-yellow-400';
                  } else if (line.startsWith('  ')) {
                    lineColor = 'text-green-300';
                  }

                  return (
                    <div
                      key={index}
                      className={lineColor}
                      style={{
                        textShadow: '0 0 5px rgba(34, 197, 94, 0.5)',
                        lineHeight: '1.5',
                      }}
                    >
                      {line || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monitor Frame Bottom */}
          <div className="bg-gray-900 px-4 py-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
              <span>Last Update: {new Date().toLocaleTimeString()}</span>
              <span>Lines: {displayLines.length}</span>
              <span>Status: {loading ? 'LOADING...' : error ? 'ERROR' : 'READY'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
