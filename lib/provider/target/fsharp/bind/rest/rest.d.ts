import { NSchemaInterface } from "../../../../../model";
import { FSharp } from "../../fsharp";
export declare class NRest {
    fsharp: FSharp | undefined;
    init(nschema: NSchemaInterface): Promise<null>;
}
declare const rest: NRest;
export default rest;
