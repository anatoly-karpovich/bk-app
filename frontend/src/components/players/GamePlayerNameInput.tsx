import type { ChangeEvent } from "react";
import AppTextInput from "../ui/AppTextInput";

type HelperTextMode = "hidden" | "visible";

interface GamePlayerNameInputProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  errorText?: string | null;
  helperTextMode?: HelperTextMode;
  placeholder?: string;
}

const DEFAULT_PLACEHOLDER = "Заполните ник";

export default function GamePlayerNameInput({
  label,
  value,
  onChange,
  disabled = false,
  errorText = null,
  helperTextMode = "hidden",
  placeholder = DEFAULT_PLACEHOLDER,
}: GamePlayerNameInputProps) {
  const resolvedHelperText = helperTextMode === "visible" ? errorText ?? " " : errorText ? " " : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <AppTextInput
      fullWidth
      label={label}
      value={value}
      onChange={handleChange}
      error={Boolean(errorText)}
      placeholder={helperTextMode === "hidden" && errorText ? errorText : placeholder}
      helperText={resolvedHelperText}
      FormHelperTextProps={helperTextMode === "hidden" ? { sx: { display: "none" } } : undefined}
      disabled={disabled}
    />
  );
}
