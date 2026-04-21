import * as React from 'react';
import styles from '../Agent.module.scss';

// ── 图片 Lightbox 大图预览 ──

const ImageLightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div className={styles.lightbox} onClick={onClose}>
    <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
      <button className={styles.lightboxClose} onClick={onClose}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <img src={src} alt="预览图片" className={styles.lightboxImg} />
    </div>
  </div>
);

// ── 消息中的图片缩略图（可点击预览） ──

export const MessageImage: React.FC<{ src: string }> = ({ src }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className={styles.messageImage} onClick={() => setOpen(true)}>
        <img src={src} alt="上传的图片" className={styles.messageImageThumb} />
        <div className={styles.messageImageOverlay}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      </div>
      {open && <ImageLightbox src={src} onClose={() => setOpen(false)} />}
    </>
  );
};
