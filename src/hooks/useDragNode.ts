import { useContext, useEffect } from "react";
import {
  useDrag,
  DragElementWrapper,
  DragSourceOptions,
  DragPreviewOptions,
  ConnectDragSource,
  ConnectDragPreview,
} from "react-dnd";
import { ItemTypes } from "~/ItemTypes";
import { NodeModel, DragItem, DragSourceElement } from "~/types";
import { useTreeContext } from "~/hooks";
import { PlaceholderContext } from "../providers";

let dragSourceElement: DragSourceElement = null;

const register = (e: DragEvent | TouchEvent): void => {
  const { target } = e;

  if (target instanceof HTMLElement) {
    const source = target.closest('[role="listitem"]');

    if (e.currentTarget === source) {
      dragSourceElement = source;
    }
  }
};

const handleDragStart = (e: DragEvent) => register(e);
const handleTouchStart = (e: TouchEvent) => register(e);

export const useDragNode = <T>(
  item: NodeModel<T>,
  ref: React.RefObject<HTMLElement>
): [
  boolean,
  DragElementWrapper<DragSourceOptions>,
  DragElementWrapper<DragPreviewOptions>
] => {
  const treeContext = useTreeContext<T>();
  const placeholderContext = useContext(PlaceholderContext);

  useEffect(() => {
    const node = ref.current;
    node?.addEventListener("dragstart", handleDragStart);
    node?.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });

    return () => {
      node?.removeEventListener("dragstart", handleDragStart);
      node?.removeEventListener("touchstart", handleTouchStart);
    };
  }, [ref]);

  const [{ isDragging }, drag, preview]: [
    { isDragging: boolean },
    ConnectDragSource,
    ConnectDragPreview
  ] = useDrag({
    type: ItemTypes.TREE_ITEM,
    item: (monitor) => {
      const dragItem: DragItem<T> = { ref, ...item };

      if (treeContext.onDragStart) {
        treeContext.onDragStart(dragItem, monitor);
      }

      return dragItem;
    },
    end: (item, monitor) => {
      const dragItem = item as DragItem<T>;

      // If the user drops outside the container, then we can 
      // still count as a drop based on the last placeholder index.
      // Taken from: https://github.com/minop1205/react-dnd-treeview/pull/99
      //
      // NOTE: This also catches the drags canceled due to the 'Escape' key,
      // there is no way I found to determine whether a drag was canceled/ended 
      // due to 'Escape' key or being dragged outside container 
      // (even with work arounds like seperate listeners and so on).
      const { cancelOnDropOutside } = treeContext;
      const { dropTargetId, index } = placeholderContext;

      if (cancelOnDropOutside || monitor.didDrop()) return;

      if (
        dragItem?.id !== undefined &&
        dropTargetId !== undefined &&
        index !== undefined
      ) {
        treeContext.onDrop(dragItem, dropTargetId, index);
      }

      if (treeContext.onDragEnd) {
        treeContext.onDragEnd(dragItem, monitor);
      }
    },
    canDrag: () => {
      const { canDrag } = treeContext;

      if (dragSourceElement !== ref.current) {
        return false;
      }

      if (canDrag) {
        return canDrag(item.id);
      }

      return true;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return [isDragging, drag, preview];
};
