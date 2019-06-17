import { Definition, NSchemaInterface, NSchemaMessage, NSchemaType, Target, TemplateFunction } from "../../../model";
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
    typeName: typeof typeName;
    init(nschema: NSchemaInterface): Promise<any>;
    generate(nschema: NSchemaInterface, $nsconfig: any, template: TemplateFunction, target: Target, providedContext: any | undefined): Promise<{
        config: Definition;
        context: TypeScriptContext;
        generated: string;
    }>;
}
declare function typeName($nschemaType: NSchemaType, _nschema?: NSchemaInterface, namespace?: string, _name?: string, context?: any, addFlowComment?: boolean): string;
declare const typescript: TypeScript;
export declare function messageType(nschema: NSchemaInterface, $context: TypeScriptContext, addFlowComment: boolean, message: NSchemaMessage): string;
export declare function buildTypeScriptContext(): TypeScriptContext;
export default typescript;
