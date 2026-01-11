import { useEffect, useRef } from "react";
import { useI18n } from "./i18n";

type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function AlertModal({ isOpen, title, message, onClose }: Props) {
  const { t } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    queueMicrotask(() => closeButtonRef.current?.focus());
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/55 p-6 md:p-10"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[640px] overflow-hidden rounded-xl border border-[var(--vscode-panel-border)] bg-[var(--modal-background)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--vscode-panel-border)] px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-[var(--vscode-foreground)]">{title}</div>
          </div>
          <button
            ref={closeButtonRef}
            className="rounded px-2 py-1 text-sm text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]"
            onClick={onClose}
            type="button"
            title={t("close")}
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="whitespace-pre-wrap text-sm text-[var(--vscode-foreground)]">{message}</div>
          <div className="mt-4 flex justify-end">
            <button
              className="rounded bg-[var(--vscode-button-background)] px-3 py-2 text-sm font-semibold text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]"
              onClick={onClose}
              type="button"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

