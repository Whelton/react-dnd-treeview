import React, {
  useEffect,
  useRef,
  useContext,
  PropsWithChildren,
  ReactElement,
  ElementType,
} from "react";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Container } from "./Container";
import {
  useTreeContext,
  useDragNode,
  useDropNode,
  useDragControl,
} from "./hooks";
import { PlaceholderContext } from "./providers";
import { NodeModel, RenderParams, TreeListItemComponentRender } from "./types";
import { isDroppable } from "./utils";

type Props = PropsWithChildren<{
  id: NodeModel["id"];
  depth: number;
}>;

export const Node = <T,>(props: Props): ReactElement | null => {
  const treeContext = useTreeContext<T>();
  const placeholderContext = useContext(PlaceholderContext);
  const ref = useRef<HTMLElement>(null);
  const item = treeContext.tree.find(
    (node) => node.id === props.id
  ) as NodeModel<T>;
  const { openIds, classes } = treeContext;
  const open = openIds.includes(props.id);

  const [isDragging, drag, preview] = useDragNode(item, ref);
  const [isOver, dragSource, drop] = useDropNode(item, ref);

  drag(ref);

  if (isDroppable(dragSource?.id, props.id, treeContext)) {
    drop(ref);
  }

  const hasChild = !!treeContext.tree.find((node) => node.parent === props.id);

  useEffect(() => {
    if (treeContext.dragPreviewRender) {
      preview(getEmptyImage(), { captureDraggingState: true });
    }
  }, [preview, treeContext.dragPreviewRender]);

  useDragControl(ref);

  const handleToggle = () => treeContext.onToggle(item.id);

  let className = classes?.listItem || "";

  if (isOver && classes?.dropTarget) {
    className = `${className} ${classes.dropTarget}`;
  }

  if (isDragging && classes?.draggingSource) {
    className = `${className} ${classes.draggingSource}`;
  }

  const draggable = treeContext.canDrag ? treeContext.canDrag(props.id) : true;
  const isDropTarget = placeholderContext.dropTargetId === props.id;

  const params: RenderParams = {
    depth: props.depth,
    isOpen: open,
    isDragging,
    isDropTarget,
    draggable,
    hasChild,
    containerRef: ref,
    onToggle: handleToggle,
  };

  const children = (
    <>
      {treeContext.render(item, params)}
      {open && hasChild && (
        <Container parentId={props.id} depth={props.depth + 1} />
      )}
    </>
  )

  // ElementType (eg 'li', 'div', etc)
  if (typeof treeContext.listItemComponent === 'string') {
    const Component = treeContext.listItemComponent as ElementType
    return (
      <Component ref={ref} className={className} role="listitem">
        {children}
      </Component>
    );
  }
  // React.ComponentType
  else {
    return (treeContext.listItemComponent as TreeListItemComponentRender<T>)({
      depth: props.depth,
      item: item,
      forwardedRef: ref, 
      role: 'listitem',
      children: children
    })
  }
};
