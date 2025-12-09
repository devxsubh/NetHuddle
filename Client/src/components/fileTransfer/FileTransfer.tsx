"use client";

import { transferFileViaWebSocket } from "@/lib/shared/utils/fileTransfer";
import { useSocket } from "@/context/socket.context";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useGetMyTransfersQuery } from "@/lib/client/rtk-query/fileTransfer.api";

interface FileTransferProps {
  recipientId?: string;
  roomId?: string;
}

export const FileTransfer = ({ recipientId, roomId }: FileTransferProps) => {
  const socket = useSocket();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { file: File; progress: number; status: 'uploading' | 'completed' | 'error' }>>(new Map());
  const [receivingFiles, setReceivingFiles] = useState<Map<string, { fileName: string; fileSize: number; progress: number; status: 'receiving' | 'completed' | 'error' }>>(new Map());

  const { data: transfersData, refetch } = useGetMyTransfersQuery();

  // Listen for incoming file transfers
  useEffect(() => {
    if (!socket) return;

    const handleFileTransferStart = (data: any) => {
      if (data.recipientId === recipientId || data.roomId === roomId) {
        setReceivingFiles((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.transferId, {
            fileName: data.fileName,
            fileSize: data.fileSize,
            progress: 0,
            status: 'receiving',
          });
          return newMap;
        });
      }
    };

    const handleFileTransferProgress = (data: any) => {
      setReceivingFiles((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.transferId);
        if (existing) {
          newMap.set(data.transferId, {
            ...existing,
            progress: data.progress || 0,
          });
        }
        return newMap;
      });
    };

    const handleFileTransferCompleted = (data: any) => {
      setReceivingFiles((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.transferId);
        if (existing) {
          newMap.set(data.transferId, {
            ...existing,
            progress: 100,
            status: 'completed',
          });
        }
        return newMap;
      });
      toast.success(`File received: ${data.fileName}`);
      refetch();
    };

    const handleFileTransferError = (data: any) => {
      setReceivingFiles((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.transferId);
        if (existing) {
          newMap.set(data.transferId, {
            ...existing,
            status: 'error',
          });
        }
        return newMap;
      });
      toast.error(`File transfer failed: ${data.error || 'Unknown error'}`);
    };

    socket.on('file:transfer:start', handleFileTransferStart);
    socket.on('file:transfer:progress', handleFileTransferProgress);
    socket.on('file:transfer:completed', handleFileTransferCompleted);
    socket.on('file:transfer:error', handleFileTransferError);

    return () => {
      socket.off('file:transfer:start', handleFileTransferStart);
      socket.off('file:transfer:progress', handleFileTransferProgress);
      socket.off('file:transfer:completed', handleFileTransferCompleted);
      socket.off('file:transfer:error', handleFileTransferError);
    };
  }, [socket, recipientId, roomId, refetch]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !socket) return;

    Array.from(files).forEach(async (file) => {
      const transferId = `upload-${Date.now()}-${Math.random()}`;
      
      setUploadingFiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(transferId, {
          file,
          progress: 0,
          status: 'uploading',
        });
        return newMap;
      });

      try {
        await transferFileViaWebSocket({
          file,
          socket,
          recipientId,
          roomId,
          onProgress: (progress) => {
            setUploadingFiles((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(transferId);
              if (existing) {
                newMap.set(transferId, {
                  ...existing,
                  progress,
                });
              }
              return newMap;
            });
          },
          onComplete: (filePath) => {
            setUploadingFiles((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(transferId);
              if (existing) {
                newMap.set(transferId, {
                  ...existing,
                  progress: 100,
                  status: 'completed',
                });
              }
              return newMap;
            });
            toast.success(`File sent: ${file.name}`);
            refetch();
          },
          onError: (error) => {
            setUploadingFiles((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(transferId);
              if (existing) {
                newMap.set(transferId, {
                  ...existing,
                  status: 'error',
                });
              }
              return newMap;
            });
            toast.error(`Failed to send file: ${error.message}`);
          },
        });
      } catch (error: any) {
        setUploadingFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(transferId);
          if (existing) {
            newMap.set(transferId, {
              ...existing,
              status: 'error',
            });
          }
          return newMap;
        });
        toast.error(`Failed to send file: ${error.message}`);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const allFiles = [
    ...Array.from(uploadingFiles.entries()).map(([id, data]) => ({
      id,
      name: data.file.name,
      size: data.file.size,
      progress: data.progress,
      status: data.status,
      type: 'upload' as const,
    })),
    ...Array.from(receivingFiles.entries()).map(([id, data]) => ({
      id,
      name: data.fileName,
      size: data.fileSize,
      progress: data.progress,
      status: data.status,
      type: 'download' as const,
    })),
  ];

  return (
    <div className="flex flex-col gap-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center gap-x-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg cursor-pointer transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372l-10.94 10.94a4.5 4.5 0 01-6.364-6.364l7.693-7.693m0 0l3 3m-3-3l-3 3"
            />
          </svg>
          Upload Files
        </label>
      </div>

      {/* File Transfer List */}
      <AnimatePresence>
        {allFiles.length > 0 && (
          <div className="flex flex-col gap-y-2">
            <h3 className="text-sm font-semibold text-text">Active Transfers</h3>
            {allFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-secondary-dark rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-x-2 flex-1 min-w-0">
                    <span className="text-sm font-medium text-text truncate">
                      {file.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      file.type === 'upload'
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'bg-green-500/20 text-green-500'
                    }`}>
                      {file.type === 'upload' ? '↑ Upload' : '↓ Download'}
                    </span>
                  </div>
                  <span className="text-xs text-secondary-darker">
                    {formatFileSize(file.size)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-secondary-darker rounded-full h-2 mb-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${file.progress}%` }}
                    className={`h-2 rounded-full ${
                      file.status === 'error'
                        ? 'bg-red-500'
                        : file.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-primary'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary-darker">
                    {file.progress.toFixed(1)}%
                  </span>
                  {file.status === 'completed' && (
                    <span className="text-xs text-green-500">✓ Completed</span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs text-red-500">✗ Failed</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

