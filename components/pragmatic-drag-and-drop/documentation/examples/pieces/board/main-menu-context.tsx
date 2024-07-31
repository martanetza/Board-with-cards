import { createContext, useContext } from "react";

import invariant from "tiny-invariant";

export type MainMenuContextProps = {
  mainMenuItemId: string;
  getSubMenuItemIndex: (userId: string) => number;
  getNumSubMenuItems: () => number;
};

export const MainMenuContext = createContext<MainMenuContextProps | null>(null);

export function useMainMenuContext(): MainMenuContextProps {
  const value = useContext(MainMenuContext);
  invariant(value, "cannot find MainMenuItemContext provider");
  return value;
}
