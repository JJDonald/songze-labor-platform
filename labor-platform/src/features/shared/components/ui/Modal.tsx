import { cn } from '@/features/shared/lib';
import { useEffect } from 'react';
import type { HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  title?: string;
  onClose?: () => void;
}

export const Modal = ({ isOpen, title, children, onClose, className, ...props }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white rounded-xl shadow-lg p-6 max-w-md w-full',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {title && (
          <h2 className="font-display text-2xl mb-4 text-text">{title}</h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};
