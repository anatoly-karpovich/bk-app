import { TextField } from "@mui/material";

export default function AppTextInput({ sx, inputSx, ...props }) {
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
