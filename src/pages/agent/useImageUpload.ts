import { useState, useRef, useCallback } from 'react';
import type { FileUIPart } from 'ai';

/**
 * 图片上传 Hook — 管理文件选择、预览、FileUIPart 构建
 */
export function useImageUpload() {
  const [pendingFilePart, setPendingFilePart] = useState<FileUIPart | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingImagePreview(dataUrl);
      setPendingFileName(file.name);
      setPendingFilePart({
        type: 'file',
        mediaType: file.type,
        url: dataUrl,
      });
    };
    reader.readAsDataURL(file);

    // 重置 input，允许重复选择同一文件
    e.target.value = '';
  }, []);

  const clearImage = useCallback(() => {
    setPendingFilePart(null);
    setPendingImagePreview(null);
    setPendingFileName(undefined);
  }, []);

  return {
    pendingFilePart,
    pendingImagePreview,
    pendingFileName,
    fileInputRef,
    handleImageUpload,
    clearImage,
  };
}
