// filepath: src/components/Toast.tsx
import { useEffect, useState } from "react"
import DismissButton from "./DismissButton"

type Notice = { id: number; message: string; tone: "success" | "error" }
let sequence = 0
const eventName = "cici:toast"
export function toast(message: string, tone: Notice["tone"] = "success") {
  window.dispatchEvent(
    new CustomEvent(eventName, { detail: { id: ++sequence, message, tone } }),
  )
}
export function useToastMessage(
  message: string | null | undefined,
  tone: Notice["tone"] = "success",
) {
  useEffect(() => {
    if (message) toast(message, tone)
  }, [message, tone])
}
function ToastItem({
  notice,
  dismiss,
}: {
  notice: Notice
  dismiss: () => void
}) {
  useEffect(() => {
    const timer = window.setTimeout(
      dismiss,
      notice.tone === "error" ? 9000 : 5000,
    )
    return () => clearTimeout(timer)
  }, [dismiss, notice.tone])
  return (
    <div
      className={`cici-toast flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${notice.tone}`}
      role={notice.tone === "error" ? "alert" : "status"}
    >
      <div>
        <strong>
          {notice.tone === "error" ? "Perlu diperiksa" : "Berhasil"}
        </strong>
        <p>{notice.message}</p>
      </div>
      <DismissButton label="Tutup pemberitahuan" onDismiss={dismiss} />
    </div>
  )
}
export function Toaster() {
  const [items, setItems] = useState<Notice[]>([])
  useEffect(() => {
    const receive = (event: Event) =>
      setItems((items) =>
        [...items, (event as CustomEvent<Notice>).detail].slice(-3),
      )
    window.addEventListener(eventName, receive)
    return () => window.removeEventListener(eventName, receive)
  }, [])
  return (
    <aside className="cici-toasts" aria-label="Pemberitahuan">
      {items.map((notice) => (
        <ToastItem
          key={notice.id}
          notice={notice}
          dismiss={() =>
            setItems((items) => items.filter((item) => item.id !== notice.id))
          }
        />
      ))}
    </aside>
  )
}
