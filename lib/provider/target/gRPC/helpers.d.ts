import { gRPCContext } from "./gRPC";
export declare function computeImportMatrix(localNamespace: string, namespaceMapping: {
    [name: string]: string;
}, $context: gRPCContext): string;
export declare function renderPropertyAccessor(property: string): string;
