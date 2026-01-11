import { createContext, useContext } from "react";
import { MONACO_CLASSIC_DARK_THEME_NAME } from "../monacoSetup";
import { DEFAULT_THEME_PACK_ID } from "../../shared/themePacks";

export type UiTheme = "dark" | "light";

type UiThemeContextValue = {
  theme: UiTheme;
  themePackId: string;
  monacoThemeName: string;
};

export const UiThemeContext = createContext<UiThemeContextValue>({
  theme: "dark",
  themePackId: DEFAULT_THEME_PACK_ID,
  monacoThemeName: MONACO_CLASSIC_DARK_THEME_NAME
});

export function useUiTheme() {
  return useContext(UiThemeContext);
}
