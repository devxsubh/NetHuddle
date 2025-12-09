# How to Run the QUIC Streaming Server

## Quick Start

1. **Navigate to the Python server directory:**
   ```bash
   cd quic-stream/python
   ```

2. **Activate the virtual environment:**
   ```bash
   source .venv/bin/activate
   ```

3. **Run the server:**
   ```bash
   python server.py
   ```

   Or with custom options:
   ```bash
   python server.py --host 0.0.0.0 --port 4433
   ```

## Default Configuration

- **Host**: `0.0.0.0` (listens on all interfaces)
- **Port**: `4433` (default QUIC port)
- **Certificate**: `cert.pem` (already generated)
- **Private Key**: `key.pem` (already generated)

## Command Line Options

```bash
python server.py [OPTIONS]

Options:
  --host HOST          Host to bind to (default: 0.0.0.0)
  --port PORT         Port to bind to (default: 4433)
  --certificate PATH  Path to certificate file (default: cert.pem)
  --private-key PATH  Path to private key file (default: key.pem)
  --log PATH          Path to QUIC log file (optional)
```

## Examples

### Basic server (default settings)
```bash
python server.py
```

### Custom host and port
```bash
python server.py --host 127.0.0.1 --port 8443
```

### With logging
```bash
python server.py --log quic.log
```

### Custom certificates
```bash
python server.py --certificate /path/to/cert.pem --private-key /path/to/key.pem
```

## Testing the Server

Once the server is running, you can test it with:

### Health Check (using Python client)
```bash
python client.py
```

### Or using curl (if compiled with HTTP/3 support)
```bash
curl --http3 https://localhost:4433/health
```

## Server Endpoints

- `GET /health` - Health check endpoint
- `POST /stream` - Upload video stream
- `GET /stream/{stream_id}` - Get stream information

## Stopping the Server

Press `Ctrl+C` to stop the server gracefully.

## Troubleshooting

### Port already in use
If port 4433 is already in use, change it:
```bash
python server.py --port 8443
```

### Certificate errors
If you get certificate errors, regenerate them:
```bash
chmod +x generate_certificates.sh
./generate_certificates.sh
```

### Permission errors
Make sure you have permission to bind to the port. On Linux/macOS, ports below 1024 may require sudo.

