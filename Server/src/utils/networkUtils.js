/**
 * Extract network subnet from IP address
 * For IPv4: Returns first 3 octets (e.g., 192.168.1.0)
 * For IPv6: Returns first 64 bits (simplified)
 */
export function getNetworkSubnet(ipAddress) {
	if (!ipAddress) {
		return null;
	}

	// Handle IPv4
	if (ipAddress.includes('.')) {
		const parts = ipAddress.split('.');
		if (parts.length === 4) {
			// Return first 3 octets (class C subnet)
			return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
		}
		return ipAddress;
	}

	// Handle IPv6 (simplified - returns first 64 bits)
	if (ipAddress.includes(':')) {
		const parts = ipAddress.split(':');
		if (parts.length >= 4) {
			return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::`;
		}
		return ipAddress;
	}

	return ipAddress;
}

/**
 * Get client IP address from request
 * Handles proxies and forwarded headers
 */
export function getClientIpAddress(req) {
	// Check for forwarded IP from proxy/load balancer
	const forwarded = req.headers['x-forwarded-for'];
	if (forwarded) {
		const ips = forwarded.split(',');
		return ips[0].trim();
	}

	// Check for real IP header
	const realIp = req.headers['x-real-ip'];
	if (realIp) {
		return realIp.trim();
	}

	// Fallback to connection remote address
	return req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Check if two IP addresses are on the same network
 */
export function isSameNetwork(ip1, ip2) {
	if (!ip1 || !ip2) {
		return false;
	}

	const subnet1 = getNetworkSubnet(ip1);
	const subnet2 = getNetworkSubnet(ip2);

	return subnet1 === subnet2;
}

