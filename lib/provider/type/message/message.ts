/**
 * @module nschema/provider/type/message
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import {
  Definition,
  NSchemaInterface,
  NSchemaMessage,
  NSchemaPlugin
} from "../../../model";

function getMessage(ns: string, name: string, nschema: NSchemaInterface) {
  const filtered = nschema.context().messages.filter(m => {
    return (
      (m.namespace || "") === (ns || "") && (m.name || "") === (name || "")
    );
  });
  if (filtered.length) {
    return filtered[0];
  }
  return null;
}

export function processMessage(
  newConfig: NSchemaMessage,
  nschema: NSchemaInterface
) {
  let unnamedCount = 0;
  if (!newConfig.data) {
    newConfig.data = [];
  }
  if (newConfig.$extends) {
    const eMsg = getMessage(
      newConfig.$extends.namespace,
      newConfig.$extends.name,
      nschema
    );
    if (eMsg) {
      Array.prototype.splice.apply(
        newConfig.data,
        [0, 0].concat(eMsg.data || [])
      );
    } else {
      throw new Error(
        `Could not find a message to extend: namespace='${
          newConfig.$extends.namespace
        }', name='${newConfig.$extends.name}'`
      );
    }
    newConfig.$extends = undefined;
  }

  newConfig.data.forEach(par => {
    if (!par.name) {
      unnamedCount += 1;
      par.name = `unnamedParameter${unnamedCount}`;
    }
  });
}

function execute(parentConfig: Definition, nschema: NSchemaInterface) {
  nschema.registerObject(parentConfig);
  const newConfig = nschema.objClone(parentConfig);
  processMessage(newConfig, nschema);
  nschema.registerMessage(newConfig);
  return Promise.resolve(false);
}
const message: NSchemaPlugin = {
  description: "Service messages",
  execute,
  name: "message",
  init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  },
  type: "type"
};

export default message;
