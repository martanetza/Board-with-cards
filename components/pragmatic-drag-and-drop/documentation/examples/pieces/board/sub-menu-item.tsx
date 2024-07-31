import React, {
  forwardRef,
  Fragment,
  memo,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import ReactDOM from "react-dom";
import invariant from "tiny-invariant";

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
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { dropTargetForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import { token } from "@atlaskit/tokens";

import { type MainMenuItemType, type Person } from "../../data";

import { useBoardContext } from "./board-context";
import { css } from "@emotion/css";

type State =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement; rect: DOMRect }
  | { type: "dragging" };

const idleState: State = { type: "idle" };
const draggingState: State = { type: "dragging" };

const baseStyles = css`
  width: "100%";
  padding: "space.100";
  background-color: "elevation.surface";
  border-radius: "border.radius.200";
  position: "relative";
  &:hover {
    background-color: "green";
  }
`;

type CardPrimitiveProps = {
  closestEdge: Edge | null;
  item: Person;
  state: State;
  actionMenuTriggerRef?: Ref<HTMLButtonElement>;
};

const CardPrimitive = forwardRef<HTMLDivElement, CardPrimitiveProps>(
  function CardPrimitive(
    { closestEdge, item, state, actionMenuTriggerRef },
    ref
  ) {
    const { name, userId } = item;

    return (
      <div ref={ref} className={baseStyles}>
        <div>
          <div>{name}</div>
        </div>
        <div>
          <div>button</div>
        </div>

        {closestEdge && (
          <DropIndicator edge={closestEdge} gap={token("space.100", "0")} />
        )}
      </div>
    );
  }
);

export const SubMenuItem = memo(function Card({ item }: { item: Person }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { userId } = item;
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [state, setState] = useState<State>(idleState);

  // const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const { instanceId, registerCard } = useBoardContext();
  useEffect(() => {
    // invariant(actionMenuTriggerRef.current);
    invariant(ref.current);
    return registerCard({
      cardId: userId,
      entry: {
        element: ref.current,
        // actionMenuTrigger: actionMenuTriggerRef.current,
      },
    });
  }, [registerCard, userId]);

  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(
      draggable({
        element: element,
        getInitialData: () => ({ type: "card", itemId: userId, instanceId }),
        onGenerateDragPreview: ({ location, source, nativeSetDragImage }) => {
          const rect = source.element.getBoundingClientRect();

          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element,
              input: location.current.input,
            }),
            render({ container }) {
              setState({ type: "preview", container, rect });
              return () => setState(draggingState);
            },
          });
        },

        onDragStart: () => setState(draggingState),
        onDrop: () => setState(idleState),
      }),
      dropTargetForExternal({
        element: element,
      }),
      dropTargetForElements({
        element: element,
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId && source.data.type === "card"
          );
        },
        getIsSticky: () => true,
        getData: ({ input, element }) => {
          const data = { type: "card", itemId: userId };

          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter: (args) => {
          if (args.source.data.itemId !== userId) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDrag: (args) => {
          if (args.source.data.itemId !== userId) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDragLeave: () => {
          setClosestEdge(null);
        },
        onDrop: () => {
          setClosestEdge(null);
        },
      })
    );
  }, [instanceId, item, userId]);

  return (
    <>
      <CardPrimitive
        ref={ref}
        item={item}
        state={state}
        closestEdge={closestEdge}
        // actionMenuTriggerRef={actionMenuTriggerRef}
      />
      {state.type === "preview" &&
        ReactDOM.createPortal(
          <div
            style={{
              /**
               * Ensuring the preview has the same dimensions as the original.
               *
               * Using `border-box` sizing here is not necessary in this
               * specific example, but it is safer to include generally.
               */
              // eslint-disable-next-line @atlaskit/ui-styling-standard/enforce-style-prop -- Ignored via go/DSP-18766
              boxSizing: "border-box",
              width: state.rect.width,
              height: state.rect.height,
            }}
          >
            <CardPrimitive item={item} state={state} closestEdge={null} />
          </div>,
          state.container
        )}
    </>
  );
});
