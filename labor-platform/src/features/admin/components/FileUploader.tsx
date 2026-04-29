import { useRef, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { API_ORIGIN } from '@/lib/api';

interface FileUploaderProps {
  accept: string;
  label: string;
  onChange: (url: string) => void;
  preview?: string;
}

export const FileUploader = ({ accept, label, onChange, preview }: FileUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await adminApi.uploadFile(file);
      if (response.code === 0 && response.data) {
        onChange(response.data.url);
      } else {
        alert(response.message || '上传失败，请重试');
      }
    } catch {
      console.error('Upload failed');
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const fullPreview = preview && !preview.startsWith('http') ? `${API_ORIGIN}${preview}` : preview;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {uploading ? '上传中...' : label}
      </button>
      {fullPreview && (
        <a href={fullPreview} target="_blank" rel="noreferrer" className="ml-3 text-sm text-brand-green">
          查看文件
        </a>
      )}
    </div>
  );
};
