"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useGetQuicServerInfoQuery, useCreateStreamingSessionMutation } from "@/lib/client/rtk-query/quic.api";
import { QuicClient, QuicConnectionStats, isWebTransportSupported, createQuicClient, QuicWebSocketProxy } from "@/lib/shared/utils/quicClient";
import { createFrameCaptureLoop, getUserMediaStream, getVideoDevices } from "@/lib/shared/utils/videoEncoder";
import { VideoStreamDisplay } from "@/components/quic/VideoStreamDisplay";
import { QuicMetrics } from "@/components/quic/QuicMetrics";
import toast from "react-hot-toast";
import { CircleLoading } from "@/components/shared/CircleLoading";

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const QuicStreamingClient = () => {
  // API hooks
  const { data: serverInfo, isLoading: isLoadingServerInfo } = useGetQuicServerInfoQuery();
  const [createSession, { isLoading: isCreatingSession }] = useCreateStreamingSessionMutation();

  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionDuration, setConnectionDuration] = useState(0);
  const [stats, setStats] = useState<QuicConnectionStats>({
    connectionTime: 0,
    bytesSent: 0,
    bytesReceived: 0,
    latency: 0,
    framesSent: 0,
    framesReceived: 0,
  });
  const [receivedFrame, setReceivedFrame] = useState<ArrayBuffer | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const quicClientRef = useRef<QuicClient | QuicWebSocketProxy | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopCaptureRef = useRef<(() => void) | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load available video devices
  useEffect(() => {
    getVideoDevices().then(setAvailableDevices);
  }, []);

  // Update connection duration
  useEffect(() => {
    if (connectionStatus === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        if (connectionStartTimeRef.current > 0) {
          setConnectionDuration(Math.floor((Date.now() - connectionStartTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setConnectionDuration(0);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [connectionStatus]);

  // Update stats periodically
  useEffect(() => {
    if (connectionStatus === 'connected' && quicClientRef.current) {
      statsIntervalRef.current = setInterval(() => {
        const client = quicClientRef.current;
        if (client && client.getIsConnected && client.getIsConnected()) {
          if (client.getConnectionStats) {
            setStats(client.getConnectionStats());
          }
        }
      }, 1000);
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [connectionStatus]);

  // Start camera
  const handleStartCamera = async () => {
    try {
      // Check secure context for camera access
      if (typeof window !== 'undefined') {
        const isSecureContext = window.isSecureContext || 
          window.location.protocol === 'https:' || 
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1';
        
        if (!isSecureContext) {
          const errorMsg = `Camera access requires HTTPS. You are accessing via ${window.location.protocol}//${window.location.hostname}. Please use HTTPS or access via localhost/127.0.0.1.`;
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }
      }

      const stream = await getUserMediaStream(selectedDeviceId);
      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play();
      }

      setCameraActive(true);
      toast.success("Camera started");
    } catch (error: any) {
      console.error("Error starting camera:", error);
      let errorMessage = error.message || "Failed to access camera";
      
      // Provide helpful error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. Please connect a camera device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.message?.includes('secure context') || error.message?.includes('HTTPS')) {
        errorMessage = `Camera access requires HTTPS. Please use HTTPS or access via localhost.`;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Stop camera
  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setIsStreaming(false);
    if (stopCaptureRef.current) {
      stopCaptureRef.current();
      stopCaptureRef.current = null;
    }
  };

  // Connect to QUIC server
  const handleConnect = async () => {
    if (!serverInfo) {
      toast.error("Server info not available");
      return;
    }

    // Check WebTransport support
    if (!isWebTransportSupported()) {
      const isSecureContext = typeof window !== 'undefined' && 
        (window.isSecureContext || 
         window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1');
      
      const errorMsg = isSecureContext
        ? 'WebTransport is not supported in this browser. Please use Chrome 97+, Edge 97+, or a browser with WebTransport support.'
        : `WebTransport requires HTTPS. You are accessing via ${window.location.protocol}//${window.location.hostname}. Please use HTTPS or access via localhost/127.0.0.1.`;
      
      setConnectionStatus('error');
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Create streaming session
      const session = await createSession({}).unwrap();
      setSessionToken(session.sessionToken);

      // Create QUIC client using factory function
      const quicUrl = session.quicServer.webTransportUrl;
      const client = createQuicClient(quicUrl);
      
      // Set up callbacks (both QuicClient and QuicWebSocketProxy support the same interface)
      client.setCallbacks({
        onConnected: () => {
          setConnectionStatus('connected');
          connectionStartTimeRef.current = Date.now();
          const isWebSocket = !(client instanceof QuicClient);
          toast.success(isWebSocket 
            ? "Connected via WebSocket proxy (WebTransport not available)" 
            : "Connected to QUIC server");
        },
        onDisconnected: () => {
          setConnectionStatus('disconnected');
          toast.info("Disconnected from QUIC server");
        },
        onError: (error) => {
          setConnectionStatus('error');
          setError(error.message);
          toast.error(`Connection error: ${error.message}`);
        },
        onData: (data) => {
          setReceivedFrame(data);
        },
      });

      // Store client reference
      if (client instanceof QuicClient) {
        quicClientRef.current = client;
      }

      // Connect - handle both QuicClient and QuicWebSocketProxy
      if (client instanceof QuicClient) {
        await client.connect(quicUrl, session.sessionToken);
      } else {
        // For WebSocket proxy, convert QUIC URL to WebSocket URL
        const wsClient = client as QuicWebSocketProxy;
        const wsUrl = quicUrl.replace('quic://', 'ws://').replace('https://', 'wss://');
        await wsClient.connect(wsUrl, session.sessionToken);
      }
    } catch (error: any) {
      console.error("Error connecting to QUIC server:", error);
      setConnectionStatus('error');
      const errorMessage = error.message || "Failed to connect to QUIC server";
      setError(errorMessage);
      
      // Provide helpful error message
      if (errorMessage.includes('WebTransport') || errorMessage.includes('not defined')) {
        const helpfulMsg = `WebTransport is not available. ${typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' ? 'Please use HTTPS or localhost.' : 'Please use a browser that supports WebTransport (Chrome 97+, Edge 97+).'}`;
        toast.error(helpfulMsg);
        setError(helpfulMsg);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Disconnect from QUIC server
  const handleDisconnect = async () => {
    // Store reference before clearing
    const client = quicClientRef.current;
    
    if (client) {
      await client.close();
      quicClientRef.current = null;
    }

    setConnectionStatus('disconnected');
    setSessionToken(null);
    setIsStreaming(false);
    setReceivedFrame(null);

    if (stopCaptureRef.current) {
      stopCaptureRef.current();
      stopCaptureRef.current = null;
    }
  };

  // Start streaming
  const handleStartStreaming = () => {
    if (!cameraActive || !localVideoRef.current || !quicClientRef.current) {
      toast.error("Camera and connection must be active");
      return;
    }

    const client = quicClientRef.current;
    if (client && client.getIsConnected()) {
      const stopCapture = createFrameCaptureLoop(localVideoRef.current, {
        fps: 30,
        format: 'webp',
        quality: 0.8,
        onFrame: async (frame) => {
          if (client && client.getIsConnected()) {
            try {
              await client.sendStream(frame);
            } catch (error) {
              console.error("Error sending frame:", error);
            }
          }
        },
        onError: (error) => {
          console.error("Frame capture error:", error);
          toast.error("Error capturing frame");
        },
      });

      stopCaptureRef.current = stopCapture;
      setIsStreaming(true);
      toast.success("Streaming started");
    } else {
      toast.error("Not connected to server");
    }
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (stopCaptureRef.current) {
      stopCaptureRef.current();
      stopCaptureRef.current = null;
    }
    setIsStreaming(false);
    toast.info("Streaming stopped");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleDisconnect();
      handleStopCamera();
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoadingServerInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <CircleLoading size="8" />
      </div>
    );
  }

  // Check WebTransport and HTTPS support
  const webTransportSupported = isWebTransportSupported();
  const isSecureContext = typeof window !== 'undefined' && 
    (window.isSecureContext || 
     window.location.protocol === 'https:' || 
     window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');

  return (
    <div className="w-full space-y-6">
      {/* WebTransport Support Warning */}
      {(!webTransportSupported || !isSecureContext) && (
        <div className={`p-4 rounded-lg border-2 ${
          !isSecureContext 
            ? 'bg-yellow-500/20 border-yellow-500' 
            : 'bg-orange-500/20 border-orange-500'
        }`}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-text mb-1">
                {!isSecureContext ? 'HTTPS Required' : 'WebTransport Not Available'}
              </h3>
              <p className="text-sm text-secondary-darker">
                {!isSecureContext ? (
                  <>
                    QUIC streaming requires HTTPS. You are accessing via <strong>{window.location.protocol}//{window.location.hostname}</strong>.
                    <br />
                    <strong>Solutions:</strong>
                    <br />
                    1. Use HTTPS: <code className="bg-secondary-dark px-1 rounded">https://{window.location.hostname}</code>
                    <br />
                    2. Use localhost: <code className="bg-secondary-dark px-1 rounded">http://localhost{window.location.port ? ':' + window.location.port : ''}</code>
                    <br />
                    3. For development, map IP to localhost in <code className="bg-secondary-dark px-1 rounded">/etc/hosts</code>
                  </>
                ) : (
                  <>
                    WebTransport is not supported in this browser. Please use Chrome 97+, Edge 97+, or a browser with WebTransport support.
                    <br />
                    The connection will fallback to WebSocket proxy if available.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm text-secondary-darker capitalize">{connectionStatus}</span>
          </div>
          {webTransportSupported && (
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded">
              WebTransport ✓
            </span>
          )}
        </div>
        {error && (
          <div className="text-sm text-red-500 max-w-md truncate" title={error}>
            {error}
          </div>
        )}
      </div>

      {/* Metrics */}
        {connectionStatus === 'connected' && (
          <QuicMetrics stats={stats} connectionDuration={connectionDuration} />
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Local Video & Controls */}
          <div className="space-y-4">
            <div className="bg-secondary rounded-lg p-4">
              <h2 className="text-lg font-semibold text-text mb-4">Local Video</h2>
              
              {/* Video Preview */}
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary-dark">
                    <p className="text-secondary-darker">Camera not active</p>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="space-y-3">
                {/* Device Selection */}
                {availableDevices.length > 0 && (
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => setSelectedDeviceId(e.target.value || undefined)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text"
                    disabled={cameraActive}
                  >
                    <option value="">Default Camera</option>
                    {availableDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                )}

                {/* Camera Buttons */}
                <div className="flex gap-2">
                  {!cameraActive ? (
                    <button
                      onClick={handleStartCamera}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Start Camera
                    </button>
                  ) : (
                    <button
                      onClick={handleStopCamera}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Connection Controls */}
            <div className="bg-secondary rounded-lg p-4">
              <h2 className="text-lg font-semibold text-text mb-4">Connection</h2>
              
              {serverInfo && (
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-darker">Server:</span>
                    <span className="text-text">{serverInfo.host}:{serverInfo.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-darker">Protocol:</span>
                    <span className="text-text">{serverInfo.protocol}</span>
                  </div>
                  {sessionToken && (
                    <div className="flex justify-between">
                      <span className="text-secondary-darker">Token:</span>
                      <span className="text-text font-mono text-xs">
                        {sessionToken.slice(0, 8)}...{sessionToken.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
                  <button
                    onClick={handleConnect}
                    disabled={isCreatingSession || !serverInfo}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {isCreatingSession ? "Connecting..." : "Connect"}
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Streaming Controls */}
            {connectionStatus === 'connected' && (
              <div className="bg-secondary rounded-lg p-4">
                <h2 className="text-lg font-semibold text-text mb-4">Streaming</h2>
                <div className="flex gap-2">
                  {!isStreaming ? (
                    <button
                      onClick={handleStartStreaming}
                      disabled={!cameraActive}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      Start Streaming
                    </button>
                  ) : (
                    <button
                      onClick={handleStopStreaming}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Stop Streaming
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Remote Video */}
          <div className="space-y-4">
            <div className="bg-secondary-dark rounded-lg p-4 border border-border">
              <h2 className="text-lg font-semibold text-text mb-4">Remote Stream</h2>
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                <VideoStreamDisplay
                  streamData={receivedFrame}
                  isLoading={connectionStatus === 'connected' && isStreaming && !receivedFrame}
                  error={connectionStatus === 'error' ? error : null}
                />
                {connectionStatus === 'connected' && !isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary-dark">
                    <div className="text-center text-secondary-darker">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-16 h-16 mx-auto mb-2 opacity-50"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
                      <p className="text-sm">Waiting for remote stream</p>
                      <p className="text-xs mt-1">Start streaming to receive video</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && connectionStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500 rounded-lg p-4"
          >
            <p className="text-red-500 font-medium">Error</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
            <button
              onClick={() => {
                setError(null);
                if (connectionStatus === 'error') {
                  handleConnect();
                }
              }}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Retry
            </button>
          </motion.div>
        )}
    </div>
  );
};

