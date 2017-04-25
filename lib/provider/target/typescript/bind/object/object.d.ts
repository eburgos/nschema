import { NSchemaInterface } from "../../../../../model";
import { TypeScript } from "../../typescript";
export declare class NObject {
    typescript: TypeScript;
    init(nschema: NSchemaInterface): Promise<boolean>;
}
declare let obj: NObject;
export default obj;
