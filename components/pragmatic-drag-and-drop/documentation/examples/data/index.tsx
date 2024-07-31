/**
 * These imports are written out explicitly because they
 * need to be statically analyzable to be uploaded to CodeSandbox correctly.
 */

export type Person = {
  userId: string;
  name: string;
};

const names: string[] = ["a", "b"];

let sharedLookupIndex: number = 0;

/**
 * Note: this does not use randomness so that it is stable for VR tests
 */
export function getPerson(): Person {
  sharedLookupIndex++;
  return getPersonFromPosition({ position: sharedLookupIndex });
}

export function getPersonFromPosition({
  position,
}: {
  position: number;
}): Person {
  // use the next name
  const name = names[position % names.length];
  // use the next role
  return {
    userId: `id:${position}`,
    name,
  };
}

export function getPeople({ amount }: { amount: number }): Person[] {
  return Array.from({ length: amount }, () => getPerson());
}

export type MainMenuItemType = {
  title: string;
  mainMenuItemId: string;
  items: Person[];
};
export type MainMenuItemMap = { [mainMenuItemId: string]: MainMenuItemType };

export function getData({
  mainMenuItemCount,
  itemsPerMainMenuItem,
}: {
  mainMenuItemCount: number;
  itemsPerMainMenuItem: number;
}) {
  const mainMenuItemMap: MainMenuItemMap = {};

  for (let i = 0; i < mainMenuItemCount; i++) {
    const mainMenuItem: MainMenuItemType = {
      title: `MainMenuItem ${i}`,
      mainMenuItemId: `mainMenuItem-${i}`,
      items: getPeople({ amount: itemsPerMainMenuItem }),
    };
    mainMenuItemMap[mainMenuItem.mainMenuItemId] = mainMenuItem;
  }
  const orderedMainMenuItemIds = Object.keys(mainMenuItemMap);

  return {
    mainMenuItemMap,
    orderedMainMenuItemIds,
    lastOperation: null,
  };
}

export function getBasicData() {
  const mainMenuItemMap: MainMenuItemMap = {
    confluence: {
      title: "Confluence",
      mainMenuItemId: "confluence",
      items: getPeople({ amount: 2 }),
    },
    jira: {
      title: "Jira",
      mainMenuItemId: "jira",
      items: getPeople({ amount: 2 }),
    },
    trello: {
      title: "Trello",
      mainMenuItemId: "trello",
      items: getPeople({ amount: 2 }),
    },
  };

  const orderedMainMenuItemIds = ["confluence", "jira", "trello"];

  return {
    mainMenuItemMap,
    orderedMainMenuItemIds,
  };
}
