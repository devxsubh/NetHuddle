"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket.context";

interface MetricsData {
  websocketConnections: number;
  networkUsers: number;
  activeRooms: number;
  fileTransfers: number;
  webrtcConnections: number;
  quicConnections: number;
  rtt: number;
  throughput: number;
}

export const MetricsDashboard = () => {
  const socket = useSocket();
  const [metrics, setMetrics] = useState<MetricsData>({
    websocketConnections: 0,
    networkUsers: 0,
    activeRooms: 0,
    fileTransfers: 0,
    webrtcConnections: 0,
    quicConnections: 0,
    rtt: 0,
    throughput: 0,
  });

  useEffect(() => {
    if (!socket) return;

    // Request metrics update
    const requestMetrics = () => {
      socket.emit('metrics:request');
    };

    // Listen for metrics updates
    const handleMetricsUpdate = (data: MetricsData) => {
      setMetrics(data);
    };

    socket.on('metrics:update', handleMetricsUpdate);

    // Request initial metrics
    requestMetrics();

    // Request metrics every 5 seconds
    const interval = setInterval(requestMetrics, 5000);

    return () => {
      socket.off('metrics:update', handleMetricsUpdate);
      clearInterval(interval);
    };
  }, [socket]);

  return (
    <div className="p-6 bg-background">
      <h2 className="text-2xl font-bold text-text mb-6">Network Metrics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WebSocket Connections */}
        <MetricCard
          title="WebSocket Connections"
          value={metrics.websocketConnections}
          icon="🔌"
          color="blue"
        />

        {/* Network Users */}
        <MetricCard
          title="Network Users"
          value={metrics.networkUsers}
          icon="👥"
          color="green"
        />

        {/* Active Rooms */}
        <MetricCard
          title="Active Rooms"
          value={metrics.activeRooms}
          icon="🏠"
          color="purple"
        />

        {/* File Transfers */}
        <MetricCard
          title="File Transfers"
          value={metrics.fileTransfers}
          icon="📁"
          color="orange"
        />

        {/* WebRTC Connections */}
        <MetricCard
          title="WebRTC Connections"
          value={metrics.webrtcConnections}
          icon="📹"
          color="red"
        />

        {/* QUIC Connections */}
        <MetricCard
          title="QUIC Connections"
          value={metrics.quicConnections}
          icon="⚡"
          color="yellow"
        />

        {/* RTT */}
        <MetricCard
          title="Round Trip Time"
          value={`${metrics.rtt.toFixed(2)} ms`}
          icon="⏱️"
          color="indigo"
        />

        {/* Throughput */}
        <MetricCard
          title="Throughput"
          value={`${(metrics.throughput / 1024 / 1024).toFixed(2)} Mbps`}
          icon="📊"
          color="teal"
        />
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

const MetricCard = ({ title, value, icon, color }: MetricCardProps) => {
  const colorClasses = {
    blue: "bg-blue-500/20 border-blue-500",
    green: "bg-green-500/20 border-green-500",
    purple: "bg-purple-500/20 border-purple-500",
    orange: "bg-orange-500/20 border-orange-500",
    red: "bg-red-500/20 border-red-500",
    yellow: "bg-yellow-500/20 border-yellow-500",
    indigo: "bg-indigo-500/20 border-indigo-500",
    teal: "bg-teal-500/20 border-teal-500",
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-sm font-medium text-secondary-darker">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-text">{value}</p>
    </div>
  );
};

