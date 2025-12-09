"use client";

import { useEffect, useState } from "react";
import { QuicConnectionStats } from "@/lib/shared/utils/quicClient";

interface QuicMetricsProps {
  stats: QuicConnectionStats;
  connectionDuration: number; // in seconds
  className?: string;
}

export const QuicMetrics = ({ stats, connectionDuration, className = "" }: QuicMetricsProps) => {
  const [bytesSentRate, setBytesSentRate] = useState(0);
  const [bytesReceivedRate, setBytesReceivedRate] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [lastBytesSent, setLastBytesSent] = useState(stats.bytesSent);
  const [lastBytesReceived, setLastBytesReceived] = useState(stats.bytesReceived);

  // Calculate transfer rates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastUpdate) / 1000; // seconds

      if (elapsed > 0) {
        const sentDiff = stats.bytesSent - lastBytesSent;
        const receivedDiff = stats.bytesReceived - lastBytesReceived;

        setBytesSentRate(sentDiff / elapsed);
        setBytesReceivedRate(receivedDiff / elapsed);

        setLastUpdate(now);
        setLastBytesSent(stats.bytesSent);
        setLastBytesReceived(stats.bytesReceived);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stats, lastUpdate, lastBytesSent, lastBytesReceived]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getLatencyColor = (latency: number): string => {
    if (latency < 50) return "text-green-500";
    if (latency < 100) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Connection Duration */}
      <div className="bg-secondary p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-secondary-darker">Duration</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-secondary-darker"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-2xl font-bold text-text">{formatDuration(connectionDuration)}</p>
      </div>

      {/* Latency */}
      <div className="bg-secondary p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-secondary-darker">Latency</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-secondary-darker"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <p className={`text-2xl font-bold ${getLatencyColor(stats.latency)}`}>
          {stats.latency.toFixed(0)} ms
        </p>
      </div>

      {/* Bytes Sent */}
      <div className="bg-secondary p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-secondary-darker">Sent</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-secondary-darker"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5m-6.75-4.5h13.5" />
          </svg>
        </div>
        <p className="text-2xl font-bold text-text">{formatBytes(stats.bytesSent)}</p>
        <p className="text-xs text-secondary-darker mt-1">
          {formatBytes(bytesSentRate)}/s
        </p>
      </div>

      {/* Bytes Received */}
      <div className="bg-secondary p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-secondary-darker">Received</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-secondary-darker"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5m6.75-4.5h-13.5" />
          </svg>
        </div>
        <p className="text-2xl font-bold text-text">{formatBytes(stats.bytesReceived)}</p>
        <p className="text-xs text-secondary-darker mt-1">
          {formatBytes(bytesReceivedRate)}/s
        </p>
      </div>

      {/* Frames Sent/Received */}
      <div className="bg-secondary p-4 rounded-lg md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-secondary-darker">Frames</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-secondary-darker"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.25V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m-18.375 0h1.5m17.25 0h1.5m-1.5 0v-1.5m0 1.5v-1.5m0 0h-1.5m1.5 0h-1.5" />
          </svg>
        </div>
        <div className="flex gap-4">
          <div>
            <p className="text-sm text-secondary-darker">Sent</p>
            <p className="text-xl font-bold text-text">{stats.framesSent}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-darker">Received</p>
            <p className="text-xl font-bold text-text">{stats.framesReceived}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

