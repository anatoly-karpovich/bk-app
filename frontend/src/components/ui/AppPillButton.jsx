import { Button } from "@mui/material";

export default function AppPillButton({ sx, ...props }) {
  return (
    <Button
      {...props}
      sx={{
        borderRadius: (theme) => theme.customRadii.pill,
        fontWeight: 700,
        ...sx,
      }}
    />
  );
}
