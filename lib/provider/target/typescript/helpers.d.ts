import { TypeScriptContext } from "./typescript";
export declare function computeImportMatrix(localNamespace: string, namespaceMapping: {
    [name: string]: string;
}, $context: TypeScriptContext): string;
export declare function renderPropertyAccessor(property: string): string;
