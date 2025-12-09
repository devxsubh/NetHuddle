"use client";

import { useGetNetworkFilesQuery } from "@/lib/client/rtk-query/fileTransfer.api";
import { useSocket } from "@/context/socket.context";
import { useEffect, useState, useRef } from "react";
import { CircleLoading } from "@/components/shared/CircleLoading";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_AVATAR } from "@/constants";
import Image from "next/image";
import toast from "react-hot-toast";
import { transferFileViaWebSocket } from "@/lib/shared/utils/fileTransfer";

export const NetworkFiles = () => {
  const { data, isLoading, error, refetch } = useGetNetworkFilesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const socket = useSocket();
  const [files, setFiles] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { file: File; progress: number }>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update files from query
  useEffect(() => {
    if (data?.success && data.data?.files) {
      setFiles(data.data.files);
    }
  }, [data]);

  // Listen for new file shares
  useEffect(() => {
    if (!socket) return;

    const handleFileCompleted = (data: any) => {
      if (data.isNetworkShare) {
        // Refetch to get updated list
        refetch();
        toast.success(`New file shared: ${data.fileName}`);
      }
    };

    socket.on('file:transfer:completed', handleFileCompleted);

    return () => {
      socket.off('file:transfer:completed', handleFileCompleted);
    };
  }, [socket, refetch]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📄';
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
      const fullUrl = `${baseUrl}${filePath}`;
      
      // Fetch the file
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded: ${fileName}`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`Failed to download file: ${error.message}`);
      
      // Fallback: open in new tab
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
      const fullUrl = `${baseUrl}${filePath}`;
      window.open(fullUrl, '_blank');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !socket) return;

    Array.from(selectedFiles).forEach(async (file) => {
      const transferId = `upload-${Date.now()}-${Math.random()}`;
      
      setUploadingFiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(transferId, {
          file,
          progress: 0,
        });
        return newMap;
      });

      try {
        // Share to network (no recipientId or roomId)
        await transferFileViaWebSocket({
          file,
          socket,
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
          onComplete: () => {
            setUploadingFiles((prev) => {
              const newMap = new Map(prev);
              newMap.delete(transferId);
              return newMap;
            });
            toast.success(`File shared to network: ${file.name}`);
            refetch();
          },
          onError: (error) => {
            setUploadingFiles((prev) => {
              const newMap = new Map(prev);
              newMap.delete(transferId);
              return newMap;
            });
            toast.error(`Failed to share file: ${error.message}`);
          },
        });
      } catch (error: any) {
        setUploadingFiles((prev) => {
          const newMap = new Map(prev);
          newMap.delete(transferId);
          return newMap;
        });
        toast.error(`Failed to share file: ${error.message}`);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <CircleLoading size="6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        Failed to load network files. Please try again.
      </div>
    );
  }

  const networkInfo = data?.success ? data.data?.networkInfo : null;

  return (
    <div className="flex flex-col gap-y-4">
      {/* Network Info and Upload */}
      {networkInfo && (
        <div className="p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-text mb-1">Network Files</h3>
              <p className="text-sm text-secondary-darker">
                {networkInfo.totalFiles} file{networkInfo.totalFiles !== 1 ? 's' : ''} shared on {networkInfo.networkSubnet}
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="network-file-upload"
              />
              <label
                htmlFor="network-file-upload"
                className="inline-flex items-center gap-x-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg cursor-pointer transition-colors text-sm font-medium"
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
                Share File
              </label>
            </div>
          </div>
          
          {/* Uploading Files */}
          {uploadingFiles.size > 0 && (
            <div className="mt-3 space-y-2">
              {Array.from(uploadingFiles.entries()).map(([id, data]) => (
                <div key={id} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text truncate">{data.file.name}</span>
                    <span className="text-secondary-darker">{data.progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary-darker rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${data.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Files List */}
      <AnimatePresence>
        {files.length > 0 ? (
          <div className="flex flex-col gap-y-2">
            {files.map((file) => {
              const avatarUrl = file.uploadedBy.avatarUrl || 
                (file.uploadedBy.avatar 
                  ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/images/${file.uploadedBy.avatar}`
                  : DEFAULT_AVATAR);

              return (
                <motion.div
                  key={file.transferId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-secondary-dark rounded-lg border border-border hover:border-primary transition-colors"
                >
                  <div className="flex items-start gap-x-4">
                    {/* File Icon */}
                    <div className="text-4xl flex-shrink-0">
                      {getFileIcon(file.fileType)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-x-2 mb-2">
                        <h4 className="text-sm font-semibold text-text truncate">
                          {file.fileName}
                        </h4>
                        <span className="text-xs text-secondary-darker">
                          {formatFileSize(file.fileSize)}
                        </span>
                      </div>

                      {/* Uploaded By */}
                      <div className="flex items-center gap-x-2 mb-3">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={avatarUrl}
                            alt={file.uploadedBy.userName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-xs text-secondary-darker">
                          by {file.uploadedBy.userName || `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`}
                        </span>
                        <span className="text-xs text-secondary-darker">
                          • {new Date(file.uploadedAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Download Button */}
                      <div className="flex items-center gap-x-2">
                        <button
                          onClick={() => handleDownload(file.filePath, file.fileName)}
                          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-x-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                            />
                          </svg>
                          Download
                        </button>
                        <a
                          href={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}${file.filePath}`}
                          download={file.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-secondary hover:bg-secondary-dark text-text rounded-lg transition-colors text-sm flex items-center gap-x-1"
                          title="Open in new tab"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary-darker">
            <p>No files shared in your network yet.</p>
            <p className="text-sm mt-2">Upload a file to share it with everyone on your network!</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

