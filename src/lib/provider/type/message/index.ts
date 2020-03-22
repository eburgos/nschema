/**
 * @module nschema/provider/type/message
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import {
  AppendableProperties,
  HasFilenameMixin,
  HasTargetMixin,
  Identifier,
  NSchemaInterface,
  NSchemaMessageArgument,
  NSchemaPlugin,
  NSchemaTask
} from "../../../model";
import { deepClone } from "../../../utils";

export interface AnonymousMessage {
  data?: NSchemaMessageArgument[];
  extends?: Identifier;
}

export interface MessageTask
  extends AnonymousMessage,
    HasFilenameMixin,
    HasTargetMixin,
    AppendableProperties {
  description?: string;

  name: string;
  namespace?: string;
  type: "message";
}

function getMessage(
  namespace: string,
  name: string,
  nschema: NSchemaInterface
) {
  const filtered = nschema.context.messages.filter((message) => {
    return (
      (message.namespace || "") === (namespace || "") &&
      (message.name || "") === (name || "")
    );
  });
  if (filtered.length) {
    return filtered[0];
  }
  return undefined;
}

export function processMessage(
  newConfig: AnonymousMessage,
  nschema: NSchemaInterface,
  parentNamespace: string
) {
  let unnamedCount = 0;
  if (!newConfig.data) {
    newConfig.data = [];
  }
  if (newConfig.extends) {
    const eMsg = getMessage(
      typeof newConfig.extends.namespace !== "undefined"
        ? newConfig.extends.namespace
        : parentNamespace,
      newConfig.extends.name,
      nschema
    );
    if (eMsg) {
      Array.prototype.splice.apply(newConfig.data, [
        0,
        0,
        ...(eMsg.data || [])
      ]);
    } else {
      throw new Error(
        `Could not find a message to extend: namespace='${newConfig.extends.namespace}', name='${newConfig.extends.name}'`
      );
    }
    newConfig.extends = undefined;
  }

  newConfig.data.forEach((par) => {
    if (!par.name) {
      unnamedCount += 1;
      par.name = `unnamedParameter${unnamedCount}`;
    }
  });
}

async function execute(parentConfig: NSchemaTask, nschema: NSchemaInterface) {
  if (parentConfig.type !== "message") {
    throw new Error("Invalid message task");
  }
  nschema.registerMessage(parentConfig);
  const newConfig = deepClone(parentConfig);
  processMessage(newConfig, nschema, newConfig.namespace || "");
  nschema.registerMessage(newConfig);
  return Promise.resolve(false);
}
const message: NSchemaPlugin = {
  description: "Service messages",
  execute,
  name: "message",
  async init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  },
  type: "type"
};

export default message;
