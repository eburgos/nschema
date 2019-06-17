import { NSchemaInterface, Target, NSchemaMessageArgument, NSchemaType } from "../../../../../model";
import { RestClientStrategy, TypeScript } from "../../typescript";
export interface TypeScriptRestTarget extends Target {
    $restClientStrategy?: RestClientStrategy;
    $typeScriptRest?: {
        requestModule: string;
    };
}
export interface TypeScriptServerlessRest extends TypeScriptRestTarget {
    $serverless: {
        implementation: string;
        yamlPath: string;
    };
}
export interface RestMessageArgument extends NSchemaMessageArgument {
    headerName?: string;
    paramType?: "header" | "query";
    realType?: NSchemaType;
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
