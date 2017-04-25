import { NSchemaInterface } from "../../../../../model";
import { FSharp } from "../../fsharp";
export declare class NObject {
    fsharp: FSharp;
    init(nschema: NSchemaInterface): Promise<boolean>;
}
declare let obj: NObject;
export default obj;
