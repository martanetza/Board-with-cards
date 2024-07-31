import invariant from "tiny-invariant";

import type { CleanupFn } from "@atlaskit/pragmatic-drag-and-drop/types";

export type CardEntry = {
  element: HTMLElement;
  // actionMenuTrigger: HTMLElement;
};

export type MainMenuItemEntry = {
  element: HTMLElement;
};

/**
 * Registering cards and their action menu trigger element,
 * so that we can restore focus to the trigger when a card moves between mainMenuItems.
 */
export function createRegistry() {
  const cards = new Map<string, CardEntry>();
  const mainMenuItems = new Map<string, MainMenuItemEntry>();

  function registerCard({
    cardId,
    entry,
  }: {
    cardId: string;
    entry: CardEntry;
  }): CleanupFn {
    cards.set(cardId, entry);
    return function cleanup() {
      cards.delete(cardId);
    };
  }

  function registerMainMenuItem({
    mainMenuItemId,
    entry,
  }: {
    mainMenuItemId: string;
    entry: MainMenuItemEntry;
  }): CleanupFn {
    mainMenuItems.set(mainMenuItemId, entry);
    return function cleanup() {
      cards.delete(mainMenuItemId);
    };
  }

  function getCard(cardId: string): CardEntry {
    const entry = cards.get(cardId);
    invariant(entry);
    return entry;
  }

  function getMainMenuItem(mainMenuItemId: string): MainMenuItemEntry {
    const entry = mainMenuItems.get(mainMenuItemId);
    invariant(entry);
    return entry;
  }

  return { registerCard, registerMainMenuItem, getCard, getMainMenuItem };
}
