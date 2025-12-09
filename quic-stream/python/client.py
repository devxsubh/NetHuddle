#!/usr/bin/env python3
"""
QUIC Streaming Client
Example client for connecting to QUIC streaming server
"""

import asyncio
import logging
import ssl
import sys
from typing import Optional

from aioquic.asyncio import connect
from aioquic.h3.connection import H3_ALPN
from aioquic.h3.events import DataReceived, HeadersReceived, H3Event
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import QuicEvent

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("quic_client")


class QuicClientProtocol:
    """QUIC client protocol handler"""

    def __init__(self, quic: "QuicConnection"):
        self.quic = quic
        self._http: Optional["H3Connection"] = None
        self._response_headers: Optional[dict] = None
        self._response_data: bytes = b""
        self._stream_id: Optional[int] = None

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
            self._response_headers = {h[0].decode(): h[1].decode() for h in event.headers}
            logger.info(f"Response headers: {self._response_headers}")
        elif isinstance(event, DataReceived):
            self._response_data += event.data
            logger.info(f"Received {len(event.data)} bytes")

    async def send_request(self, method: str, path: str, data: Optional[bytes] = None) -> tuple[dict, bytes]:
        """Send HTTP/3 request"""
        # Open stream
        self._stream_id = self.quic.get_next_available_stream_id()

        # Send headers
        headers = [
            (b":method", method.encode()),
            (b":path", path.encode()),
            (b":scheme", b"https"),
            (b":authority", b"localhost:4433"),
        ]

        self._http.send_headers(stream_id=self._stream_id, headers=headers)

        # Send data if provided
        if data:
            self._http.send_data(stream_id=self._stream_id, data=data, end_stream=True)
        else:
            self._http.send_data(stream_id=self._stream_id, data=b"", end_stream=True)

        # Wait for response
        await asyncio.sleep(1)  # Give time for response

        return self._response_headers or {}, self._response_data


async def main():
    """Main client function"""
    import argparse

    parser = argparse.ArgumentParser(description="QUIC Streaming Client")
    parser.add_argument(
        "--host",
        type=str,
        default="localhost",
        help="Server host (default: localhost)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=4433,
        help="Server port (default: 4433)",
    )
    parser.add_argument(
        "--ca-certs",
        type=str,
        help="Path to CA certificates file",
    )

    args = parser.parse_args()

    # Create QUIC configuration
    configuration = QuicConfiguration(
        is_client=True,
        alpn_protocols=H3_ALPN,
    )

    # Load CA certificates if provided
    if args.ca_certs:
        configuration.load_verify_locations(args.ca_certs)

    # For self-signed certificates, disable verification (development only)
    # In production, use proper CA certificates
    configuration.verify_mode = ssl.CERT_NONE

    logger.info(f"Connecting to {args.host}:{args.port}")

    # Connect to server
    async with connect(
        args.host,
        args.port,
        configuration=configuration,
        create_protocol=QuicClientProtocol,
    ) as protocol:
        logger.info("Connected to QUIC server")

        # Send health check request
        headers, body = await protocol.send_request("GET", "/health")
        logger.info(f"Health check response: {body.decode()}")

        # Example: Send video stream
        # video_data = b"fake video data"
        # headers, body = await protocol.send_request("POST", "/stream", video_data)
        # logger.info(f"Stream response: {body.decode()}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Client stopped")
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)

