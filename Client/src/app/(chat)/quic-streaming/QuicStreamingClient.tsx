"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useGetQuicServerInfoQuery, useCreateStreamingSessionMutation } from "@/lib/client/rtk-query/quic.api";
import { QuicClient, QuicConnectionStats } from "@/lib/shared/utils/quicClient";
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
  const quicClientRef = useRef<QuicClient | null>(null);
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
        if (quicClientRef.current) {
          setStats(quicClientRef.current.getConnectionStats());
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
      setError(error.message || "Failed to access camera");
      toast.error("Failed to access camera. Please check permissions.");
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

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Create streaming session
      const session = await createSession({}).unwrap();
      setSessionToken(session.sessionToken);

      // Create QUIC client
      const client = new QuicClient();
      quicClientRef.current = client;

      // Set up callbacks
      client.setCallbacks({
        onConnected: () => {
          setConnectionStatus('connected');
          connectionStartTimeRef.current = Date.now();
          toast.success("Connected to QUIC server");
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

      // Connect
      await client.connect(session.quicServer.webTransportUrl, session.sessionToken);
    } catch (error: any) {
      console.error("Error connecting to QUIC server:", error);
      setConnectionStatus('error');
      setError(error.message || "Failed to connect to QUIC server");
      toast.error("Failed to connect to QUIC server");
    }
  };

  // Disconnect from QUIC server
  const handleDisconnect = async () => {
    if (quicClientRef.current) {
      await quicClientRef.current.close();
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

    if (quicClientRef.current.getIsConnected()) {
      const stopCapture = createFrameCaptureLoop(localVideoRef.current, {
        fps: 30,
        format: 'webp',
        quality: 0.8,
        onFrame: async (frame) => {
          if (quicClientRef.current && quicClientRef.current.getIsConnected()) {
            try {
              await quicClientRef.current.sendStream(frame);
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

  return (
    <div className="h-full w-full p-4 md:p-6 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text">QUIC Video Streaming</h1>
            <p className="text-secondary-darker mt-1">Low-latency video streaming using QUIC protocol</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm text-secondary-darker capitalize">{connectionStatus}</span>
          </div>
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
            <div className="bg-secondary rounded-lg p-4">
              <h2 className="text-lg font-semibold text-text mb-4">Remote Stream</h2>
              <div className="w-full aspect-video">
                <VideoStreamDisplay
                  streamData={receivedFrame}
                  isLoading={connectionStatus === 'connecting'}
                  error={error}
                />
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
    </div>
  );
};

