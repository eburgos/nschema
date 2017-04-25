/// <reference types="ejs" />
import { Definition, NineSchemaConfig, NSchemaInterface, Target } from "../../../model";
import { TemplateFunction } from "ejs";
export interface FSharpConfig extends Definition {
    $fsharp: FSharp;
}
export declare class FSharp {
    init(nschema: NSchemaInterface): any;
    generate(nschema: NSchemaInterface, nsconfig: NineSchemaConfig, template: TemplateFunction, target: Target): Promise<any>;
    typeName($nschemaType: any, $nschema: NSchemaInterface, namespace: string): string;
}
declare let fsharp: FSharp;
export default fsharp;
