import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { SxProps, Theme } from "@mui/material/styles";

interface GameConfigOption {
  id: string;
  name: string;
}

interface GameConfigSelectFieldProps {
  label: string;
  gameConfigs: GameConfigOption[];
  selectedGameConfigId: string;
  onSelectedGameConfigChange: (nextGameConfigId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyLabel?: string;
  hideHelperText?: boolean;
  sx?: SxProps<Theme>;
}

export default function GameConfigSelectField({
  label,
  gameConfigs,
  selectedGameConfigId,
  onSelectedGameConfigChange,
  disabled = false,
  loading = false,
  error = null,
  emptyLabel = "Нет доступных пресетов",
  hideHelperText = false,
  sx,
}: GameConfigSelectFieldProps) {
  const selectDisabled = disabled || loading || !gameConfigs.length;
  const selectValue = gameConfigs.some((gameConfig) => gameConfig.id === selectedGameConfigId)
    ? selectedGameConfigId
    : "";

  return (
    <FormControl fullWidth size="small" disabled={selectDisabled} error={Boolean(error)} sx={sx}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={selectValue}
        onChange={(event: SelectChangeEvent<string>) => onSelectedGameConfigChange(event.target.value)}
      >
        {!gameConfigs.length ? (
          <MenuItem value="" disabled>
            {loading ? "Загрузка пресетов..." : emptyLabel}
          </MenuItem>
        ) : null}
        {gameConfigs.map((gameConfig) => (
          <MenuItem key={gameConfig.id} value={gameConfig.id}>
            {gameConfig.name}
          </MenuItem>
        ))}
      </Select>
      {!hideHelperText ? <FormHelperText>{error ?? " "}</FormHelperText> : null}
    </FormControl>
  );
}
