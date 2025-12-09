"use client";

import { useEffect, useState } from "react";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="h-full w-full p-4 max-md:p-2 bg-background">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Metrics Dashboard</h1>
        
        {loading && (
          <div className="text-center py-8">
            <p className="text-text">Loading metrics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
            <p className="text-red-500">Error: {error}</p>
          </div>
        )}

        {metrics && (
          <div className="bg-secondary rounded-lg p-4">
            <pre className="text-sm text-text whitespace-pre-wrap font-mono overflow-x-auto">
              {metrics}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

