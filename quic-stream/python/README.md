# QUIC Streaming Server (Python)

Low-latency video streaming server using QUIC (HTTP/3) protocol implemented in Python with aioquic.

## Features

- ✅ QUIC/HTTP/3 server
- ✅ Video stream handling
- ✅ Low-latency streaming
- ✅ Multiplexed streams
- ✅ 0-RTT connection setup
- ✅ Built-in encryption (TLS 1.3)

## Installation

### 1. Create virtual environment

```bash
cd quic-stream/python
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Generate certificates

QUIC requires TLS certificates. Generate self-signed certificates for development:

```bash
chmod +x generate_certificates.sh
./generate_certificates.sh
```

Or manually:

```bash
openssl genrsa -out key.pem 2048
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/CN=localhost"
```

## Usage

### Start Server

```bash
python server.py --host 0.0.0.0 --port 4433
```

### With custom certificates

```bash
python server.py --host 0.0.0.0 --port 4433 --certificate /path/to/cert.pem --private-key /path/to/key.pem
```

### With logging

```bash
python server.py --host 0.0.0.0 --port 4433 --log quic.log
```

## API Endpoints

### Health Check

```bash
curl --http3 https://localhost:4433/health
```

### Stream Video

```bash
# Upload video stream
curl --http3 -X POST https://localhost:4433/stream -d @video.mp4
```

### Get Stream Info

```bash
curl --http3 https://localhost:4433/stream/123
```

## Client Implementation

### Python Client

See `client.py` for example client implementation.

### JavaScript/TypeScript Client

Browsers don't directly support QUIC, but you can use:
- HTTP/3 fetch API (limited browser support)
- WebTransport API (experimental)
- Proxy through WebSocket

## Architecture

```
Client → QUIC Connection → HTTP/3 → VideoStreamHandler → Frame Processing
```

## Performance

- **Latency**: < 100ms (target)
- **Throughput**: > 10 Mbps
- **Connection Setup**: < 50ms (0-RTT)
- **Multiplexing**: Multiple streams per connection

## Why QUIC?

1. **0-RTT Connection Setup**: Faster than TCP handshake
2. **Multiplexing**: No head-of-line blocking
3. **Built-in Encryption**: TLS 1.3
4. **Connection Migration**: Handles network changes
5. **Better Congestion Control**: Improved over TCP

## Development

### Testing

```bash
# Test with curl (if compiled with HTTP/3 support)
curl --http3 https://localhost:4433/health

# Or use aioquic client
python client.py
```

### Debugging

Enable verbose logging:

```python
logging.basicConfig(level=logging.DEBUG)
```

## Production Deployment

1. **Use proper certificates**: Get certificates from Let's Encrypt or trusted CA
2. **Configure firewall**: Open UDP port 4433
3. **Load balancing**: Use multiple instances
4. **Monitoring**: Set up metrics and logging
5. **Rate limiting**: Implement to prevent abuse

## Troubleshooting

### Certificate errors

- Ensure certificates are valid
- Check certificate expiration
- Verify certificate chain

### Connection failures

- Check firewall (UDP port 4433)
- Verify network connectivity
- Check server logs

### Performance issues

- Monitor CPU usage
- Check bandwidth
- Optimize video encoding

## Next Steps

- [ ] Add video encoding (H.264/VP9)
- [ ] Implement frame buffering
- [ ] Add stream quality adaptation
- [ ] Implement authentication
- [ ] Add metrics collection
- [ ] Create WebTransport client

