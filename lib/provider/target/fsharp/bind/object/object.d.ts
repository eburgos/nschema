import { NSchemaInterface } from "../../../../../model";
import { FSharp } from "../../fsharp";
export declare class NObject {
    fsharp: FSharp | undefined;
    init(nschema: NSchemaInterface): Promise<boolean>;
}
declare const obj: NObject;
export default obj;
