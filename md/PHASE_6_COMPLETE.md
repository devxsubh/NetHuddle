# Phase 6: Network Monitoring & Visualization ✅

## What Has Been Implemented

### 1. Prometheus Metrics Service ✅

**File**: `Server/src/services/metricsService.js`

- ✅ HTTP request metrics (duration, total)
- ✅ WebSocket metrics (connections, messages, duration)
- ✅ Network metrics (users, RTT)
- ✅ File transfer metrics (total, size, duration)
- ✅ WebRTC metrics (connections, duration)
- ✅ QUIC metrics (connections, streams, bytes)
- ✅ Database metrics (query duration, total)

**Metrics Exposed**:
- `http_request_duration_seconds` - HTTP request duration histogram
- `http_requests_total` - Total HTTP requests counter
- `websocket_connections_total` - Active WebSocket connections gauge
- `websocket_messages_total` - WebSocket messages counter
- `network_users_total` - Network users gauge
- `network_rtt_seconds` - Network RTT histogram
- `file_transfers_total` - File transfers counter
- `file_transfer_size_bytes` - File transfer size histogram
- `webrtc_connections_total` - WebRTC connections gauge
- `quic_connections_total` - QUIC connections gauge
- `database_query_duration_seconds` - Database query duration histogram

### 2. Metrics Middleware ✅

**File**: `Server/src/middlewares/metrics.js`

- ✅ Automatic HTTP request metrics collection
- ✅ Request duration tracking
- ✅ Status code tracking

### 3. Metrics API Endpoint ✅

**File**: `Server/src/routes/v1/metricsRoute.js`

- ✅ Prometheus metrics endpoint: `GET /api/v1/metrics`
- ✅ Returns metrics in Prometheus format

### 4. Frontend Metrics Dashboard ✅

**File**: `Client/src/components/monitoring/MetricsDashboard.tsx`

- ✅ Real-time metrics display
- ✅ WebSocket-based updates
- ✅ Visual metric cards
- ✅ Auto-refresh every 5 seconds

**Metrics Displayed**:
- WebSocket Connections
- Network Users
- Active Rooms
- File Transfers
- WebRTC Connections
- QUIC Connections
- Round Trip Time (RTT)
- Throughput

### 5. Grafana Dashboard Configuration ✅

**File**: `grafana/dashboards/network-dashboard.json`

- ✅ Pre-configured Grafana dashboard
- ✅ Multiple panels for different metrics
- ✅ HTTP request monitoring
- ✅ WebSocket monitoring
- ✅ Network monitoring
- ✅ File transfer monitoring
- ✅ WebRTC monitoring
- ✅ QUIC monitoring
- ✅ Database monitoring

### 6. Prometheus Configuration ✅

**File**: `grafana/prometheus.yml`

- ✅ Prometheus scrape configuration
- ✅ Server metrics endpoint configuration

## Installation

### 1. Install Prometheus Client

```bash
cd Server
npm install prom-client
```

### 2. Start Prometheus

```bash
# Download Prometheus from https://prometheus.io/download/
# Or use Docker
docker run -d -p 9090:9090 \
  -v $(pwd)/grafana/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 3. Start Grafana

```bash
# Using Docker
docker run -d -p 3000:3000 \
  -v $(pwd)/grafana/dashboards:/var/lib/grafana/dashboards \
  grafana/grafana
```

### 4. Import Dashboard

1. Open Grafana at http://localhost:3000
2. Login (default: admin/admin)
3. Add Prometheus data source: http://localhost:9090
4. Import dashboard from `grafana/dashboards/network-dashboard.json`

## Usage

### View Metrics

#### Prometheus Format

```bash
curl http://localhost:666/api/v1/metrics
```

#### Frontend Dashboard

```tsx
import { MetricsDashboard } from '@/components/monitoring/MetricsDashboard';

<MetricsDashboard />
```

#### Grafana Dashboard

1. Open http://localhost:3000
2. Navigate to Dashboards
3. Select "Network Communication System Dashboard"

## Metrics Details

### HTTP Metrics

- **Request Duration**: Histogram of request processing time
- **Request Total**: Counter of total requests by method, route, status

### WebSocket Metrics

- **Connections**: Current number of active connections
- **Messages**: Total messages by event type
- **Message Duration**: Processing time per event type

### Network Metrics

- **Users**: Number of users per network subnet
- **RTT**: Round trip time distribution

### File Transfer Metrics

- **Total**: Number of transfers by status
- **Size**: Distribution of file sizes
- **Duration**: Transfer duration distribution

### WebRTC Metrics

- **Connections**: Active WebRTC connections
- **Duration**: Connection duration distribution

### QUIC Metrics

- **Connections**: Active QUIC connections
- **Streams**: Active QUIC streams
- **Bytes**: Total bytes transferred by direction

### Database Metrics

- **Query Duration**: Query processing time
- **Query Total**: Total queries by operation, collection, status

## Integration with Socket.IO

Add metrics tracking to Socket.IO events:

```javascript
import metricsService from '~/services/metricsService';

// In socket.js
socket.on('message', async (data) => {
  const startTime = Date.now();
  // ... handle message
  const duration = (Date.now() - startTime) / 1000;
  metricsService.recordWebSocketMessage('message', duration);
});
```

## Custom Metrics

Add custom metrics:

```javascript
import { register } from '~/services/metricsService';

const customMetric = new client.Counter({
  name: 'custom_metric_total',
  help: 'Custom metric description',
  labelNames: ['label1', 'label2'],
});

register.registerMetric(customMetric);
```

## Alerting

### Prometheus Alerts

Create `grafana/alerts.yml`:

```yaml
groups:
  - name: network_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"
```

### Grafana Alerts

Configure alerts in Grafana dashboard:
1. Edit panel
2. Go to Alert tab
3. Configure conditions
4. Set notification channels

## Performance Considerations

1. **Metrics Collection**: Minimal overhead (~1-2ms per request)
2. **Storage**: Prometheus stores metrics efficiently
3. **Retention**: Configure retention policy in Prometheus
4. **Cardinality**: Limit label combinations to prevent high cardinality

## Troubleshooting

### Metrics Not Appearing

1. Check Prometheus is scraping: http://localhost:9090/targets
2. Verify metrics endpoint: http://localhost:666/api/v1/metrics
3. Check Grafana data source connection
4. Verify dashboard queries

### High Memory Usage

1. Reduce scrape interval
2. Limit metric retention
3. Reduce label cardinality
4. Use recording rules

## Next Steps

Ready for Phase 7: Performance Evaluation
- Performance testing suite
- Latency comparison
- Throughput testing
- Packet loss testing
- Connection setup time comparison

