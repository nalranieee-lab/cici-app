// filepath: src/components/DismissButton.tsx
type Props = {
  label: string;
  onDismiss: () => void;
};

export default function DismissButton({ label, onDismiss }: Props) {
  return (
    <button
      type="button"
      className="alert-dismiss"
      aria-label={label}
      onClick={onDismiss}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
        <path
          d="m5 5 10 10M15 5 5 15"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}
