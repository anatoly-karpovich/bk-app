import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    customRadii: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      pill: string;
      control: string;
      surface: string;
    };
  }

  interface ThemeOptions {
    customRadii?: Partial<Theme["customRadii"]>;
  }
}
