import Modal from './Modal'

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
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
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
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`btn btn-sm ${isDanger ? 'btn-danger' : 'btn-primary'}`}>
            {confirmText}
          </button>
        </div>
      }>
      <p className="text-[var(--text-secondary)]">{message}</p>
    </Modal>
  )
}
