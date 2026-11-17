// filepath: src/components/MoneyInput.tsx
import type { InputHTMLAttributes } from "react"
export const formatMoneyInput = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string
  onValueChange: (raw: string) => void
}
export default function MoneyInput({
  value,
  onValueChange,
  placeholder = "1.000.000",
  ...props
}: Props) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={formatMoneyInput(value)}
      placeholder={placeholder}
      onChange={(event) => {
        const input = event.currentTarget
        const raw = input.value.replace(/\./g, "")
        if (!/^\d*$/.test(raw)) return
        const digitsBeforeCursor = input.value
          .slice(0, input.selectionStart ?? input.value.length)
          .replace(/\./g, "").length
        onValueChange(raw)
        requestAnimationFrame(() => {
          let digits = 0,
            cursor = 0
          while (cursor < input.value.length && digits < digitsBeforeCursor) {
            if (/\d/.test(input.value[cursor])) digits++
            cursor++
          }
          if (document.activeElement === input)
            input.setSelectionRange(cursor, cursor)
        })
      }}
    />
  )
}
