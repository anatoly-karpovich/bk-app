import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, Button, Checkbox, FormControlLabel, Menu, Typography } from "@mui/material";
import { useState } from "react";

export interface AppMultiSelectFilterOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface AppMultiSelectFilterProps<TValue extends string> {
  label: string;
  allLabel: string;
  options: readonly AppMultiSelectFilterOption<TValue>[];
  selectedValues: readonly TValue[];
  onSelectedValuesChange: (values: TValue[]) => void;
}

export default function AppMultiSelectFilter<TValue extends string>({
  label,
  allLabel,
  options,
  selectedValues,
  onSelectedValuesChange,
}: AppMultiSelectFilterProps<TValue>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const isAllSelected = selectedValues.length === options.length;
  const hasSelectedValues = selectedValues.length > 0;

  function toggleValue(value: TValue) {
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value];
    onSelectedValuesChange(nextValues);
  }

  function toggleAll() {
    onSelectedValuesChange(isAllSelected ? [] : options.map((option) => option.value));
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<TuneRoundedIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        color="inherit"
        sx={{
          justifyContent: "flex-start",
          minWidth: { md: 164 },
          px: 1.5,
          borderRadius: (theme) => theme.customRadii.control,
          borderColor: "divider",
          color: "text.primary",
          "&:hover": { borderColor: "rgba(79, 70, 229, 0.38)", backgroundColor: "rgba(79, 70, 229, 0.035)" },
        }}
      >
        <Box textAlign="left">
          <Typography component="span" display="block" variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography component="span" variant="body2" fontWeight={700}>
            {isAllSelected ? allLabel : `${selectedValues.length} из ${options.length}`}
          </Typography>
        </Box>
      </Button>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} PaperProps={{ sx: { p: 1 } }}>
        <FormControlLabel
          sx={{ display: "flex", mx: 0, px: 1, mb: 0.5, borderBottom: 1, borderColor: "divider" }}
          control={<Checkbox checked={isAllSelected} indeterminate={hasSelectedValues && !isAllSelected} onChange={toggleAll} />}
          label="Выбрать все"
        />
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            sx={{ display: "flex", mx: 0, px: 1 }}
            control={<Checkbox checked={selectedValues.includes(option.value)} onChange={() => toggleValue(option.value)} />}
            label={option.label}
          />
        ))}
      </Menu>
    </>
  );
}
