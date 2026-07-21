import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { IconButton, MenuItem, Stack } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { CurrencyValue } from "../../../lib/currencyValues";
import type { ProjectCurrency } from "../../projects/types";

interface CurrencyValuesEditorProps {
  currencies?: ProjectCurrency[];
  values?: CurrencyValue[];
  onChange: (values: CurrencyValue[]) => void;
  disabled?: boolean;
  emptyLabel?: string;
}

export default function CurrencyValuesEditor({
  currencies,
  values,
  onChange,
  disabled = false,
  emptyLabel = "Награды не настроены.",
}: CurrencyValuesEditorProps) {
  const availableCurrencies = Array.isArray(currencies) ? currencies : [];
  const currentValues = Array.isArray(values) ? values : [];
  const usedCurrencyIds = currentValues.map((value) => value.currencyId);
  const canAdd = availableCurrencies.some((currency) => !usedCurrencyIds.includes(currency.id));

  function updateValue(index: number, patch: Partial<CurrencyValue>) {
    onChange(currentValues.map((value, currentIndex) => (currentIndex === index ? { ...value, ...patch } : value)));
  }

  function addValue() {
    const currency = availableCurrencies.find((item) => !usedCurrencyIds.includes(item.id));
    if (currency) {
      onChange([...currentValues, { currencyId: currency.id, value: 0 }]);
    }
  }

  function removeValue(index: number) {
    onChange(currentValues.filter((_value, currentIndex) => currentIndex !== index));
  }

  return (
    <Stack spacing={1.25}>
      {currentValues.map((entry, index) => {
        const selectedCurrency = availableCurrencies.find((currency) => currency.id === entry.currencyId);
        const step = selectedCurrency?.valueType === "integer" || !selectedCurrency?.precision ? 1 : 10 ** -selectedCurrency.precision;

        return (
          <Stack key={`${entry.currencyId}-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <AppTextInput
              select
              size="small"
              label="Валюта"
              value={entry.currencyId}
              onChange={(event) => updateValue(index, { currencyId: event.target.value })}
              disabled={disabled}
              sx={{ minWidth: { sm: 220 }, flex: 1 }}
            >
              {availableCurrencies.map((currency) => (
                <MenuItem key={currency.id} value={currency.id} disabled={currency.id !== entry.currencyId && usedCurrencyIds.includes(currency.id)}>
                  {currency.label}
                </MenuItem>
              ))}
            </AppTextInput>
            <AppTextInput
              size="small"
              type="number"
              label="Значение"
              value={entry.value}
              onChange={(event) => updateValue(index, { value: Number(event.target.value) })}
              disabled={disabled}
              inputProps={{ step }}
              sx={{ minWidth: { sm: 150 } }}
            />
            <IconButton aria-label="Удалить валюту" onClick={() => removeValue(index)} disabled={disabled} color="error">
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Stack>
        );
      })}
      {!currentValues.length ? <span style={{ color: "#64748b", fontSize: 14 }}>{emptyLabel}</span> : null}
      <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={addValue} disabled={disabled || !canAdd} sx={{ alignSelf: "flex-start" }}>
        Добавить валюту
      </AppPillButton>
    </Stack>
  );
}
