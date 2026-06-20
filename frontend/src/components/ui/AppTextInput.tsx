import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type AppTextInputProps = TextFieldProps & {
  sx?: SxProps<Theme>;
  inputSx?: Record<string, any>;
  [key: string]: any;
};

export default function AppTextInput({ sx, inputSx, ...props }: AppTextInputProps) {
  return (
    <TextField
      {...props}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: (theme) => theme.customRadii.control,
          backgroundColor: "#fff",
          ...inputSx,
        },
        ...sx,
      }}
    />
  );
}
