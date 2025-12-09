# TURN Server Setup Guide

## Overview

TURN (Traversal Using Relays around NAT) servers are required when STUN fails, typically in scenarios with:
- Symmetric NATs
- Firewalls blocking direct connections
- Corporate networks with strict policies

## Option 1: Using coturn (Recommended)

### Installation (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install coturn
```

### Configuration

Edit `/etc/turnserver.conf`:

```conf
# Listening port
listening-port=3478

# Realm (your domain)
realm=yourdomain.com

# User credentials (username:password)
user=username:password

# External IP (if behind NAT)
external-ip=YOUR_PUBLIC_IP

# Log file
log-file=/var/log/turn.log

# Enable verbose logging
verbose

# No authentication for local network (optional)
no-auth
```

### Start coturn

```bash
sudo systemctl start coturn
sudo systemctl enable coturn
```

### Test TURN Server

```bash
turnutils_stunclient YOUR_SERVER_IP
```

## Option 2: Using Twilio STUN/TURN (Free Tier)

Twilio provides free STUN/TURN servers for development:

1. Sign up at https://www.twilio.com/
2. Get your credentials from the Twilio Console
3. Use the following configuration:

```javascript
{
  urls: 'turn:global.turn.twilio.com:3478?transport=udp',
  username: 'YOUR_TWILIO_USERNAME',
  credential: 'YOUR_TWILIO_CREDENTIAL'
}
```

## Option 3: Using Metered.ca (Free Tier)

Metered.ca provides free TURN servers:

1. Sign up at https://www.metered.ca/
2. Get your credentials
3. Use the following configuration:

```javascript
{
  urls: 'turn:YOUR_SERVER.metered.ca:80',
  username: 'YOUR_USERNAME',
  credential: 'YOUR_CREDENTIAL'
}
```

## Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_TURN_SERVER=turn:your-turn-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-password
```

## Testing TURN Server

Use this tool to test your TURN server:
https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

Enter your TURN server details and click "Gather candidates" to test connectivity.

## Docker Setup (coturn)

```dockerfile
FROM coturn/coturn:latest

COPY turnserver.conf /etc/turnserver.conf

EXPOSE 3478 3478/udp 49152-65535/udp

CMD ["turnserver", "-c", "/etc/turnserver.conf"]
```

## Security Considerations

1. **Use strong credentials**: TURN servers can be expensive if abused
2. **Rate limiting**: Implement rate limiting to prevent abuse
3. **IP whitelisting**: Restrict access to known IPs if possible
4. **Monitoring**: Monitor bandwidth usage
5. **HTTPS/TLS**: Use secure connections when possible

## Troubleshooting

### Connection fails even with TURN

1. Check firewall rules (UDP ports 3478, 49152-65535)
2. Verify TURN server is accessible from client
3. Check TURN server logs
4. Test with trickle-ice tool

### High bandwidth usage

1. Implement bandwidth limits
2. Monitor usage patterns
3. Consider using CDN for media
4. Optimize video quality/bitrate

## Production Recommendations

1. **Use dedicated TURN server**: Don't run TURN on same server as application
2. **Load balancing**: Use multiple TURN servers for redundancy
3. **Geographic distribution**: Deploy TURN servers close to users
4. **Monitoring**: Set up alerts for bandwidth/connection issues
5. **Backup providers**: Have fallback TURN servers

