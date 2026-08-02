import { createTheme } from "@mui/material/styles";
import type { ThemeOptions } from "@mui/material/styles";

const radii: NonNullable<ThemeOptions["customRadii"]> = {
  xs: "6px",
  sm: "12px",
  md: "16px",
  lg: "20px",
  xl: "28px",
  pill: "999px",
  control: "12px",
  surface: "12px",
};

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4f46e5",
    },
    secondary: {
      main: "#0891b2",
    },
    background: {
      default: "#f3f4f6",
      paper: "#ffffff",
    },
    success: {
      main: "#15803d",
    },
    warning: {
      main: "#eab308",
    },
    error: {
      main: "#b91c1c",
    },
  },
  shape: {
    borderRadius: 16,
  },
  customRadii: radii,
  typography: {
    fontFamily: ["Inter", "Segoe UI", "Roboto", "Arial", "sans-serif"].join(","),
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.pill,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radii.pill,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radii.md,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radii.lg,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: radii.md,
        },
      },
    },
  },
});
