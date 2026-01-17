import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { fileService } from '@/services/fileService';
import type { UploadProgress } from '@/types';

interface FileUploadProps {
  boxId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export function FileUpload({ boxId, isOpen, onClose, onUploadComplete }: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: UploadProgress[] = acceptedFiles.map((file) => ({
      fileId: Math.random().toString(36).substring(7),
      fileName: file.name,
      progress: 0,
      status: 'pending',
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeUpload = (fileId: string) => {
    setUploads((prev) => prev.filter((u) => u.fileId !== fileId));
  };

  const startUpload = async () => {
    if (uploads.length === 0) return;

    setIsUploading(true);
    const pendingUploads = uploads.filter((u) => u.status === 'pending');

    for (const upload of pendingUploads) {
      try {
        // Find the actual file from dropzone
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const files = fileInput?.files;
        const file = files ? Array.from(files).find((f) => f.name === upload.fileName) : null;

        if (!file) {
          setUploads((prev) =>
            prev.map((u) =>
              u.fileId === upload.fileId
                ? { ...u, status: 'error', error: 'File not found' }
                : u
            )
          );
          continue;
        }

        setUploads((prev) =>
          prev.map((u) => (u.fileId === upload.fileId ? { ...u, status: 'uploading' } : u))
        );

        await fileService.uploadFile(boxId, file, (progress) => {
          setUploads((prev) =>
            prev.map((u) => (u.fileId === upload.fileId ? { ...u, progress } : u))
          );
        });

        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === upload.fileId ? { ...u, status: 'completed', progress: 100 } : u
          )
        );
      } catch (error: any) {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === upload.fileId
              ? { ...u, status: 'error', error: error.message || 'Upload failed' }
              : u
          )
        );
      }
    }

    setIsUploading(false);

    const completed = uploads.filter((u) => u.status === 'completed').length;
    const failed = uploads.filter((u) => u.status === 'error').length;

    if (completed > 0) {
      toast.success(`${completed} file(s) uploaded successfully`);
      onUploadComplete();
    }
    if (failed > 0) {
      toast.error(`${failed} file(s) failed to upload`);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploads([]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Files" size="lg">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-slate-300 hover:border-primary-400 dark:border-slate-600'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={clsx(
            'mb-4 h-12 w-12',
            isDragActive ? 'text-primary-500' : 'text-slate-400'
          )}
        />
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          {isDragActive ? (
            'Drop files here...'
          ) : (
            <>
              Drag and drop files here, or <span className="text-primary-600">browse</span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-400">Maximum file size: 100 MB</p>
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
          {uploads.map((upload) => (
            <div
              key={upload.fileId}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <FileIcon className="h-5 w-5 flex-shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {upload.fileName}
                </p>
                {upload.status === 'uploading' && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === 'error' && (
                  <p className="mt-0.5 text-xs text-red-500">{upload.error}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {upload.status === 'pending' && (
                  <button
                    onClick={() => removeUpload(upload.fileId)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {upload.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                )}
                {upload.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          onClick={startUpload}
          disabled={uploads.length === 0 || isUploading}
          isLoading={isUploading}
        >
          Upload {uploads.filter((u) => u.status === 'pending').length} file(s)
        </Button>
      </ModalFooter>
    </Modal>
  );
}
