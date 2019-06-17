import { Definition, NineSchemaConfig, NSchemaInterface, Target, TemplateFunction } from "../../../model";
export interface FSharpConfig extends Definition {
    $fsharp: FSharp;
}
export declare class FSharp {
    init(nschema: NSchemaInterface): Promise<any>;
    generate(nschema: NSchemaInterface, nsconfig: NineSchemaConfig, template: TemplateFunction, target: Target): Promise<any>;
    typeName($nschemaType: any, $nschema: NSchemaInterface, namespace: string): string;
}
declare const fsharp: FSharp;
export default fsharp;
