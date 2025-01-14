import React, { createContext, useImperativeHandle, useState, useContext, useEffect, useRef, useMemo, forwardRef } from 'react';
import { HTML5Backend, getEmptyImage } from 'react-dnd-html5-backend';
import { useDragDropManager, useDrag, useDrop, useDragLayer } from 'react-dnd';
export { DndProvider } from 'react-dnd';
import { PointerTransition, TouchTransition } from 'dnd-multi-backend';
export { MultiBackend } from 'dnd-multi-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

var compareItems = function (a, b) {
    if (a.text > b.text) {
        return 1;
    }
    else if (a.text < b.text) {
        return -1;
    }
    return 0;
};

var getTreeItem = function (tree, id) { return tree.find(function (n) { return n.id === id; }); };

var isAncestor = function (tree, sourceId, targetId) {
    if (targetId === 0) {
        return false;
    }
    var targetNode = tree.find(function (node) { return node.id === targetId; });
    if (targetNode === undefined) {
        return false;
    }
    if (targetNode.parent === sourceId) {
        return true;
    }
    return isAncestor(tree, sourceId, targetNode.parent);
};

var isDroppable = function (dragSourceId, dropTargetId, treeContext) {
    var tree = treeContext.tree, rootId = treeContext.rootId, canDrop = treeContext.canDrop;
    if (dragSourceId === undefined) {
        // Dropability judgment of each node in the undragged state.
        // Without this process, the newly mounted node will not be able to be dropped unless it is re-rendered
        if (dropTargetId === rootId) {
            return true;
        }
        var dropTargetNode = tree.find(function (node) { return node.id === dropTargetId; });
        if (dropTargetNode && dropTargetNode.droppable) {
            return true;
        }
        return false;
    }
    else {
        if (canDrop) {
            var result = canDrop(dragSourceId, dropTargetId);
            if (result !== undefined) {
                return result;
            }
        }
        if (dragSourceId === dropTargetId) {
            return false;
        }
        var dragSourceNode = tree.find(function (node) { return node.id === dragSourceId; });
        var dropTargetNode = tree.find(function (node) { return node.id === dropTargetId; });
        // dragSource is external node
        if (dragSourceNode === undefined) {
            return dropTargetId === rootId || !!(dropTargetNode === null || dropTargetNode === void 0 ? void 0 : dropTargetNode.droppable);
        }
        // dropTarget is root node
        if (dropTargetNode === undefined) {
            return dragSourceNode.parent !== 0;
        }
        if (dragSourceNode.parent === dropTargetId || !dropTargetNode.droppable) {
            return false;
        }
        return !isAncestor(tree, dragSourceId, dropTargetId);
    }
};

var mutateTree = function (tree, dragSourceId, dropTargetId) {
    return tree.map(function (node) {
        if (node.id === dragSourceId) {
            return __assign(__assign({}, node), { parent: dropTargetId });
        }
        return node;
    });
};

var getDestIndex = function (tree, dropTargetId, index) {
    if (index === 0) {
        return 0;
    }
    var siblings = tree.filter(function (node) { return node.parent === dropTargetId; });
    if (siblings[index]) {
        return tree.findIndex(function (node) { return node.id === siblings[index].id; });
    }
    return tree.findIndex(function (node) { return node.id === siblings[index - 1].id; }) + 1;
};

var getSrcIndex = function (tree, dragSourceId) {
    return tree.findIndex(function (node) { return node.id === dragSourceId; });
};
var getModifiedIndex = function (tree, dragSourceId, dropTargetId, index) {
    var srcIndex = getSrcIndex(tree, dragSourceId);
    var destIndex = getDestIndex(tree, dropTargetId, index);
    destIndex = destIndex > srcIndex ? destIndex - 1 : destIndex;
    return [srcIndex, destIndex];
};

var arrayMoveMutable = function (array, fromIndex, toIndex) {
    var startIndex = fromIndex < 0 ? array.length + fromIndex : fromIndex;
    if (startIndex >= 0 && startIndex < array.length) {
        var endIndex = toIndex < 0 ? array.length + toIndex : toIndex;
        var item = array.splice(fromIndex, 1)[0];
        array.splice(endIndex, 0, item);
    }
};
var mutateTreeWithIndex = function (tree, dragSourceId, dropTargetId, index) {
    var _a = getModifiedIndex(tree, dragSourceId, dropTargetId, index), srcIndex = _a[0], destIndex = _a[1];
    var newTree = __spreadArray([], tree, true);
    arrayMoveMutable(newTree, srcIndex, destIndex);
    return newTree.map(function (node) {
        if (node.id === dragSourceId) {
            return __assign(__assign({}, node), { parent: dropTargetId });
        }
        return node;
    });
};

var compareYCoord = function (el, pointerY) {
    var bbox = el.getBoundingClientRect();
    var centerY = bbox.top + bbox.height / 2;
    return pointerY > centerY ? "down" : "up";
};
var getInnerIndex = function (listItems, monitor) {
    var pos = "";
    var index = 0;
    listItems.forEach(function (el, key) {
        var _a;
        var flag = compareYCoord(el, ((_a = monitor.getClientOffset()) === null || _a === void 0 ? void 0 : _a.y) || 0);
        if (pos === "") {
            pos = flag;
        }
        else if (pos !== flag) {
            pos = flag;
            index = key;
        }
        if (key === listItems.length - 1 && flag === "down") {
            index = key + 1;
        }
    });
    return index;
};
var getOuterIndex = function (node, nodeEl, monitor) {
    var parentList = nodeEl.closest('[role="list"]');
    var parentListItems = parentList === null || parentList === void 0 ? void 0 : parentList.querySelectorAll(':scope > [role="listitem"]');
    if (!parentListItems) {
        return null;
    }
    return getInnerIndex(parentListItems, monitor);
};
var getHoverPosition = function (el, pointerY, context) {
    var bbox = el.getBoundingClientRect();
    var offsetY = context.dropTargetOffset;
    var upSideY = bbox.top + offsetY;
    var lowerSideY = bbox.bottom - offsetY;
    if (pointerY > lowerSideY) {
        return "lower";
    }
    else if (pointerY < upSideY) {
        return "upper";
    }
    return "middle";
};
var getDropTarget = function (node, nodeEl, monitor, context) {
    var _a;
    if (!nodeEl) {
        return null;
    }
    if (node === null) {
        var listItems = nodeEl.querySelectorAll(':scope > [role="listitem"]');
        return {
            id: context.rootId,
            index: getInnerIndex(listItems, monitor),
        };
    }
    var dragSource = monitor.getItem();
    var list = nodeEl.querySelector('[role="list"]');
    var hoverPosition = getHoverPosition(nodeEl, ((_a = monitor.getClientOffset()) === null || _a === void 0 ? void 0 : _a.y) || 0, context);
    if (!list) {
        if (hoverPosition === "middle") {
            return {
                id: node.id,
                index: 0,
            };
        }
        if (isDroppable(dragSource.id, node.parent, context)) {
            var outerIndex = getOuterIndex(node, nodeEl, monitor);
            if (outerIndex === null) {
                return null;
            }
            return {
                id: node.parent,
                index: outerIndex,
            };
        }
        return null;
    }
    else {
        if (hoverPosition === "upper") {
            if (isDroppable(dragSource.id, node.parent, context)) {
                var outerIndex = getOuterIndex(node, nodeEl, monitor);
                if (outerIndex === null) {
                    return null;
                }
                return {
                    id: node.parent,
                    index: outerIndex,
                };
            }
            else {
                return {
                    id: node.id,
                    index: 0,
                };
            }
        }
        var listItems = list.querySelectorAll(':scope > [role="listitem"]');
        return {
            id: node.id,
            index: getInnerIndex(listItems, monitor),
        };
    }
};

var getDescendants = function (treeData, id) {
    var descendants = [];
    var search = function (tree, ids) {
        var children = tree.filter(function (node) { return ids.includes(node.parent); });
        if (children.length > 0) {
            descendants = __spreadArray(__spreadArray([], descendants, true), children, true);
            search(tree, children.map(function (node) { return node.id; }));
        }
    };
    search(treeData, [id]);
    return descendants;
};

var getBackendOptions = function (options) {
    if (options === void 0) { options = {}; }
    return {
        backends: [
            {
                id: "html5",
                backend: HTML5Backend,
                options: options.html5,
                transition: PointerTransition,
            },
            {
                id: "touch",
                backend: TouchBackend,
                options: options.touch || { enableMouseEvents: true },
                preview: true,
                transition: TouchTransition,
            },
        ],
    };
};

var isNodeModel = function (arg) {
    return (arg.id !== undefined && arg.parent !== undefined && arg.text !== undefined);
};

var TreeContext = createContext({});
var TreeProvider = function (props) {
    var _a = useOpenIdsHelper(props.tree, props.initialOpen), openIds = _a[0], _b = _a[1], handleToggle = _b.handleToggle, handleCloseAll = _b.handleCloseAll, handleOpenAll = _b.handleOpenAll, handleOpen = _b.handleOpen, handleClose = _b.handleClose;
    useImperativeHandle(props.treeRef, function () { return ({
        open: function (targetIds) { return handleOpen(targetIds, props.onChangeOpen); },
        close: function (targetIds) { return handleClose(targetIds, props.onChangeOpen); },
        openAll: function () { return handleOpenAll(props.onChangeOpen); },
        closeAll: function () { return handleCloseAll(props.onChangeOpen); },
    }); });
    var monitor = useDragDropManager().getMonitor();
    var canDropCallback = props.canDrop;
    var canDragCallback = props.canDrag;
    var value = __assign(__assign({ extraAcceptTypes: [], listComponent: "ul", listItemComponent: "li", placeholderComponent: "li", sort: true, insertDroppableFirst: true, cancelOnDropOutside: true, dropTargetOffset: 0, initialOpen: false }, props), { openIds: openIds, onDrop: function (dragSource, dropTargetId, index) {
            // if dragSource is null,
            // it means that the drop is from the outside of the react-dnd.
            if (!dragSource) {
                var options = {
                    dropTargetId: dropTargetId,
                    dropTarget: getTreeItem(props.tree, dropTargetId),
                    monitor: monitor,
                };
                if (props.sort === false) {
                    options.destinationIndex = getDestIndex(props.tree, dropTargetId, index);
                }
                props.onDrop(props.tree, options);
            }
            else {
                var options = {
                    dragSourceId: dragSource.id,
                    dropTargetId: dropTargetId,
                    dragSource: dragSource,
                    dropTarget: getTreeItem(props.tree, dropTargetId),
                    monitor: monitor,
                };
                var tree = props.tree;
                // If the dragSource does not exist in the tree,
                // it is an external node, so add it to the tree
                if (!getTreeItem(tree, dragSource.id)) {
                    tree = __spreadArray(__spreadArray([], tree, true), [dragSource], false);
                }
                if (props.sort === false) {
                    var _a = getModifiedIndex(tree, dragSource.id, dropTargetId, index), destIndex = _a[1];
                    options.destinationIndex = destIndex;
                    props.onDrop(mutateTreeWithIndex(tree, dragSource.id, dropTargetId, index), options);
                    return;
                }
                props.onDrop(mutateTree(tree, dragSource.id, dropTargetId), options);
            }
        }, canDrop: canDropCallback
            ? function (dragSourceId, dropTargetId) {
                return canDropCallback(props.tree, {
                    dragSourceId: dragSourceId,
                    dropTargetId: dropTargetId,
                    dragSource: monitor.getItem(),
                    dropTarget: getTreeItem(props.tree, dropTargetId),
                    monitor: monitor,
                });
            }
            : undefined, canDrag: canDragCallback
            ? function (id) { return canDragCallback(getTreeItem(props.tree, id)); }
            : undefined, onToggle: function (id) { return handleToggle(id, props.onChangeOpen); } });
    return (React.createElement(TreeContext.Provider, { value: value }, props.children));
};

var DragControlContext = createContext({});
var initialState$1 = {
    isLock: false,
};
var DragControlProvider = function (props) {
    var _a = useState(initialState$1.isLock), isLock = _a[0], setIsLock = _a[1];
    return (React.createElement(DragControlContext.Provider, { value: {
            isLock: isLock,
            lock: function () { return setIsLock(true); },
            unlock: function () { return setIsLock(false); },
        } }, props.children));
};

var PlaceholderContext = createContext({});
var initialState = {
    dropTargetId: undefined,
    index: undefined,
};
var PlaceholderProvider = function (props) {
    var _a = useState(initialState.dropTargetId), dropTargetId = _a[0], setDropTargetId = _a[1];
    var _b = useState(initialState.index), index = _b[0], setIndex = _b[1];
    var showPlaceholder = function (dropTargetId, index) {
        setDropTargetId(dropTargetId);
        setIndex(index);
    };
    var hidePlaceholder = function () {
        setDropTargetId(initialState.dropTargetId);
        setIndex(initialState.index);
    };
    return (React.createElement(PlaceholderContext.Provider, { value: {
            dropTargetId: dropTargetId,
            index: index,
            showPlaceholder: showPlaceholder,
            hidePlaceholder: hidePlaceholder,
        } }, props.children));
};

var Providers = function (props) { return (React.createElement(TreeProvider, __assign({}, props),
    React.createElement(DragControlProvider, null,
        React.createElement(PlaceholderProvider, null, props.children)))); };

/**
 * This is a hook to allow text selection by mouse in the text input area in a node.
 * Temporarily disables node dragging while the pointer is over the text input area.
 */
var useDragControl = function (ref) {
    var dragControlContext = useContext(DragControlContext);
    useEffect(function () {
        if (!ref.current)
            return;
        var node = ref.current;
        var lock = function (e) {
            var target = e.target;
            if (target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement) {
                dragControlContext.lock();
            }
        };
        var unlock = function (e) {
            var target = e.target;
            if (target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement) {
                dragControlContext.unlock();
            }
        };
        var handleMouseOver = function (e) { return lock(e); };
        var handleMouseOut = function (e) { return unlock(e); };
        var handleFocusIn = function (e) { return lock(e); };
        var handleFocusOut = function (e) { return unlock(e); };
        // In Firefox or Safari,
        // the focusout event is not fired when the focused element is unmounted.
        // Therefore, it detects the unmounting of a child element
        // and unlocks tree if the focus is on the body element after unmounting.
        var observer = new MutationObserver(function () {
            if (document.activeElement === document.body) {
                dragControlContext.unlock();
            }
        });
        observer.observe(node, {
            subtree: true,
            childList: true,
        });
        node.addEventListener("mouseover", handleMouseOver);
        node.addEventListener("mouseout", handleMouseOut);
        node.addEventListener("focusin", handleFocusIn);
        node.addEventListener("focusout", handleFocusOut);
        return function () {
            observer.disconnect();
            node.removeEventListener("mouseover", handleMouseOver);
            node.removeEventListener("mouseout", handleMouseOut);
            node.removeEventListener("focusin", handleFocusIn);
            node.removeEventListener("focusout", handleFocusOut);
        };
    }, [ref, dragControlContext]);
    useEffect(function () {
        var _a;
        (_a = ref.current) === null || _a === void 0 ? void 0 : _a.setAttribute("draggable", dragControlContext.isLock ? "false" : "true");
    }, [ref, dragControlContext.isLock]);
};

var ItemTypes = {
    TREE_ITEM: Symbol(),
};

var dragSourceElement = null;
var register = function (e) {
    var target = e.target;
    if (target instanceof HTMLElement) {
        var source = target.closest('[role="listitem"]');
        if (e.currentTarget === source) {
            dragSourceElement = source;
        }
    }
};
var handleDragStart = function (e) { return register(e); };
var handleTouchStart = function (e) { return register(e); };
var useDragNode = function (item, ref) {
    var treeContext = useTreeContext();
    var placeholderContext = useContext(PlaceholderContext);
    useEffect(function () {
        var node = ref.current;
        node === null || node === void 0 ? void 0 : node.addEventListener("dragstart", handleDragStart);
        node === null || node === void 0 ? void 0 : node.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        });
        return function () {
            node === null || node === void 0 ? void 0 : node.removeEventListener("dragstart", handleDragStart);
            node === null || node === void 0 ? void 0 : node.removeEventListener("touchstart", handleTouchStart);
        };
    }, [ref]);
    var _a = useDrag({
        type: ItemTypes.TREE_ITEM,
        item: function (monitor) {
            var dragItem = __assign({ ref: ref }, item);
            if (treeContext.onDragStart) {
                treeContext.onDragStart(dragItem, monitor);
            }
            return dragItem;
        },
        end: function (item, monitor) {
            var dragItem = item;
            // If the user drops outside the container, then we can 
            // still count as a drop based on the last placeholder index.
            // Taken from: https://github.com/minop1205/react-dnd-treeview/pull/99
            //
            // NOTE: This also catches the drags canceled due to the 'Escape' key,
            // there is no way I found to determine whether a drag was canceled/ended 
            // due to 'Escape' key or being dragged outside container 
            // (even with work arounds like seperate listeners and so on).
            var cancelOnDropOutside = treeContext.cancelOnDropOutside;
            var dropTargetId = placeholderContext.dropTargetId, index = placeholderContext.index;
            if (cancelOnDropOutside || monitor.didDrop())
                return;
            if ((dragItem === null || dragItem === void 0 ? void 0 : dragItem.id) !== undefined &&
                dropTargetId !== undefined &&
                index !== undefined) {
                treeContext.onDrop(dragItem, dropTargetId, index);
            }
            if (treeContext.onDragEnd) {
                treeContext.onDragEnd(dragItem, monitor);
            }
        },
        canDrag: function () {
            var canDrag = treeContext.canDrag;
            if (dragSourceElement !== ref.current) {
                return false;
            }
            if (canDrag) {
                return canDrag(item.id);
            }
            return true;
        },
        collect: function (monitor) { return ({
            isDragging: monitor.isDragging(),
        }); },
    }), isDragging = _a[0].isDragging, drag = _a[1], preview = _a[2];
    return [isDragging, drag, preview];
};

var useDragOver = function (id, isOpen, dragOverHandler) {
    var stack = useRef(0);
    var timer = useRef(0);
    var onDragEnter = function () {
        stack.current += 1;
        if (stack.current === 1 && !isOpen) {
            timer.current = window.setTimeout(function () { return dragOverHandler(id); }, 500);
        }
    };
    var onDragLeave = function () {
        stack.current -= 1;
        if (stack.current === 0) {
            window.clearTimeout(timer.current);
        }
    };
    var onDrop = function () {
        if (timer.current > 0) {
            window.clearTimeout(timer.current);
        }
        stack.current = 0;
        timer.current = 0;
    };
    return {
        onDragEnter: onDragEnter,
        onDragLeave: onDragLeave,
        onDrop: onDrop,
    };
};

var useDropRoot = function (ref) {
    var treeContext = useTreeContext();
    var placeholderContext = useContext(PlaceholderContext);
    var _a = useDrop({
        accept: __spreadArray([ItemTypes.TREE_ITEM], treeContext.extraAcceptTypes, true),
        drop: function (dragItem, monitor) {
            var rootId = treeContext.rootId, onDrop = treeContext.onDrop;
            var dropTargetId = placeholderContext.dropTargetId, index = placeholderContext.index;
            if (monitor.isOver({ shallow: true }) &&
                dropTargetId !== undefined &&
                index !== undefined) {
                // If the drag source is outside the react-dnd,
                // a different object is passed than the NodeModel.
                onDrop(isNodeModel(dragItem) ? dragItem : null, rootId, index);
            }
            placeholderContext.hidePlaceholder();
        },
        canDrop: function (dragItem, monitor) {
            var rootId = treeContext.rootId;
            if (monitor.isOver({ shallow: true })) {
                if (dragItem === undefined) {
                    return false;
                }
                return isDroppable(isNodeModel(dragItem) ? dragItem.id : undefined, rootId, treeContext);
            }
            return false;
        },
        hover: function (dragItem, monitor) {
            if (monitor.isOver({ shallow: true })) {
                var rootId = treeContext.rootId;
                var dropTargetId = placeholderContext.dropTargetId, index = placeholderContext.index, showPlaceholder = placeholderContext.showPlaceholder, hidePlaceholder = placeholderContext.hidePlaceholder;
                var dropTarget = getDropTarget(null, ref.current, monitor, treeContext);
                if (dropTarget === null ||
                    !isDroppable(isNodeModel(dragItem) ? dragItem.id : undefined, rootId, treeContext)) {
                    hidePlaceholder();
                    return;
                }
                if (dropTarget.id !== dropTargetId || dropTarget.index !== index) {
                    showPlaceholder(dropTarget.id, dropTarget.index);
                }
            }
        },
        collect: function (monitor) {
            var dragSource = monitor.getItem();
            return {
                isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
                dragSource: dragSource,
            };
        },
    }), _b = _a[0], isOver = _b.isOver, dragSource = _b.dragSource, drop = _a[1];
    return [isOver, dragSource, drop];
};

var useDropNode = function (item, ref) {
    var treeContext = useTreeContext();
    var placeholderContext = useContext(PlaceholderContext);
    var _a = useDrop({
        accept: __spreadArray([ItemTypes.TREE_ITEM], treeContext.extraAcceptTypes, true),
        drop: function (dragItem, monitor) {
            var dropTargetId = placeholderContext.dropTargetId, index = placeholderContext.index;
            if (monitor.isOver({ shallow: true }) &&
                dropTargetId !== undefined &&
                index !== undefined) {
                // If the drag source is outside the react-dnd,
                // a different object is passed than the NodeModel.
                treeContext.onDrop(isNodeModel(dragItem) ? dragItem : null, dropTargetId, index);
            }
            placeholderContext.hidePlaceholder();
        },
        canDrop: function (dragItem, monitor) {
            if (monitor.isOver({ shallow: true })) {
                var dropTarget = getDropTarget(item, ref.current, monitor, treeContext);
                if (dropTarget === null) {
                    return false;
                }
                return isDroppable(isNodeModel(dragItem) ? dragItem.id : undefined, dropTarget.id, treeContext);
            }
            return false;
        },
        hover: function (dragItem, monitor) {
            if (monitor.isOver({ shallow: true })) {
                var dropTargetId = placeholderContext.dropTargetId, index = placeholderContext.index, showPlaceholder = placeholderContext.showPlaceholder, hidePlaceholder = placeholderContext.hidePlaceholder;
                var dropTarget = getDropTarget(item, ref.current, monitor, treeContext);
                if (dropTarget === null ||
                    !isDroppable(isNodeModel(dragItem) ? dragItem.id : undefined, dropTarget.id, treeContext)) {
                    hidePlaceholder();
                    return;
                }
                if (dropTarget.id !== dropTargetId || dropTarget.index !== index) {
                    showPlaceholder(dropTarget.id, dropTarget.index);
                }
            }
        },
        collect: function (monitor) {
            var dragSource = monitor.getItem();
            return {
                isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
                dragSource: dragSource,
            };
        },
    }), _b = _a[0], isOver = _b.isOver, dragSource = _b.dragSource, drop = _a[1];
    return [isOver, dragSource, drop];
};

var useOpenIdsHelper = function (tree, initialOpen) {
    var initialOpenIds = useMemo(function () {
        if (initialOpen === true) {
            return initialOpenIds = tree
                .filter(function (node) { return node.droppable; })
                .map(function (node) { return node.id; });
        }
        else if (Array.isArray(initialOpen)) {
            return initialOpen;
        }
        return [];
    }, [initialOpen]);
    var _a = useState(initialOpenIds), openIds = _a[0], setOpenIds = _a[1];
    useEffect(function () { return setOpenIds(initialOpenIds); }, [initialOpen]);
    var handleToggle = function (targetId, callback) {
        var newOpenIds = openIds.includes(targetId)
            ? openIds.filter(function (id) { return id !== targetId; })
            : __spreadArray(__spreadArray([], openIds, true), [targetId], false);
        setOpenIds(newOpenIds);
        if (callback) {
            callback(newOpenIds);
        }
    };
    var handleCloseAll = function (callback) {
        setOpenIds([]);
        if (callback) {
            callback([]);
        }
    };
    var handleOpenAll = function (callback) {
        var newOpenIds = tree
            .filter(function (node) { return node.droppable; })
            .map(function (node) { return node.id; });
        setOpenIds(newOpenIds);
        if (callback) {
            callback(newOpenIds);
        }
    };
    var handleOpen = function (targetIds, callback) {
        var newOpenIds = __spreadArray(__spreadArray([], openIds, true), tree
            .filter(function (node) {
            return node.droppable &&
                (Array.isArray(targetIds)
                    ? targetIds.includes(node.id)
                    : node.id === targetIds);
        })
            .map(function (node) { return node.id; }), true).filter(function (value, index, self) { return self.indexOf(value) === index; });
        setOpenIds(newOpenIds);
        if (callback) {
            callback(newOpenIds);
        }
    };
    var handleClose = function (targetIds, callback) {
        var newOpenIds = openIds.filter(function (id) {
            return Array.isArray(targetIds) ? !targetIds.includes(id) : id !== targetIds;
        });
        setOpenIds(newOpenIds);
        if (callback) {
            callback(newOpenIds);
        }
    };
    return [
        openIds,
        { handleToggle: handleToggle, handleCloseAll: handleCloseAll, handleOpenAll: handleOpenAll, handleOpen: handleOpen, handleClose: handleClose },
    ];
};

var useTreeDragLayer = function () {
    return useDragLayer(function (monitor) {
        var itemType = monitor.getItemType();
        return {
            item: monitor.getItem(),
            clientOffset: monitor.getClientOffset(),
            isDragging: monitor.isDragging() && itemType === ItemTypes.TREE_ITEM,
        };
    });
};

var useTreeContext = function () {
    var treeContext = useContext(TreeContext);
    if (!treeContext) {
        throw new Error("useTreeContext must be used under TreeProvider");
    }
    return treeContext;
};

var useContainerClassName = function (parentId, isOver) {
    var _a = useTreeContext(), rootId = _a.rootId, rootProps = _a.rootProps, classes = _a.classes;
    var className = (classes === null || classes === void 0 ? void 0 : classes.container) || "";
    if (isOver && (classes === null || classes === void 0 ? void 0 : classes.dropTarget)) {
        className = "".concat(className, " ").concat(classes.dropTarget);
    }
    if (parentId === rootId && (classes === null || classes === void 0 ? void 0 : classes.root)) {
        className = "".concat(className, " ").concat(classes.root);
    }
    if (parentId === rootId && (rootProps === null || rootProps === void 0 ? void 0 : rootProps.className)) {
        className = "".concat(className, " ").concat(rootProps.className);
    }
    className = className.trim();
    return className;
};

var Node = function (props) {
    var treeContext = useTreeContext();
    var placeholderContext = useContext(PlaceholderContext);
    var ref = useRef(null);
    var item = treeContext.tree.find(function (node) { return node.id === props.id; });
    var openIds = treeContext.openIds, classes = treeContext.classes;
    var open = openIds.includes(props.id);
    var _a = useDragNode(item, ref), isDragging = _a[0], drag = _a[1], preview = _a[2];
    var _b = useDropNode(item, ref), isOver = _b[0], dragSource = _b[1], drop = _b[2];
    drag(ref);
    if (isDroppable(dragSource === null || dragSource === void 0 ? void 0 : dragSource.id, props.id, treeContext)) {
        drop(ref);
    }
    var hasChild = !!treeContext.tree.find(function (node) { return node.parent === props.id; });
    useEffect(function () {
        if (treeContext.dragPreviewRender) {
            preview(getEmptyImage(), { captureDraggingState: true });
        }
    }, [preview, treeContext.dragPreviewRender]);
    useDragControl(ref);
    var handleToggle = function () { return treeContext.onToggle(item.id); };
    var className = (classes === null || classes === void 0 ? void 0 : classes.listItem) || "";
    if (isOver && (classes === null || classes === void 0 ? void 0 : classes.dropTarget)) {
        className = "".concat(className, " ").concat(classes.dropTarget);
    }
    if (isDragging && (classes === null || classes === void 0 ? void 0 : classes.draggingSource)) {
        className = "".concat(className, " ").concat(classes.draggingSource);
    }
    var draggable = treeContext.canDrag ? treeContext.canDrag(props.id) : true;
    var isDropTarget = placeholderContext.dropTargetId === props.id;
    var params = {
        depth: props.depth,
        isOpen: open,
        isDragging: isDragging,
        isDropTarget: isDropTarget,
        draggable: draggable,
        hasChild: hasChild,
        containerRef: ref,
        onToggle: handleToggle,
    };
    var children = (React.createElement(React.Fragment, null,
        treeContext.render(item, params),
        open && hasChild && (React.createElement(Container, { parentId: props.id, depth: props.depth + 1 }))));
    // ElementType (eg 'li', 'div', etc)
    if (typeof treeContext.listItemComponent === 'string') {
        var Component = treeContext.listItemComponent;
        return (React.createElement(Component, { ref: ref, className: className, role: "listitem" }, children));
    }
    // React.ComponentType
    else {
        return treeContext.listItemComponent({
            item: item,
            params: params,
            forwardedRef: ref,
            role: 'listitem',
            children: children
        });
    }
};

var Placeholder = function (props) {
    var _a = useTreeContext(), placeholderRender = _a.placeholderRender, Component = _a.placeholderComponent, classes = _a.classes;
    var placeholderContext = useContext(PlaceholderContext);
    var manager = useDragDropManager();
    var monitor = manager.getMonitor();
    var dragSource = monitor.getItem();
    if (!placeholderRender || !dragSource) {
        return null;
    }
    var visible = props.dropTargetId === placeholderContext.dropTargetId &&
        (props.index === placeholderContext.index ||
            (props.index === undefined &&
                props.listCount === placeholderContext.index));
    if (!visible) {
        return null;
    }
    return (React.createElement(Component, { className: (classes === null || classes === void 0 ? void 0 : classes.placeholder) || "" }, placeholderRender(dragSource, { depth: props.depth })));
};

var Container = function (props) {
    var treeContext = useTreeContext();
    var ref = useRef(null);
    var nodes = treeContext.tree.filter(function (l) { return l.parent === props.parentId; });
    var view = nodes;
    var sortCallback = typeof treeContext.sort === "function" ? treeContext.sort : compareItems;
    if (treeContext.insertDroppableFirst) {
        var droppableNodes = nodes.filter(function (n) { return n.droppable; });
        var nonDroppableNodes = nodes.filter(function (n) { return !n.droppable; });
        if (treeContext.sort === false) {
            view = __spreadArray(__spreadArray([], droppableNodes, true), nonDroppableNodes, true);
        }
        else {
            droppableNodes = droppableNodes.sort(sortCallback);
            nonDroppableNodes = nonDroppableNodes.sort(sortCallback);
            view = __spreadArray(__spreadArray([], droppableNodes, true), nonDroppableNodes, true);
        }
    }
    else {
        if (treeContext.sort !== false) {
            view = nodes.sort(sortCallback);
        }
    }
    var _a = useDropRoot(ref), isOver = _a[0], dragSource = _a[1], drop = _a[2];
    if (props.parentId === treeContext.rootId &&
        isDroppable(dragSource === null || dragSource === void 0 ? void 0 : dragSource.id, treeContext.rootId, treeContext)) {
        drop(ref);
    }
    var className = useContainerClassName(props.parentId, isOver);
    var rootProps = treeContext.rootProps || {};
    var Component = treeContext.listComponent;
    return (React.createElement(Component, __assign({ ref: ref, role: "list" }, rootProps, { className: className }),
        view.map(function (node, index) { return (React.createElement(React.Fragment, { key: node.id },
            React.createElement(Placeholder, { depth: props.depth, listCount: view.length, dropTargetId: props.parentId, index: index }),
            React.createElement(Node, { id: node.id, depth: props.depth }))); }),
        React.createElement(Placeholder, { depth: props.depth, listCount: view.length, dropTargetId: props.parentId })));
};

var rootStyle = {
    height: "100%",
    left: 0,
    pointerEvents: "none",
    position: "fixed",
    top: 0,
    width: "100%",
    zIndex: 100,
};
var getItemStyles = function (monitorProps) {
    var offset = monitorProps.clientOffset;
    if (!offset) {
        return {};
    }
    var x = offset.x, y = offset.y;
    var transform = "translate(".concat(x, "px, ").concat(y, "px)");
    return {
        pointerEvents: "none",
        transform: transform,
    };
};
var DragLayer = function () {
    var context = useTreeContext();
    var monitorProps = useTreeDragLayer();
    var isDragging = monitorProps.isDragging, clientOffset = monitorProps.clientOffset;
    if (!isDragging || !clientOffset) {
        return null;
    }
    return (React.createElement("div", { style: rootStyle },
        React.createElement("div", { style: getItemStyles(monitorProps) }, context.dragPreviewRender && context.dragPreviewRender(monitorProps))));
};

function TreeInner(props, ref) {
    return (React.createElement(Providers, __assign({}, props, { treeRef: ref }),
        props.dragPreviewRender && React.createElement(DragLayer, null),
        React.createElement(Container, { parentId: props.rootId, depth: 0 })));
}
var Tree = forwardRef(TreeInner);

export { Container, DragLayer, ItemTypes, Node, Tree, compareItems, getBackendOptions, getDescendants, getDestIndex, getDropTarget, getModifiedIndex, getTreeItem, isAncestor, isDroppable, isNodeModel, mutateTree, mutateTreeWithIndex, useContainerClassName, useDragControl, useDragNode, useDragOver, useDropNode, useDropRoot, useOpenIdsHelper, useTreeContext, useTreeDragLayer };
//# sourceMappingURL=index.js.map
