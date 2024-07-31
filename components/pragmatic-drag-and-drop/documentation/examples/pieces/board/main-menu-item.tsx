import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { centerUnderPointer } from "@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { token } from "@atlaskit/tokens";

import { type MainMenuItemType } from "../../data";

import { SubMenuItem } from "./sub-menu-item";
import {
  MainMenuContext,
  type MainMenuContextProps,
  useMainMenuContext,
} from "./main-menu-context";
import { css } from "@emotion/css";
import { useBoardContext } from "./board-context";

const scrollContainerStyles = css`
  height: "100%";
  overflow-y: "auto";
`;

const subMenuItemListStyles = css`
  box-sizing: "border-box";
  min-height: "100%";
  padding: "space.100";
  gap: "10px";
`;

type State =
  | { type: "idle" }
  | { type: "is-sub-menu-item-over" }
  | { type: "is-main-menu-item-over"; closestEdge: Edge | null }
  | { type: "generate-safari-main-menu-item-preview"; container: HTMLElement }
  | { type: "generate-main-menu-item-preview" };

// preventing re-renders with stable state objects
const idle: State = { type: "idle" };
const isSubMenuItemOver: State = { type: "is-sub-menu-item-over" };

export const MainMenuItem = memo(function MainMenuItem({
  mainMenuItem,
}: {
  mainMenuItem: MainMenuItemType;
}) {
  const mainMenuItemId = mainMenuItem.mainMenuItemId;
  const mainMenuItemRef = useRef<HTMLDivElement | null>(null);
  const mainMenuItemInnerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<State>(idle);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const { instanceId, registerMainMenuItem } = useBoardContext();

  useEffect(() => {
    invariant(mainMenuItemRef.current);
    invariant(mainMenuItemInnerRef.current);
    invariant(headerRef.current);
    invariant(scrollableRef.current);
    return combine(
      registerMainMenuItem({
        mainMenuItemId,
        entry: {
          element: mainMenuItemRef.current,
        },
      }),
      draggable({
        element: mainMenuItemRef.current,
        dragHandle: headerRef.current,
        getInitialData: () => ({
          mainMenuItemId,
          type: "mainMenuItem",
          instanceId,
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          const isSafari: boolean =
            navigator.userAgent.includes("AppleWebKit") &&
            !navigator.userAgent.includes("Chrome");

          if (!isSafari) {
            setState({ type: "generate-main-menu-item-preview" });
            return;
          }
          setCustomNativeDragPreview({
            getOffset: centerUnderPointer,
            render: ({ container }) => {
              setState({
                type: "generate-safari-main-menu-item-preview",
                container,
              });
              return () => setState(idle);
            },
            nativeSetDragImage,
          });
        },
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop() {
          setState(idle);
          setIsDragging(false);
        },
      }),
      dropTargetForElements({
        element: mainMenuItemInnerRef.current,
        getData: () => ({ mainMenuItemId }),
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId &&
            source.data.type === "subMenuItem"
          );
        },
        getIsSticky: () => true,
        onDragEnter: () => setState(isSubMenuItemOver),
        onDragLeave: () => setState(idle),
        onDragStart: () => setState(isSubMenuItemOver),
        onDrop: () => setState(idle),
      }),
      dropTargetForElements({
        element: mainMenuItemRef.current,
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId &&
            source.data.type === "mainMenuItem"
          );
        },
        getIsSticky: () => true,
        getData: ({ input, element }) => {
          const data = {
            mainMenuItemId,
          };
          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["left", "right"],
          });
        },
        onDragEnter: (args) => {
          setState({
            type: "is-main-menu-item-over",
            closestEdge: extractClosestEdge(args.self.data),
          });
        },
        onDrag: (args) => {
          // skip react re-render if edge is not changing
          setState((current) => {
            const closestEdge: Edge | null = extractClosestEdge(args.self.data);
            if (
              current.type === "is-main-menu-item-over" &&
              current.closestEdge === closestEdge
            ) {
              return current;
            }
            return {
              type: "is-main-menu-item-over",
              closestEdge,
            };
          });
        },
        onDragLeave: () => {
          setState(idle);
        },
        onDrop: () => {
          setState(idle);
        },
      }),
      autoScrollForElements({
        element: scrollableRef.current,
        canScroll: ({ source }) =>
          source.data.instanceId === instanceId &&
          source.data.type === "subMenuItem",
      })
    );
  }, [mainMenuItemId, registerMainMenuItem, instanceId]);

  const stableItems = useRef(mainMenuItem.items);
  useEffect(() => {
    stableItems.current = mainMenuItem.items;
  }, [mainMenuItem.items]);

  const getSubMenuItemIndex = useCallback((userId: string) => {
    return stableItems.current.findIndex((item) => item.userId === userId);
  }, []);

  const getNumSubMenuItems = useCallback(() => {
    return stableItems.current.length;
  }, []);

  const contextValue: MainMenuContextProps = useMemo(() => {
    return { mainMenuItemId, getSubMenuItemIndex, getNumSubMenuItems };
  }, [mainMenuItemId, getSubMenuItemIndex, getNumSubMenuItems]);

  return (
    <MainMenuContext.Provider value={contextValue}>
      <div ref={mainMenuItemRef}>
        {/* This element takes up the same visual space as the main menu item.
          We are using a separate element so we can have two drop targets
          that take up the same visual space (one for sub menu items, one for main menu items)
        */}
        <div ref={mainMenuItemInnerRef}>
          <div>
            <div ref={headerRef}>
              <div>{mainMenuItem.title}</div>
            </div>
            <div ref={scrollableRef}>
              <div>
                {mainMenuItem.items.map((item) => (
                  <SubMenuItem item={item} key={item.userId} />
                ))}
              </div>
            </div>
          </div>
        </div>
        {state.type === "is-main-menu-item-over" && state.closestEdge && (
          <DropIndicator
            edge={state.closestEdge}
            gap={token("space.200", "0")}
          />
        )}
      </div>
      {state.type === "generate-safari-main-menu-item-preview"
        ? createPortal(
            <SafariMainMenuItemPreview mainMenuItem={mainMenuItem} />,
            state.container
          )
        : null}
    </MainMenuContext.Provider>
  );
});

const safariPreviewStyles = css`
  width: "250px";
  background-color: "elevation.surface.sunken";
  border-radius: "border.radius";
  padding: "space.200";
`;

function SafariMainMenuItemPreview({
  mainMenuItem,
}: {
  mainMenuItem: MainMenuItemType;
}) {
  return (
    <div className={safariPreviewStyles}>
      <div>{mainMenuItem.title}</div>
    </div>
  );
}
