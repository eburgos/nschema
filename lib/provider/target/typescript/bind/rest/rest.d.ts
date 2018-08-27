import { NSchemaInterface, Target } from "../../../../../model";
import { TypeScript } from "../../typescript";
export interface TypeScriptRestTarget extends Target {
    $typeScriptRest?: {
        requestModule: string;
    };
}
export declare function checkAndFixTarget(target: Target, namespaceMapping: {
    [name: string]: string;
}): TypeScriptRestTarget;
export declare class NRest {
    language: string;
    name: string;
    type: string;
    typescript: TypeScript | undefined;
    init(nschema: NSchemaInterface): Promise<any[]>;
}
declare const rest: NRest;
export default rest;
