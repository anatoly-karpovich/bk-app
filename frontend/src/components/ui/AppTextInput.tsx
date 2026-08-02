import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type AppTextInputProps = TextFieldProps & {
  sx?: SxProps<Theme>;
  inputSx?: Record<string, any>;
  changed?: boolean;
  [key: string]: any;
};

export default function AppTextInput({ sx, inputSx, changed = false, ...props }: AppTextInputProps) {
  return (
    <TextField
      {...props}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: (theme) => theme.customRadii.control,
          backgroundColor: "#fff",
          ...inputSx,
        },
        ...(changed ? {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "warning.main", borderWidth: 2 },
          "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "warning.main" },
        } : {}),
        ...sx,
      }}
    />
  );
}
