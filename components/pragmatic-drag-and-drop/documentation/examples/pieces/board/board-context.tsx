import { createContext, useContext } from "react";

import invariant from "tiny-invariant";

import type { CleanupFn } from "@atlaskit/pragmatic-drag-and-drop/types";

import type { MainMenuItemType } from "../../data";

export type BoardContextValue = {
  getMainMenuItems: () => MainMenuItemType[];

  reorderMainMenuItem: (args: {
    startIndex: number;
    finishIndex: number;
  }) => void;

  reorderCard: (args: {
    mainMenuItemId: string;
    startIndex: number;
    finishIndex: number;
  }) => void;

  moveCard: (args: {
    startMainMenuItemId: string;
    finishMainMenuItemId: string;
    itemIndexInStartMainMenuItem: number;
    itemIndexInFinishMainMenuItem?: number;
  }) => void;

  registerCard: (args: {
    cardId: string;
    entry: {
      element: HTMLElement;
      // actionMenuTrigger: HTMLElement;
    };
  }) => CleanupFn;

  registerMainMenuItem: (args: {
    mainMenuItemId: string;
    entry: {
      element: HTMLElement;
    };
  }) => CleanupFn;

  instanceId: symbol;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const value = useContext(BoardContext);
  invariant(value, "cannot find BoardContext provider");
  return value;
}
