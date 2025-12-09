#!/usr/bin/env python3
"""
QUIC Streaming Server
Low-latency video streaming using QUIC (HTTP/3) protocol
"""

import asyncio
import logging
import ssl
import sys
from pathlib import Path
from typing import Optional

from aioquic.asyncio import serve
from aioquic.h3.connection import H3_ALPN
from aioquic.h3.events import (
    DataReceived,
    H3Event,
    HeadersReceived,
)
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import QuicEvent
from aioquic.quic.logger import QuicFileLogger

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("quic_server")


class VideoStreamHandler:
    """Handles video streaming over QUIC"""

    def __init__(self):
        self.active_streams = {}
        self.frame_buffer = {}

    async def handle_stream(self, stream_id: int, data: bytes):
        """Handle incoming video stream data"""
        if stream_id not in self.frame_buffer:
            self.frame_buffer[stream_id] = b""

        self.frame_buffer[stream_id] += data

        # Process complete frames (assuming frame delimiter or size header)
        # For simplicity, we'll process chunks as they arrive
        return len(data)

    def get_stream_info(self, stream_id: int) -> dict:
        """Get information about a stream"""
        return self.active_streams.get(stream_id, {})


class HttpConnectionHandler:
    """HTTP/3 connection handler for QUIC"""

    def __init__(self, video_handler: VideoStreamHandler):
        self.video_handler = video_handler

    async def handle_request(
        self, stream_id: int, headers: HeadersReceived, data: bytes
    ) -> tuple[list, bytes]:
        """Handle HTTP/3 request"""
        path = None
        method = None

        # Extract path and method from headers
        for header, value in headers.headers:
            if header == b":path":
                path = value.decode()
            elif header == b":method":
                method = value.decode()

        logger.info(f"Request: {method} {path} on stream {stream_id}")

        # Handle different endpoints
        if path == "/" or path == "/health":
            return self._handle_health()
        elif path == "/stream":
            return await self._handle_stream(stream_id, data)
        elif path.startswith("/stream/"):
            stream_id_param = path.split("/")[-1]
            return await self._handle_stream_info(stream_id_param)
        else:
            return self._handle_404()

    def _handle_health(self) -> tuple[list, bytes]:
        """Health check endpoint"""
        headers = [
            (b":status", b"200"),
            (b"content-type", b"application/json"),
        ]
        body = b'{"status":"ok","service":"quic-streaming"}'
        return headers, body

    async def _handle_stream(self, stream_id: int, data: bytes) -> tuple[list, bytes]:
        """Handle video stream upload"""
        try:
            # Process video data
            bytes_received = await self.video_handler.handle_stream(stream_id, data)

            headers = [
                (b":status", b"200"),
                (b"content-type", b"application/json"),
            ]
            body = f'{{"success":true,"stream_id":{stream_id},"bytes_received":{bytes_received}}}'.encode()

            return headers, body
        except Exception as e:
            logger.error(f"Error handling stream: {e}")
            headers = [
                (b":status", b"500"),
                (b"content-type", b"application/json"),
            ]
            body = f'{{"success":false,"error":"{str(e)}"}}'.encode()
            return headers, body

    async def _handle_stream_info(self, stream_id: str) -> tuple[list, bytes]:
        """Get stream information"""
        try:
            stream_id_int = int(stream_id)
            info = self.video_handler.get_stream_info(stream_id_int)

            headers = [
                (b":status", b"200"),
                (b"content-type", b"application/json"),
            ]
            body = f'{{"stream_id":{stream_id_int},"info":{info}}}'.encode()

            return headers, body
        except (ValueError, KeyError) as e:
            headers = [
                (b":status", b"404"),
                (b"content-type", b"application/json"),
            ]
            body = f'{{"error":"Stream not found"}}'.encode()
            return headers, body

    def _handle_404(self) -> tuple[list, bytes]:
        """404 Not Found"""
        headers = [
            (b":status", b"404"),
            (b"content-type", b"application/json"),
        ]
        body = b'{"error":"Not Found"}'
        return headers, body


class QuicStreamingProtocol:
    """QUIC protocol handler for streaming"""

    def __init__(
        self,
        quic: "QuicConnection",
        stream_handler: HttpConnectionHandler,
    ):
        self.quic = quic
        self.stream_handler = stream_handler
        self._http: Optional["H3Connection"] = None

    def quic_event_received(self, event: QuicEvent) -> None:
        """Handle QUIC events"""
        if self._http is None:
            from aioquic.h3.connection import H3Connection

            self._http = H3Connection(self.quic)

        # Handle HTTP/3 events
        for http_event in self._http.handle_event(event):
            self._handle_http_event(http_event)

    def _handle_http_event(self, event: H3Event) -> None:
        """Handle HTTP/3 events"""
        if isinstance(event, HeadersReceived):
            asyncio.create_task(self._handle_request(event))
        elif isinstance(event, DataReceived):
            asyncio.create_task(self._handle_data(event))
        # Stream resets are handled at the QUIC level, not HTTP/3 level

    async def _handle_request(self, event: HeadersReceived) -> None:
        """Handle HTTP request"""
        try:
            headers, body = await self.stream_handler.handle_request(
                event.stream_id, event, b""
            )

            # Send response
            self._http.send_headers(stream_id=event.stream_id, headers=headers)
            if body:
                self._http.send_data(stream_id=event.stream_id, data=body, end_stream=True)
        except Exception as e:
            logger.error(f"Error handling request: {e}")

    async def _handle_data(self, event: DataReceived) -> None:
        """Handle incoming data"""
        try:
            headers, body = await self.stream_handler.handle_request(
                event.stream_id, HeadersReceived([], False), event.data
            )

            # Send response if needed
            if headers:
                self._http.send_headers(stream_id=event.stream_id, headers=headers)
            if body:
                self._http.send_data(stream_id=event.stream_id, data=body, end_stream=True)
        except Exception as e:
            logger.error(f"Error handling data: {e}")


def create_ssl_context(certfile: str, keyfile: str) -> ssl.SSLContext:
    """Create SSL context for QUIC"""
    context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    context.load_cert_chain(certfile, keyfile)
    return context


async def main():
    """Main server function"""
    import argparse

    parser = argparse.ArgumentParser(description="QUIC Streaming Server")
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=4433,
        help="Port to bind to (default: 4433)",
    )
    parser.add_argument(
        "--certificate",
        type=str,
        default="cert.pem",
        help="Path to certificate file (default: cert.pem)",
    )
    parser.add_argument(
        "--private-key",
        type=str,
        default="key.pem",
        help="Path to private key file (default: key.pem)",
    )
    parser.add_argument(
        "--log",
        type=str,
        help="Path to QUIC log file",
    )

    args = parser.parse_args()

    # Create SSL context
    try:
        ssl_context = create_ssl_context(args.certificate, args.private_key)
    except FileNotFoundError:
        logger.error(
            f"Certificate or key file not found. Please generate certificates first."
        )
        logger.info("Run: openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365")
        sys.exit(1)

    # Create QUIC configuration
    configuration = QuicConfiguration(
        is_client=False,
        alpn_protocols=H3_ALPN,
    )

    # Load certificate
    configuration.load_cert_chain(args.certificate, args.private_key)

    # Setup logging
    if args.log:
        configuration.secrets_log_file = open(args.log, "a")
        configuration.quic_logger = QuicFileLogger(args.log)

    # Create handlers
    video_handler = VideoStreamHandler()
    stream_handler = HttpConnectionHandler(video_handler)

    # Create protocol factory
    def create_protocol(*args, **kwargs):
        return QuicStreamingProtocol(*args, stream_handler=stream_handler)

    logger.info(f"Starting QUIC server on {args.host}:{args.port}")

    # Start server
    await serve(
        args.host,
        args.port,
        configuration=configuration,
        create_protocol=create_protocol,
    )

    logger.info("QUIC server started")
    await asyncio.Event().wait()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped")

