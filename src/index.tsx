import Draggable, { DraggableEventHandler, DraggableProps } from "react-draggable";
import { Enable, Resizable, ResizeDirection } from "re-resizable";
import * as React from "react";
import { flushSync } from "react-dom";
import "./index.css";

export type Grid = [number, number];

export type Position = {
  x: number;
  y: number;
};

export type DraggableData = {
  node: HTMLElement;
  deltaX: number;
  deltaY: number;
  lastX: number;
  lastY: number;
} & Position;

export type RndDragCallback = DraggableEventHandler;

export type RndDragEvent =
  | React.MouseEvent<HTMLElement | SVGElement>
  | React.TouchEvent<HTMLElement | SVGElement>
  | MouseEvent
  | TouchEvent;

export type RndResizeStartCallback = (
  e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
  dir: ResizeDirection,
  elementRef: HTMLElement,
) => void | boolean;

export type ResizableDelta = {
  width: number;
  height: number;
};

export type RndResizeCallback = (
  e: MouseEvent | TouchEvent,
  dir: ResizeDirection,
  elementRef: HTMLElement,
  delta: ResizableDelta,
  position: Position,
) => void;

type Size = {
  width: string | number;
  height: string | number;
};

type State = {
  resizing: boolean;
  bounds: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  maxWidth?: number | string;
  maxHeight?: number | string;
  snapX: number;
  snapY: number;
};

type MaxSize = {
  maxWidth: number | string;
  maxHeight: number | string;
};

export type ResizeEnable =
  | {
      bottom?: boolean;
      bottomLeft?: boolean;
      bottomRight?: boolean;
      left?: boolean;
      right?: boolean;
      top?: boolean;
      topLeft?: boolean;
      topRight?: boolean;
    }
  | boolean;

export type HandleClasses = {
  bottom?: string;
  bottomLeft?: string;
  bottomRight?: string;
  left?: string;
  right?: string;
  top?: string;
  topLeft?: string;
  topRight?: string;
};

export type HandleStyles = {
  bottom?: React.CSSProperties;
  bottomLeft?: React.CSSProperties;
  bottomRight?: React.CSSProperties;
  left?: React.CSSProperties;
  right?: React.CSSProperties;
  top?: React.CSSProperties;
  topLeft?: React.CSSProperties;
  topRight?: React.CSSProperties;
};

export type HandleComponent = {
  top?: React.ReactElement<any>;
  right?: React.ReactElement<any>;
  bottom?: React.ReactElement<any>;
  left?: React.ReactElement<any>;
  topRight?: React.ReactElement<any>;
  bottomRight?: React.ReactElement<any>;
  bottomLeft?: React.ReactElement<any>;
  topLeft?: React.ReactElement<any>;
};

export interface Props {
  dragGrid?: Grid;
  default?: {
    x: number;
    y: number;
  } & Size;
  position?: {
    x: number;
    y: number;
  };
  size?: Size;
  resizeGrid?: Grid;
  bounds?: string | Element;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onResizeStart?: RndResizeStartCallback;
  onResize?: RndResizeCallback;
  onResizeStop?: RndResizeCallback;
  onDragStart?: RndDragCallback;
  onDrag?: RndDragCallback;
  onDragStop?: RndDragCallback;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  enableResizing?: ResizeEnable;
  resizeHandleClasses?: HandleClasses;
  resizeHandleStyles?: HandleStyles;
  resizeHandleWrapperClass?: string;
  resizeHandleWrapperStyle?: React.CSSProperties;
  resizeHandleComponent?: HandleComponent;
  lockAspectRatio?: boolean | number;
  lockAspectRatioExtraWidth?: number;
  lockAspectRatioExtraHeight?: number;
  maxHeight?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  minWidth?: number | string;
  dragAxis?: "x" | "y" | "both" | "none";
  dragHandleClassName?: string;
  disableDragging?: boolean;
  cancel?: string;
  enableUserSelectHack?: boolean;
  dragPositionOffset?: DraggableProps["positionOffset"];
  allowAnyClick?: boolean;
  scale?: number;
  [key: string]: any;
}

const resizableStyle = {
  width: "auto" as "auto",
  height: "auto" as "auto",
  display: "inline-block" as "inline-block",
  position: "absolute" as "absolute",
  top: 0,
  left: 0,
};

const getEnableResizingByFlag = (flag: boolean): Enable => ({
  bottom: flag,
  bottomLeft: flag,
  bottomRight: flag,
  left: flag,
  right: flag,
  top: flag,
  topLeft: flag,
  topRight: flag,
});

interface DefaultProps {
  maxWidth: number;
  maxHeight: number;
  onResizeStart: RndResizeStartCallback;
  onResize: RndResizeCallback;
  onResizeStop: RndResizeCallback;
  onDragStart: RndDragCallback;
  onDrag: RndDragCallback;
  onDragStop: RndDragCallback;
  scale: number;
}

const VERTICAL_DIRECTIONS = ["left", "right", "vertical-center"];
const HORIZONTAL_DIRECTIONS = ["top", "bottom", "horizontal-center"];
const SNAP_THRESHOLD = 5;

export class Rnd extends React.PureComponent<Props, State> {
  public static defaultProps: DefaultProps = {
    maxWidth: Number.MAX_SAFE_INTEGER,
    maxHeight: Number.MAX_SAFE_INTEGER,
    scale: 1,
    onResizeStart: () => {},
    onResize: () => {},
    onResizeStop: () => {},
    onDragStart: () => {},
    onDrag: () => {},
    onDragStop: () => {},
  };
  resizable!: Resizable;
  draggable!: Draggable;
  resizingPosition = { x: 0, y: 0 };
  offsetFromParent = { left: 0, top: 0 };
  resizableElement: { current: HTMLElement | null } = { current: null };
  originalPosition = { x: 0, y: 0 };
  elementGrid?: HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      resizing: false,
      bounds: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      snapX: 0,
      snapY: 0,
      maxWidth: props.maxWidth,
      maxHeight: props.maxHeight,
    };
    this.onResizeStart = this.onResizeStart.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onResizeStop = this.onResizeStop.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragStop = this.onDragStop.bind(this);
    this.getMaxSizesFromProps = this.getMaxSizesFromProps.bind(this);
  }

  componentDidMount() {
    this.updateOffsetFromParent();
    const { left, top } = this.offsetFromParent;
    const { x, y } = this.getDraggablePosition();
    this.draggable.setState({
      x: x - left,
      y: y - top,
    });
    this.updateGrid();
    // HACK: Apply position adjustment
    this.forceUpdate();
  }

  // HACK: To get `react-draggable` state x and y.
  getDraggablePosition(): { x: number; y: number } {
    const { x, y } = (this.draggable as any).state;
    return { x, y };
  }

  getParent() {
    return this.resizable && (this.resizable as any).parentNode;
  }

  getParentSize(): { width: number; height: number } {
    return (this.resizable as any).getParentSize();
  }

  getMaxSizesFromProps(): MaxSize {
    const maxWidth = typeof this.props.maxWidth === "undefined" ? Number.MAX_SAFE_INTEGER : this.props.maxWidth;
    const maxHeight = typeof this.props.maxHeight === "undefined" ? Number.MAX_SAFE_INTEGER : this.props.maxHeight;
    return { maxWidth, maxHeight };
  }

  getSelfElement(): HTMLElement | null {
    return this.resizable && this.resizable.resizable;
  }

  getOffsetHeight(boundary: HTMLElement) {
    const scale = this.props.scale as number;
    switch (this.props.bounds) {
      case "window":
        return window.innerHeight / scale;
      case "body":
        return document.body.offsetHeight / scale;
      default:
        return boundary.offsetHeight;
    }
  }

  getOffsetWidth(boundary: HTMLElement) {
    const scale = this.props.scale as number;
    switch (this.props.bounds) {
      case "window":
        return window.innerWidth / scale;
      case "body":
        return document.body.offsetWidth / scale;
      default:
        return boundary.offsetWidth;
    }
  }

  onDragStart(e: RndDragEvent, data: DraggableData) {
    this.updateGrid();
    this.checkShouldSnap();

    if (this.props.onDragStart) {
      this.props.onDragStart(e, data);
    }
    const pos = this.getDraggablePosition();
    this.originalPosition = pos;
    if (!this.props.bounds) return;
    const parent = this.getParent();
    const scale = this.props.scale as number;
    let boundary;
    if (this.props.bounds === "parent") {
      boundary = parent;
    } else if (this.props.bounds === "body") {
      const parentRect = parent.getBoundingClientRect();
      const parentLeft = parentRect.left;
      const parentTop = parentRect.top;
      const bodyRect = document.body.getBoundingClientRect();
      const left = -(parentLeft - parent.offsetLeft * scale - bodyRect.left) / scale;
      const top = -(parentTop - parent.offsetTop * scale - bodyRect.top) / scale;
      const right = (document.body.offsetWidth - this.resizable.size.width * scale) / scale + left;
      const bottom = (document.body.offsetHeight - this.resizable.size.height * scale) / scale + top;
      return this.setState({ bounds: { top, right, bottom, left } });
    } else if (this.props.bounds === "window") {
      if (!this.resizable) return;
      const parentRect = parent.getBoundingClientRect();
      const parentLeft = parentRect.left;
      const parentTop = parentRect.top;
      const left = -(parentLeft - parent.offsetLeft * scale) / scale;
      const top = -(parentTop - parent.offsetTop * scale) / scale;
      const right = (window.innerWidth - this.resizable.size.width * scale) / scale + left;
      const bottom = (window.innerHeight - this.resizable.size.height * scale) / scale + top;
      return this.setState({ bounds: { top, right, bottom, left } });
    } else if (typeof this.props.bounds === "string") {
      boundary = document.querySelector(this.props.bounds);
    } else if (this.props.bounds instanceof HTMLElement) {
      boundary = this.props.bounds;
    }
    if (!(boundary instanceof HTMLElement) || !(parent instanceof HTMLElement)) {
      return;
    }
    const boundaryRect = boundary.getBoundingClientRect();
    const boundaryLeft = boundaryRect.left;
    const boundaryTop = boundaryRect.top;
    const parentRect = parent.getBoundingClientRect();
    const parentLeft = parentRect.left;
    const parentTop = parentRect.top;
    const left = (boundaryLeft - parentLeft) / scale;
    const top = boundaryTop - parentTop;
    if (!this.resizable) return;
    this.updateOffsetFromParent();
    const offset = this.offsetFromParent;
    this.setState({
      bounds: {
        top: top - offset.top,
        right: left + (boundary.offsetWidth - this.resizable.size.width) - offset.left / scale,
        bottom: top + (boundary.offsetHeight - this.resizable.size.height) - offset.top,
        left: left - offset.left / scale,
      },
    });
  }

  onDrag(e: RndDragEvent, data: DraggableData) {
    this.updateGrid();
    this.checkShouldSnap();
    this.updatePosition(this.originalPosition);
    if (!this.props.onDrag) return;
    const { left, top } = this.offsetFromParent;
    if (!this.props.dragAxis || this.props.dragAxis === "both") {
      return this.props.onDrag(e, { ...data, x: data.x + left, y: data.y + top });
    } else if (this.props.dragAxis === "x") {
      return this.props.onDrag(e, { ...data, x: data.x + left, y: this.originalPosition.y + top, deltaY: 0 });
    } else if (this.props.dragAxis === "y") {
      return this.props.onDrag(e, { ...data, x: this.originalPosition.x + left, y: data.y + top, deltaX: 0 });
    }
  }

  updateGrid = () => {
    if (!this.elementGrid) return;
    this.updateElementHorizontalGrid();
    this.updateElementVerticalGrid();
  };

  checkShouldSnap = () => {
    const rnds = document.getElementsByClassName("rnd-wrapper");
    const shouldSnap = {
      top: false,
      bottom: false,
      verticalCenter: false,
      left: false,
      right: false,
      horizontalCenter: false,
    };
    const shouldSnapTo = {
      top: false,
      bottom: false,
      ["vertical-center"]: false,
      left: false,
      right: false,
      ["horizontal-center"]: false,
    };

    if (!rnds) return shouldSnap;

    Array.from(rnds).forEach((rnd) => {
      const grid = rnd.getElementsByClassName("rnd-grid")?.item(0);
      if (!grid || grid === this.elementGrid) return;

      Array.from(grid.children).forEach((elementToSnapTo) => {
        const elementToSnapToDir = elementToSnapTo.getAttribute("dir") as
          | "top"
          | "bottom"
          | "left"
          | "right"
          | "horizontal-center"
          | "vertical-center";

        if (this.elementGrid) {
          Array.from(this.elementGrid?.children).forEach((elementToSnap) => {
            const elementToSnapDir = elementToSnap.getAttribute("dir");
            if (elementToSnapTo && elementToSnap) {
              const rectToSnapTo = elementToSnapTo.getBoundingClientRect();
              const rectToSnap = elementToSnap.getBoundingClientRect();
              const shouldSnapTop =
                (Math.abs(rectToSnapTo.top - rectToSnap.top) <= SNAP_THRESHOLD ||
                  Math.abs(rectToSnapTo.bottom - rectToSnap.top) <= SNAP_THRESHOLD) &&
                HORIZONTAL_DIRECTIONS.includes(elementToSnapToDir);
              const shouldSnapBottom =
                (Math.abs(rectToSnapTo.bottom - rectToSnap.bottom) <= SNAP_THRESHOLD ||
                  Math.abs(rectToSnapTo.top - rectToSnap.bottom) <= SNAP_THRESHOLD) &&
                HORIZONTAL_DIRECTIONS.includes(elementToSnapToDir);
              const shouldSnapLeft =
                Math.abs(rectToSnapTo.left - rectToSnap.left) <= SNAP_THRESHOLD ||
                (Math.abs(rectToSnapTo.right - rectToSnap.left) <= SNAP_THRESHOLD &&
                  VERTICAL_DIRECTIONS.includes(elementToSnapToDir));
              const shouldSnapRight =
                (Math.abs(rectToSnapTo.right - rectToSnap.right) <= SNAP_THRESHOLD ||
                  Math.abs(rectToSnapTo.left - rectToSnap.right) <= SNAP_THRESHOLD) &&
                VERTICAL_DIRECTIONS.includes(elementToSnapToDir);

              switch (elementToSnapDir) {
                case "top":
                  shouldSnap.top ||= shouldSnapTop;
                  if (shouldSnapTop) {
                    shouldSnapTo[elementToSnapToDir] = true;
                  }
                  break;
                case "bottom":
                  shouldSnap.bottom ||= shouldSnapBottom;
                  if (shouldSnapBottom) {
                    shouldSnapTo[elementToSnapToDir] = true;
                  }
                  break;
                case "left":
                  shouldSnap.left ||= shouldSnapLeft;
                  if (shouldSnapLeft) {
                    shouldSnapTo[elementToSnapToDir] = true;
                  }
                  break;
                case "right":
                  shouldSnap.right ||= shouldSnapRight;
                  if (shouldSnapRight) {
                    shouldSnapTo[elementToSnapToDir] = true;
                  }
                  break;
                case "vertical-center":
                  const shouldSnapVertically = shouldSnapLeft || shouldSnapRight;
                  shouldSnap.verticalCenter ||= shouldSnapVertically;
                  if (shouldSnapVertically) {
                    shouldSnapTo[elementToSnapToDir] = true;
                  }
                  break;
                case "horizontal-center":
                  const shouldSnapHorizontally = shouldSnapTop || shouldSnapBottom;
                  shouldSnap.horizontalCenter ||= shouldSnapHorizontally;
                  if (shouldSnapHorizontally) {
                    shouldSnapTo[elementToSnapToDir] = true;
                  }
                  break;
                default:
                  break;
              }

              const distancesY = [
                rectToSnapTo.top - rectToSnap.top,
                rectToSnapTo.bottom - rectToSnap.top,
                rectToSnapTo.bottom - rectToSnap.bottom,
                rectToSnapTo.top - rectToSnap.bottom,
              ];

              const closestVerticalDistance = Math.min(...distancesY.map((i) => Math.abs(i)));

              const snapY = distancesY.find((t) => Math.abs(t) === closestVerticalDistance) || 0;

              if (Math.abs(snapY) <= SNAP_THRESHOLD && !this.state.snapY) {
                this.setState({
                  snapY: snapY,
                });
              }
            }
          });

          (elementToSnapTo as HTMLSpanElement).style.backgroundColor =
            shouldSnapTo[elementToSnapToDir] && (this.draggable.state as { dragging: boolean }).dragging
              ? "blue"
              : "transparent";
        }
      });
    });

    return shouldSnap;
  };

  updateElementHorizontalGrid = () => {
    HORIZONTAL_DIRECTIONS.forEach((dir) => {
      const screenWidth = window.innerWidth;
      const elements = this.elementGrid?.getElementsByClassName(dir);
      if (!elements) return;
      const gridLine = elements.item(0) as HTMLSpanElement;
      const wrapperRect = this.resizableElement.current?.getBoundingClientRect();
      if (!gridLine || !wrapperRect) return;
      gridLine.style.width = `${screenWidth}px`;
      gridLine.style.left = `${wrapperRect.left * -1}px`;
    });
  };

  updateElementVerticalGrid = () => {
    VERTICAL_DIRECTIONS.forEach((dir) => {
      const screenHeight = window.innerHeight;
      const elements = this.elementGrid?.getElementsByClassName(dir);
      if (!elements) return;
      const gridLine = elements.item(0) as HTMLSpanElement;
      const wrapperRect = this.resizableElement.current?.getBoundingClientRect();
      if (!gridLine || !wrapperRect) return;
      gridLine.style.height = `${screenHeight}px`;
      gridLine.style.top = `${wrapperRect.top * -1}px`;
    });
  };

  onDragStop(e: RndDragEvent, data: DraggableData) {
    this.checkShouldSnap();
    if (!this.props.onDragStop) return;
    const { left, top } = this.offsetFromParent;
    if (!this.props.dragAxis || this.props.dragAxis === "both") {
      return this.props.onDragStop(e, { ...data, x: data.x + left, y: data.y + top });
    } else if (this.props.dragAxis === "x") {
      return this.props.onDragStop(e, { ...data, x: data.x + left, y: this.originalPosition.y + top, deltaY: 0 });
    } else if (this.props.dragAxis === "y") {
      return this.props.onDragStop(e, { ...data, x: this.originalPosition.x + left, y: data.y + top, deltaX: 0 });
    }
  }

  onResizeStart(
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
    dir: ResizeDirection,
    elementRef: HTMLElement,
  ) {
    e.stopPropagation();
    this.setState({
      resizing: true,
    });
    const scale = this.props.scale as number;
    const offset = this.offsetFromParent;
    const pos = this.getDraggablePosition();
    this.resizingPosition = { x: pos.x + offset.left, y: pos.y + offset.top };
    this.originalPosition = pos;

    if (this.props.bounds) {
      const parent = this.getParent();
      let boundary;
      if (this.props.bounds === "parent") {
        boundary = parent;
      } else if (this.props.bounds === "body") {
        boundary = document.body;
      } else if (this.props.bounds === "window") {
        boundary = window;
      } else if (typeof this.props.bounds === "string") {
        boundary = document.querySelector(this.props.bounds);
      } else if (this.props.bounds instanceof HTMLElement) {
        boundary = this.props.bounds;
      }

      const self = this.getSelfElement();
      if (
        self instanceof Element &&
        (boundary instanceof HTMLElement || boundary === window) &&
        parent instanceof HTMLElement
      ) {
        let { maxWidth, maxHeight } = this.getMaxSizesFromProps();
        const parentSize = this.getParentSize();
        if (maxWidth && typeof maxWidth === "string") {
          if (maxWidth.endsWith("%")) {
            const ratio = Number(maxWidth.replace("%", "")) / 100;
            maxWidth = parentSize.width * ratio;
          } else if (maxWidth.endsWith("px")) {
            maxWidth = Number(maxWidth.replace("px", ""));
          }
        }
        if (maxHeight && typeof maxHeight === "string") {
          if (maxHeight.endsWith("%")) {
            const ratio = Number(maxHeight.replace("%", "")) / 100;
            maxHeight = parentSize.height * ratio;
          } else if (maxHeight.endsWith("px")) {
            maxHeight = Number(maxHeight.replace("px", ""));
          }
        }
        const selfRect = self.getBoundingClientRect();
        const selfLeft = selfRect.left;
        const selfTop = selfRect.top;
        const boundaryRect = this.props.bounds === "window" ? { left: 0, top: 0 } : boundary.getBoundingClientRect();
        const boundaryLeft = boundaryRect.left;
        const boundaryTop = boundaryRect.top;
        const offsetWidth = this.getOffsetWidth(boundary);
        const offsetHeight = this.getOffsetHeight(boundary);
        const hasLeft = dir.toLowerCase().endsWith("left");
        const hasRight = dir.toLowerCase().endsWith("right");
        const hasTop = dir.startsWith("top");
        const hasBottom = dir.startsWith("bottom");

        if ((hasLeft || hasTop) && this.resizable) {
          const max = (selfLeft - boundaryLeft) / scale + this.resizable.size.width;
          this.setState({ maxWidth: max > Number(maxWidth) ? maxWidth : max });
        }
        // INFO: To set bounds in `lock aspect ratio with bounds` case. See also that story.
        if (hasRight || (this.props.lockAspectRatio && !hasLeft && !hasTop)) {
          const max = offsetWidth + (boundaryLeft - selfLeft) / scale;
          this.setState({ maxWidth: max > Number(maxWidth) ? maxWidth : max });
        }
        if ((hasTop || hasLeft) && this.resizable) {
          const max = (selfTop - boundaryTop) / scale + this.resizable.size.height;
          this.setState({
            maxHeight: max > Number(maxHeight) ? maxHeight : max,
          });
        }
        // INFO: To set bounds in `lock aspect ratio with bounds` case. See also that story.
        if (hasBottom || (this.props.lockAspectRatio && !hasTop && !hasLeft)) {
          const max = offsetHeight + (boundaryTop - selfTop) / scale;
          this.setState({
            maxHeight: max > Number(maxHeight) ? maxHeight : max,
          });
        }
      }
    } else {
      this.setState({
        maxWidth: this.props.maxWidth,
        maxHeight: this.props.maxHeight,
      });
    }
    if (this.props.onResizeStart) {
      this.props.onResizeStart(e, dir, elementRef);
    }
  }

  onResize(
    e: MouseEvent | TouchEvent,
    direction: ResizeDirection,
    elementRef: HTMLElement,
    delta: { height: number; width: number },
  ) {
    // INFO: Apply x and y position adjustments caused by resizing to draggable
    const newPos = { x: this.originalPosition.x, y: this.originalPosition.y };
    const left = -delta.width;
    const top = -delta.height;
    const directions: ResizeDirection[] = ["top", "left", "topLeft", "bottomLeft", "topRight"];

    if (directions.includes(direction)) {
      if (direction === "bottomLeft") {
        newPos.x += left;
      } else if (direction === "topRight") {
        newPos.y += top;
      } else {
        newPos.x += left;
        newPos.y += top;
      }
    }

    const draggableState = this.draggable.state as unknown as { x: number; y: number };
    if (newPos.x !== draggableState.x || newPos.y !== draggableState.y) {
      flushSync(() => {
        this.draggable.setState(newPos);
      });
    }

    this.updateOffsetFromParent();
    const offset = this.offsetFromParent;
    const x = this.getDraggablePosition().x + offset.left;
    const y = this.getDraggablePosition().y + offset.top;

    this.resizingPosition = { x, y };
    if (!this.props.onResize) return;
    this.props.onResize(e, direction, elementRef, delta, {
      x,
      y,
    });
  }

  onResizeStop(
    e: MouseEvent | TouchEvent,
    direction: ResizeDirection,
    elementRef: HTMLElement,
    delta: { height: number; width: number },
  ) {
    this.setState({
      resizing: false,
    });
    const { maxWidth, maxHeight } = this.getMaxSizesFromProps();
    this.setState({ maxWidth, maxHeight });
    if (this.props.onResizeStop) {
      this.props.onResizeStop(e, direction, elementRef, delta, this.resizingPosition);
    }
  }

  updateSize(size: { width: number | string; height: number | string }) {
    if (!this.resizable) return;
    this.resizable.updateSize({ width: size.width, height: size.height });
  }

  updatePosition(position: Position) {
    this.draggable.setState(position);
  }

  updateOffsetFromParent() {
    const scale = this.props.scale as number;
    const parent = this.getParent();
    const self = this.getSelfElement();
    if (!parent || self === null) {
      return {
        top: 0,
        left: 0,
      };
    }
    const parentRect = parent.getBoundingClientRect();
    const parentLeft = parentRect.left;
    const parentTop = parentRect.top;
    const selfRect = self.getBoundingClientRect();
    const position = this.getDraggablePosition();
    const scrollLeft = parent.scrollLeft;
    const scrollTop = parent.scrollTop;
    this.offsetFromParent = {
      left: selfRect.left - parentLeft + scrollLeft - position.x * scale,
      top: selfRect.top - parentTop + scrollTop - position.y * scale,
    };
  }

  setElementGridRef = (ref: HTMLDivElement) => {
    if (!ref) return;
    this.elementGrid = ref;
  };

  render() {
    const {
      disableDragging,
      style,
      dragHandleClassName,
      position,
      onMouseDown,
      onMouseUp,
      dragAxis,
      dragGrid,
      bounds,
      enableUserSelectHack,
      cancel,
      children,
      onResizeStart,
      onResize,
      onResizeStop,
      onDragStart,
      onDrag,
      onDragStop,
      resizeHandleStyles,
      resizeHandleClasses,
      resizeHandleComponent,
      enableResizing,
      resizeGrid,
      resizeHandleWrapperClass,
      resizeHandleWrapperStyle,
      scale,
      allowAnyClick,
      dragPositionOffset,
      ...resizableProps
    } = this.props;
    const defaultValue = this.props.default ? { ...this.props.default } : undefined;
    // Remove unknown props, see also https://reactjs.org/warnings/unknown-prop.html
    delete resizableProps.default;

    const cursorStyle = disableDragging || dragHandleClassName ? { cursor: "auto" } : { cursor: "move" };
    const innerStyle = {
      ...resizableStyle,
      ...cursorStyle,
      ...style,
    };
    const { left, top } = this.offsetFromParent;
    let draggablePosition;
    if (position) {
      draggablePosition = {
        x: position.x - left,
        y: position.y - top,
      };
    }
    // INFO: Make uncontorolled component when resizing to control position by setPostion.
    const pos = this.state.resizing ? undefined : draggablePosition;
    const dragAxisOrUndefined = this.state.resizing ? "both" : dragAxis;

    return (
      <Draggable
        ref={(c: Draggable) => {
          if (!c) return;
          this.draggable = c;
        }}
        handle={dragHandleClassName ? `.${dragHandleClassName}` : undefined}
        defaultPosition={defaultValue}
        onMouseDown={onMouseDown}
        defaultClassName="rnd-wrapper"
        // @ts-expect-error
        onMouseUp={onMouseUp}
        onStart={this.onDragStart}
        onDrag={this.onDrag}
        onStop={this.onDragStop}
        axis={dragAxisOrUndefined}
        disabled={disableDragging}
        grid={dragGrid}
        bounds={bounds ? this.state.bounds : undefined}
        position={pos}
        enableUserSelectHack={enableUserSelectHack}
        cancel={cancel}
        scale={scale}
        allowAnyClick={allowAnyClick}
        nodeRef={this.resizableElement}
        positionOffset={dragPositionOffset}
      >
        <Resizable
          {...resizableProps}
          ref={(c: Resizable | null) => {
            if (!c) return;
            this.resizable = c;
            this.resizableElement.current = c.resizable;
          }}
          defaultSize={defaultValue}
          size={this.props.size}
          enable={typeof enableResizing === "boolean" ? getEnableResizingByFlag(enableResizing) : enableResizing}
          onResizeStart={this.onResizeStart}
          onResize={this.onResize}
          onResizeStop={this.onResizeStop}
          style={innerStyle}
          minWidth={this.props.minWidth}
          minHeight={this.props.minHeight}
          maxWidth={this.state.resizing ? this.state.maxWidth : this.props.maxWidth}
          maxHeight={this.state.resizing ? this.state.maxHeight : this.props.maxHeight}
          grid={resizeGrid}
          handleWrapperClass={resizeHandleWrapperClass}
          handleWrapperStyle={resizeHandleWrapperStyle}
          lockAspectRatio={this.props.lockAspectRatio}
          lockAspectRatioExtraWidth={this.props.lockAspectRatioExtraWidth}
          lockAspectRatioExtraHeight={this.props.lockAspectRatioExtraHeight}
          handleStyles={resizeHandleStyles}
          handleClasses={resizeHandleClasses}
          handleComponent={resizeHandleComponent}
          scale={this.props.scale}
        >
          <div ref={this.setElementGridRef} className="rnd-grid">
            {[...VERTICAL_DIRECTIONS, ...HORIZONTAL_DIRECTIONS].map((dir) => {
              return <span className={dir} dir={dir}></span>;
            })}
          </div>
          {children}
        </Resizable>
      </Draggable>
    );
  }
}
