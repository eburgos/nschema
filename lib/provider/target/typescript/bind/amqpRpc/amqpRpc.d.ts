import { NSchemaInterface } from "../../../../../model";
import { TypeScript } from "../../typescript";
export declare class AmqpRpc {
    typescript: TypeScript | undefined;
    init(nschema: NSchemaInterface): Promise<null>;
}
declare const amqprpc: AmqpRpc;
export default amqprpc;
