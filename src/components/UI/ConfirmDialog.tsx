import Modal from './Modal'
import { useI18n } from '@/i18n'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  isDanger?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  const { t } = useI18n()
  const resolvedConfirmText = confirmText || t('btn.save')
  const resolvedCancelText = cancelText || t('btn.cancel')
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const handleCancel = () => {
    onCancel?.()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="btn btn-secondary btn-sm">
            {resolvedCancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`btn btn-sm ${isDanger ? 'btn-danger' : 'btn-primary'}`}>
            {resolvedConfirmText}
          </button>
        </div>
      }>
      <p className="text-[var(--text-secondary)]">{message}</p>
    </Modal>
  )
}
