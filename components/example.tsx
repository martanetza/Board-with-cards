"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import invariant from "tiny-invariant";

import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import * as liveRegion from "@atlaskit/pragmatic-drag-and-drop-live-region";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";

import {
  type MainMenuItemMap,
  type MainMenuItemType,
  getBasicData,
  type Person,
} from "./pragmatic-drag-and-drop/documentation/examples/data";
import Board from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/board";
import {
  BoardContext,
  type BoardContextValue,
} from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/board-context";
import { MainMenuItem } from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/main-menu-item";
import { createRegistry } from "./pragmatic-drag-and-drop/documentation/examples/pieces/board/registry";

type Outcome =
  | {
      type: "mainMenuItem-reorder";
      mainMenuItemId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-reorder";
      mainMenuItemId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-move";
      finishMainMenuItemId: string;
      itemIndexInStartMainMenuItem: number;
      itemIndexInFinishMainMenuItem: number;
    };

type Trigger = "pointer" | "keyboard";

type Operation = {
  trigger: Trigger;
  outcome: Outcome;
};

type BoardState = {
  mainMenuItemMap: MainMenuItemMap;
  orderedMainMenuItemIds: string[];
  lastOperation: Operation | null;
};

export default function BoardExample() {
  const [data, setData] = useState<BoardState>(() => {
    const base = getBasicData();
    return {
      ...base,
      lastOperation: null,
    };
  });

  const stableData = useRef(data);
  useEffect(() => {
    stableData.current = data;
  }, [data]);

  const [registry] = useState(createRegistry);

  const { lastOperation } = data;

  useEffect(() => {
    if (lastOperation === null) {
      return;
    }
    const { outcome, trigger } = lastOperation;

    if (outcome.type === "mainMenuItem-reorder") {
      const { startIndex, finishIndex } = outcome;

      const { mainMenuItemMap, orderedMainMenuItemIds } = stableData.current;
      const sourceMainMenuItem =
        mainMenuItemMap[orderedMainMenuItemIds[finishIndex]];

      const entry = registry.getMainMenuItem(sourceMainMenuItem.mainMenuItemId);
      triggerPostMoveFlash(entry.element);

      liveRegion.announce(
        `You've moved ${sourceMainMenuItem.title} from position ${
          startIndex + 1
        } to position ${finishIndex + 1} of ${orderedMainMenuItemIds.length}.`
      );

      return;
    }

    if (outcome.type === "card-reorder") {
      const { mainMenuItemId, startIndex, finishIndex } = outcome;

      const { mainMenuItemMap } = stableData.current;
      const mainMenuItem = mainMenuItemMap[mainMenuItemId];
      const item = mainMenuItem.items[finishIndex];

      const entry = registry.getCard(item.userId);
      triggerPostMoveFlash(entry.element);

      if (trigger !== "keyboard") {
        return;
      }

      liveRegion.announce(
        `You've moved ${item.name} from position ${
          startIndex + 1
        } to position ${finishIndex + 1} of ${
          mainMenuItem.items.length
        } in the ${mainMenuItem.title} mainMenuItem.`
      );

      return;
    }

    if (outcome.type === "card-move") {
      console.log("card-move");

      const {
        finishMainMenuItemId,
        itemIndexInStartMainMenuItem,
        itemIndexInFinishMainMenuItem,
      } = outcome;

      const data = stableData.current;
      const destinationMainMenuItem =
        data.mainMenuItemMap[finishMainMenuItemId];
      const item = destinationMainMenuItem.items[itemIndexInFinishMainMenuItem];

      const finishPosition =
        typeof itemIndexInFinishMainMenuItem === "number"
          ? itemIndexInFinishMainMenuItem + 1
          : destinationMainMenuItem.items.length;

      const entry = registry.getCard(item.userId);
      triggerPostMoveFlash(entry.element);

      if (trigger !== "keyboard") {
        return;
      }

      liveRegion.announce(
        `You've moved ${item.name} from position ${
          itemIndexInStartMainMenuItem + 1
        } to position ${finishPosition} in the ${
          destinationMainMenuItem.title
        } mainMenuItem.`
      );

      /**
       * Because the card has moved mainMenuItem, it will have remounted.
       * This means we need to manually restore focus to it.
       */

      return;
    }
  }, [lastOperation, registry]);

  useEffect(() => {
    return liveRegion.cleanup();
  }, []);

  const getMainMenuItems = useCallback(() => {
    const { mainMenuItemMap, orderedMainMenuItemIds } = stableData.current;
    return orderedMainMenuItemIds.map(
      (mainMenuItemId) => mainMenuItemMap[mainMenuItemId]
    );
  }, []);

  const reorderMainMenuItem = useCallback(
    ({
      startIndex,
      finishIndex,
      trigger = "keyboard",
    }: {
      startIndex: number;
      finishIndex: number;
      trigger?: Trigger;
    }) => {
      setData((data) => {
        const outcome: Outcome = {
          type: "mainMenuItem-reorder",
          mainMenuItemId: data.orderedMainMenuItemIds[startIndex],
          startIndex,
          finishIndex,
        };

        return {
          ...data,
          orderedMainMenuItemIds: reorder({
            list: data.orderedMainMenuItemIds,
            startIndex,
            finishIndex,
          }),
          lastOperation: {
            outcome,
            trigger: trigger,
          },
        };
      });
    },
    []
  );

  const reorderCard = useCallback(
    ({
      mainMenuItemId,
      startIndex,
      finishIndex,
      trigger = "keyboard",
    }: {
      mainMenuItemId: string;
      startIndex: number;
      finishIndex: number;
      trigger?: Trigger;
    }) => {
      setData((data) => {
        console.log("reorderCard", startIndex, finishIndex);

        const sourceMainMenuItem = data.mainMenuItemMap[mainMenuItemId];
        const updatedItems = reorder({
          list: sourceMainMenuItem.items,
          startIndex,
          finishIndex,
        });

        const updatedSourceMainMenuItem: MainMenuItemType = {
          ...sourceMainMenuItem,
          items: updatedItems,
        };

        const updatedMap: MainMenuItemMap = {
          ...data.mainMenuItemMap,
          [mainMenuItemId]: updatedSourceMainMenuItem,
        };

        const outcome: Outcome | null = {
          type: "card-reorder",
          mainMenuItemId,
          startIndex,
          finishIndex,
        };

        return {
          ...data,
          mainMenuItemMap: updatedMap,
          lastOperation: {
            trigger: trigger,
            outcome,
          },
        };
      });
    },
    []
  );

  const moveCard = useCallback(
    ({
      startMainMenuItemId,
      finishMainMenuItemId,
      itemIndexInStartMainMenuItem,
      itemIndexInFinishMainMenuItem,
      trigger = "keyboard",
    }: {
      startMainMenuItemId: string;
      finishMainMenuItemId: string;
      itemIndexInStartMainMenuItem: number;
      itemIndexInFinishMainMenuItem?: number;
      trigger?: "pointer" | "keyboard";
    }) => {
      // invalid cross mainMenuItem movement
      if (startMainMenuItemId === finishMainMenuItemId) {
        return;
      }
      setData((data) => {
        const sourceMainMenuItem = data.mainMenuItemMap[startMainMenuItemId];
        const destinationMainMenuItem =
          data.mainMenuItemMap[finishMainMenuItemId];
        const item: Person =
          sourceMainMenuItem.items[itemIndexInStartMainMenuItem];

        const destinationItems = Array.from(destinationMainMenuItem.items);
        // Going into the first position if no index is provided
        const newIndexInDestination = itemIndexInFinishMainMenuItem ?? 0;
        destinationItems.splice(newIndexInDestination, 0, item);

        const updatedMap = {
          ...data.mainMenuItemMap,
          [startMainMenuItemId]: {
            ...sourceMainMenuItem,
            items: sourceMainMenuItem.items.filter(
              (i) => i.userId !== item.userId
            ),
          },
          [finishMainMenuItemId]: {
            ...destinationMainMenuItem,
            items: destinationItems,
          },
        };

        const outcome: Outcome | null = {
          type: "card-move",
          finishMainMenuItemId,
          itemIndexInStartMainMenuItem,
          itemIndexInFinishMainMenuItem: newIndexInDestination,
        };

        return {
          ...data,
          mainMenuItemMap: updatedMap,
          lastOperation: {
            outcome,
            trigger: trigger,
          },
        };
      });
    },
    []
  );

  const [instanceId] = useState(() => Symbol("instance-id"));

  useEffect(() => {
    return combine(
      monitorForElements({
        canMonitor({ source }) {
          return source.data.instanceId === instanceId;
        },
        onDrop(args) {
          const { location, source } = args;
          // didn't drop on anything
          if (!location.current.dropTargets.length) {
            return;
          }
          // need to handle drop

          // 1. remove element from original position
          // 2. move to new position

          if (source.data.type === "mainMenuItem") {
            const startIndex: number = data.orderedMainMenuItemIds.findIndex(
              (mainMenuItemId) => mainMenuItemId === source.data.mainMenuItemId
            );

            const target = location.current.dropTargets[0];
            const indexOfTarget: number = data.orderedMainMenuItemIds.findIndex(
              (id) => id === target.data.mainMenuItemId
            );
            const closestEdgeOfTarget: Edge | null = extractClosestEdge(
              target.data
            );

            const finishIndex = getReorderDestinationIndex({
              startIndex,
              indexOfTarget,
              closestEdgeOfTarget,
              axis: "horizontal",
            });

            reorderMainMenuItem({
              startIndex,
              finishIndex,
              trigger: "pointer",
            });
          }
          // Dragging a card
          console.log("source", source);
          console.log("location", location);
          if (source.data.type === "card") {
            const itemId = source.data.itemId;
            invariant(typeof itemId === "string");
            // TODO: these lines not needed if item has mainMenuItemId on it
            const [, startMainMenuItemRecord] = location.initial.dropTargets;
            console.log("startMainMenuItemRecord", startMainMenuItemRecord);
            const sourceId = startMainMenuItemRecord.data.mainMenuItemId;
            invariant(typeof sourceId === "string");
            const sourceMainMenuItem = data.mainMenuItemMap[sourceId];
            const itemIndex = sourceMainMenuItem.items.findIndex(
              (item) => item.userId === itemId
            );

            if (location.current.dropTargets.length === 1) {
              const [destinationMainMenuItemRecord] =
                location.current.dropTargets;
              const destinationId =
                destinationMainMenuItemRecord.data.mainMenuItemId;
              invariant(typeof destinationId === "string");
              const destinationMainMenuItem =
                data.mainMenuItemMap[destinationId];
              invariant(destinationMainMenuItem);

              // reordering in same mainMenuItem
              if (sourceMainMenuItem === destinationMainMenuItem) {
                const destinationIndex = getReorderDestinationIndex({
                  startIndex: itemIndex,
                  indexOfTarget: sourceMainMenuItem.items.length - 1,
                  closestEdgeOfTarget: null,
                  axis: "vertical",
                });
                reorderCard({
                  mainMenuItemId: sourceMainMenuItem.mainMenuItemId,
                  startIndex: itemIndex,
                  finishIndex: destinationIndex,
                  trigger: "pointer",
                });
                return;
              }

              // moving to a new mainMenuItem
              moveCard({
                itemIndexInStartMainMenuItem: itemIndex,
                startMainMenuItemId: sourceMainMenuItem.mainMenuItemId,
                finishMainMenuItemId: destinationMainMenuItem.mainMenuItemId,
                trigger: "pointer",
              });
              return;
            }

            // dropping in a mainMenuItem (relative to a card)
            if (location.current.dropTargets.length === 2) {
              const [destinationCardRecord, destinationMainMenuItemRecord] =
                location.current.dropTargets;
              const destinationMainMenuItemId =
                destinationMainMenuItemRecord.data.mainMenuItemId;
              invariant(typeof destinationMainMenuItemId === "string");
              const destinationMainMenuItem =
                data.mainMenuItemMap[destinationMainMenuItemId];

              const indexOfTarget = destinationMainMenuItem.items.findIndex(
                (item) => item.userId === destinationCardRecord.data.itemId
              );
              const closestEdgeOfTarget: Edge | null = extractClosestEdge(
                destinationCardRecord.data
              );

              // case 1: ordering in the same mainMenuItem
              if (sourceMainMenuItem === destinationMainMenuItem) {
                const destinationIndex = getReorderDestinationIndex({
                  startIndex: itemIndex,
                  indexOfTarget,
                  closestEdgeOfTarget,
                  axis: "vertical",
                });
                reorderCard({
                  mainMenuItemId: sourceMainMenuItem.mainMenuItemId,
                  startIndex: itemIndex,
                  finishIndex: destinationIndex,
                  trigger: "pointer",
                });
                return;
              }

              // case 2: moving into a new mainMenuItem relative to a card

              const destinationIndex =
                closestEdgeOfTarget === "bottom"
                  ? indexOfTarget + 1
                  : indexOfTarget;

              moveCard({
                itemIndexInStartMainMenuItem: itemIndex,
                startMainMenuItemId: sourceMainMenuItem.mainMenuItemId,
                finishMainMenuItemId: destinationMainMenuItem.mainMenuItemId,
                itemIndexInFinishMainMenuItem: destinationIndex,
                trigger: "pointer",
              });
            }
          }
        },
      })
    );
  }, [data, instanceId, moveCard, reorderCard, reorderMainMenuItem]);

  const contextValue: BoardContextValue = useMemo(() => {
    return {
      getMainMenuItems,
      reorderMainMenuItem,
      reorderCard,
      moveCard,
      registerCard: registry.registerCard,
      registerMainMenuItem: registry.registerMainMenuItem,
      instanceId,
    };
  }, [
    getMainMenuItems,
    reorderMainMenuItem,
    reorderCard,
    registry,
    moveCard,
    instanceId,
  ]);

  return (
    <BoardContext.Provider value={contextValue}>
      <Board>
        {data.orderedMainMenuItemIds.map((mainMenuItemId) => {
          return (
            <MainMenuItem
              mainMenuItem={data.mainMenuItemMap[mainMenuItemId]}
              key={mainMenuItemId}
            />
          );
        })}
      </Board>
    </BoardContext.Provider>
  );
}
