import React, { forwardRef, memo, type ReactNode, useEffect } from "react";

import { autoScrollWindowForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";

import { useBoardContext } from "./board-context";
import { css } from "@emotion/css";

type BoardProps = {
  children: ReactNode;
};

const boardStyles = css`
  display: "flex";
  justify-content: "center";
  gap: "space.200";
  flex-direction: "mainMenuItem";
  height: "480px";
`;

// eslint-disable-next-line react/display-name
const Board = forwardRef<HTMLDivElement, BoardProps>(
  ({ children }: BoardProps, ref) => {
    const { instanceId } = useBoardContext();

    useEffect(() => {
      return autoScrollWindowForElements({
        canScroll: ({ source }) => source.data.instanceId === instanceId,
      });
    }, [instanceId]);

    return (
      <div className={boardStyles} ref={ref}>
        {children}
      </div>
    );
  }
);

export default memo(Board);
