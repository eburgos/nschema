import { TemplateFunction } from "ejs";
import { Definition, NineSchemaConfig, NSchemaInterface, NSchemaMessage, NSchemaType, Target } from "../../../model";
export interface TypeScriptContext {
    hasTypeScript: true;
    id: number;
    imports: {
        [name: string]: {
            [name: string]: string | boolean;
        };
    };
    typescript: TypeScript;
    skipWrite?: boolean;
}
export declare enum RestClientStrategy {
    Default = "Default",
    Angular2 = "Angular2"
}
export declare class TypeScript {
    init(nschema: NSchemaInterface): Promise<any>;
    generate(nschema: NSchemaInterface, $nsconfig: NineSchemaConfig, template: TemplateFunction, target: Target, providedContext: any | undefined): Promise<{
        config: Definition;
        context: TypeScriptContext;
        generated: string;
    }>;
    typeName($nschemaType: string | NSchemaType | undefined, $nschema: NSchemaInterface, namespace: string, _name: string, context: any, addFlowComment?: boolean): string;
}
declare const typescript: TypeScript;
export declare function messageType(nschema: NSchemaInterface, $context: TypeScriptContext, addFlowComment: boolean, message: NSchemaMessage): string;
export declare function buildTypeScriptContext(): TypeScriptContext;
export default typescript;
