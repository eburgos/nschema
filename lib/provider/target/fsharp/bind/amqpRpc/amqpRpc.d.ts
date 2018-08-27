import { NSchemaInterface } from "../../../../../model";
import { FSharp } from "../../fsharp";
export declare class AmqpRpc {
    fsharp: FSharp | undefined;
    init(nschema: NSchemaInterface): Promise<null>;
}
declare const amqprpc: AmqpRpc;
export default amqprpc;
