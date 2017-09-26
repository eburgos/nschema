/// <reference types="ejs" />
import { Definition, NineSchemaConfig, NSchemaInterface, Target } from '../../../model';
import { TemplateFunction } from 'ejs';
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
export declare type RestClientStrategy = 'Angular2';
export interface TypeScriptTarget extends Target {
    restClientStrategy?: RestClientStrategy;
}
export declare class TypeScript {
    init(nschema: NSchemaInterface): any;
    generate(nschema: NSchemaInterface, _nsconfig: NineSchemaConfig, template: TemplateFunction, target: Target): Promise<void | {
        generated: any;
        config: TypeScriptConfig;
    }>;
    typeName($nschemaType: any, $nschema: NSchemaInterface, namespace: string, name: string, context: any): string;
}
declare let typescript: TypeScript;
export default typescript;
