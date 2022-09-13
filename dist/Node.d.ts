import { PropsWithChildren, ReactElement } from "react";
import { NodeModel } from "./types";
declare type Props = PropsWithChildren<{
    id: NodeModel["id"];
    depth: number;
}>;
export declare const Node: <T>(props: Props) => ReactElement | null;
export {};
