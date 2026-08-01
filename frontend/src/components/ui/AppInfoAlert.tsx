import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Alert } from "@mui/material";
import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";

interface AppInfoAlertProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export default function AppInfoAlert({ children, sx }: AppInfoAlertProps) {
  return (
    <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={sx}>
      {children}
    </Alert>
  );
}
