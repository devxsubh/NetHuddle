/**
 * Prometheus Metrics Service
 * Collects and exposes metrics for monitoring
 */

import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics

// HTTP request metrics
const httpRequestDuration = new client.Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'],
	buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new client.Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status_code'],
});

// WebSocket metrics
const websocketConnections = new client.Gauge({
	name: 'websocket_connections_total',
	help: 'Total number of active WebSocket connections',
});

const websocketMessagesTotal = new client.Counter({
	name: 'websocket_messages_total',
	help: 'Total number of WebSocket messages',
	labelNames: ['event_type'],
});

const websocketMessageDuration = new client.Histogram({
	name: 'websocket_message_duration_seconds',
	help: 'Duration of WebSocket message processing in seconds',
	labelNames: ['event_type'],
	buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Network metrics
const networkUsers = new client.Gauge({
	name: 'network_users_total',
	help: 'Total number of users in network',
	labelNames: ['network_subnet'],
});

const networkRTT = new client.Histogram({
	name: 'network_rtt_seconds',
	help: 'Round trip time in seconds',
	labelNames: ['network_subnet'],
	buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
});

// File transfer metrics
const fileTransferTotal = new client.Counter({
	name: 'file_transfers_total',
	help: 'Total number of file transfers',
	labelNames: ['status'],
});

const fileTransferSize = new client.Histogram({
	name: 'file_transfer_size_bytes',
	help: 'Size of file transfers in bytes',
	buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824], // 1KB to 1GB
});

const fileTransferDuration = new client.Histogram({
	name: 'file_transfer_duration_seconds',
	help: 'Duration of file transfers in seconds',
	buckets: [1, 5, 10, 30, 60, 120, 300],
});

// WebRTC metrics
const webrtcConnections = new client.Gauge({
	name: 'webrtc_connections_total',
	help: 'Total number of active WebRTC connections',
});

const webrtcConnectionDuration = new client.Histogram({
	name: 'webrtc_connection_duration_seconds',
	help: 'Duration of WebRTC connections in seconds',
	buckets: [10, 30, 60, 300, 600, 1800, 3600],
});

// QUIC metrics
const quicConnections = new client.Gauge({
	name: 'quic_connections_total',
	help: 'Total number of active QUIC connections',
});

const quicStreams = new client.Gauge({
	name: 'quic_streams_total',
	help: 'Total number of active QUIC streams',
});

const quicStreamBytes = new client.Counter({
	name: 'quic_stream_bytes_total',
	help: 'Total bytes transferred over QUIC streams',
	labelNames: ['direction'], // 'in' or 'out'
});

// Database metrics
const databaseQueryDuration = new client.Histogram({
	name: 'database_query_duration_seconds',
	help: 'Duration of database queries in seconds',
	labelNames: ['operation', 'collection'],
	buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const databaseQueryTotal = new client.Counter({
	name: 'database_queries_total',
	help: 'Total number of database queries',
	labelNames: ['operation', 'collection', 'status'],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(websocketConnections);
register.registerMetric(websocketMessagesTotal);
register.registerMetric(websocketMessageDuration);
register.registerMetric(networkUsers);
register.registerMetric(networkRTT);
register.registerMetric(fileTransferTotal);
register.registerMetric(fileTransferSize);
register.registerMetric(fileTransferDuration);
register.registerMetric(webrtcConnections);
register.registerMetric(webrtcConnectionDuration);
register.registerMetric(quicConnections);
register.registerMetric(quicStreams);
register.registerMetric(quicStreamBytes);
register.registerMetric(databaseQueryDuration);
register.registerMetric(databaseQueryTotal);

// Export metrics
export const getMetrics = async () => {
	return register.metrics();
};

// Helper functions to update metrics

export const recordHTTPRequest = (method, route, statusCode, duration) => {
	httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
	httpRequestTotal.inc({ method, route, status_code: statusCode });
};

export const updateWebSocketConnections = (count) => {
	websocketConnections.set(count);
};

export const recordWebSocketMessage = (eventType, duration) => {
	websocketMessagesTotal.inc({ event_type: eventType });
	if (duration !== undefined) {
		websocketMessageDuration.observe({ event_type: eventType }, duration);
	}
};

export const updateNetworkUsers = (networkSubnet, count) => {
	networkUsers.set({ network_subnet: networkSubnet }, count);
};

export const recordNetworkRTT = (networkSubnet, rtt) => {
	networkRTT.observe({ network_subnet: networkSubnet }, rtt);
};

export const recordFileTransfer = (status, size, duration) => {
	fileTransferTotal.inc({ status });
	if (size !== undefined) {
		fileTransferSize.observe(size);
	}
	if (duration !== undefined) {
		fileTransferDuration.observe(duration);
	}
};

export const updateWebRTCConnections = (count) => {
	webrtcConnections.set(count);
};

export const recordWebRTCConnectionDuration = (duration) => {
	webrtcConnectionDuration.observe(duration);
};

export const updateQUICConnections = (count) => {
	quicConnections.set(count);
};

export const updateQUICStreams = (count) => {
	quicStreams.set(count);
};

export const recordQUICStreamBytes = (direction, bytes) => {
	quicStreamBytes.inc({ direction }, bytes);
};

export const recordDatabaseQuery = (operation, collection, status, duration) => {
	databaseQueryTotal.inc({ operation, collection, status });
	if (duration !== undefined) {
		databaseQueryDuration.observe({ operation, collection }, duration);
	}
};

export default {
	getMetrics,
	recordHTTPRequest,
	updateWebSocketConnections,
	recordWebSocketMessage,
	updateNetworkUsers,
	recordNetworkRTT,
	recordFileTransfer,
	updateWebRTCConnections,
	recordWebRTCConnectionDuration,
	updateQUICConnections,
	updateQUICStreams,
	recordQUICStreamBytes,
	recordDatabaseQuery,
	register,
};

