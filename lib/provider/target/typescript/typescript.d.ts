import { TemplateFunction } from "ejs";
import { Definition, NineSchemaConfig, NSchemaInterface, Target } from "../../../model";
export interface TypeScriptContext {
    imports: {
        [name: string]: {
            [name: string]: boolean;
        };
    };
}
export interface TypeScriptConfig extends Definition {
    $typescript: TypeScript;
    $context: TypeScriptContext;
    $skipWrite: boolean;
}
export declare type RestClientStrategy = "Angular2";
export interface TypeScriptTarget extends Target {
    restClientStrategy?: RestClientStrategy;
}
export declare class TypeScript {
    init(nschema: NSchemaInterface): Promise<any>;
    generate(nschema: NSchemaInterface, $nsconfig: NineSchemaConfig, template: TemplateFunction, target: Target): Promise<void | {
        config: TypeScriptConfig;
        generated: string;
    }>;
    typeName($nschemaType: any, $nschema: NSchemaInterface, namespace: string, name: string, context: any, addFlowComment?: boolean): string;
}
declare const typescript: TypeScript;
export default typescript;
