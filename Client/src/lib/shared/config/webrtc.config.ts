/**
 * WebRTC Configuration
 * STUN and TURN server configuration for NAT traversal
 */

export interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Default STUN servers (public, free)
 */
const defaultSTUNServers: ICEServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * TURN servers configuration
 * For production, use your own TURN server (e.g., coturn)
 */
const getTURNServers = (): ICEServerConfig[] => {
  const turnServer = process.env.NEXT_PUBLIC_TURN_SERVER;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnServer && turnUsername && turnCredential) {
    return [
      {
        urls: turnServer,
        username: turnUsername,
        credential: turnCredential,
      },
    ];
  }

  // Return empty array if no TURN server configured
  // Note: TURN is only needed if STUN fails (symmetric NAT, firewall, etc.)
  return [];
};

/**
 * Complete ICE server configuration
 */
export const iceServers: RTCConfiguration = {
  iceServers: [
    ...defaultSTUNServers,
    ...getTURNServers(),
  ],
  iceCandidatePoolSize: 10,
};

/**
 * WebRTC constraints for media streams
 */
export const mediaConstraints: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

/**
 * Screen sharing constraints
 */
export const screenShareConstraints: MediaStreamConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  } as MediaTrackConstraints,
  audio: false, // Screen share typically doesn't include audio
};

/**
 * WebRTC connection configuration
 */
export const peerConnectionConfig: RTCConfiguration = {
  ...iceServers,
  iceTransportPolicy: 'all', // Use both STUN and TURN
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

