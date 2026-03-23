import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useI18n } from '@/i18n'

export default function Toast() {
  const { toasts, dismissToast } = useUiStore()

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: {
    id: string
    type: 'success' | 'error' | 'info' | 'warning'
    title?: string
    message: string
    duration?: number
    undo?: () => void
  }
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const { t } = useI18n()
  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [onClose, toast.duration])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="toast-icon" />
      case 'error':
        return <AlertCircle className="toast-icon" />
      case 'info':
        return <Info className="toast-icon" />
      case 'warning':
        return <AlertTriangle className="toast-icon" />
      default:
        return null
    }
  }

  return (
    <div className={`toast ${toast.type}`}>
      {getIcon()}

      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
        {toast.undo && (
          <button
            onClick={() => {
              toast.undo?.()
              onClose()
            }}
            className="mt-2 text-xs font-medium text-[var(--primary)] hover:opacity-80 transition-opacity">
            {t('btn.undo')}
          </button>
        )}
      </div>

      <button onClick={onClose} className="toast-close">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
