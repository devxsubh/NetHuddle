#!/bin/bash
# Generate self-signed certificates for QUIC server

echo "Generating self-signed certificates for QUIC server..."

# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/CN=localhost"

echo "Certificates generated:"
echo "  - key.pem (private key)"
echo "  - cert.pem (certificate)"
echo ""
echo "For production, use certificates from a trusted CA."

