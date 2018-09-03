/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import { TemplateFunction } from "ejs";
import * as path from "path";
import { Definition, NSchemaInterface, Target } from "../../../../../model";
import { TypeScript } from "../../typescript";

function baseGenerate(
  config: Definition,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction,
  typescript: TypeScript,
  context: object
) {
  return typescript.generate(nschema, config, template, target, context);
}

const templates: { [name: string]: TemplateFunction } = {};

export class AmqpRpc {
  public typescript: TypeScript | undefined;
  public init(nschema: NSchemaInterface) {
    if (!this.typescript) {
      throw new Error("Argument exception");
    }
    const typescript = this.typescript;
    templates.consumer = nschema.buildTemplate(
      path.resolve(__dirname, "serviceConsumer.ejs")
    );
    templates.producer = nschema.buildTemplate(
      path.resolve(__dirname, "serviceProducer.ejs")
    );
    ["consumer", "producer"].forEach(serviceType => {
      nschema.registerTarget({
        bind: "amqpRpc",
        description:
          "Generates a service layer where messages get sent over an AMQP protocol",
        language: "typescript",
        name: "typescript/amqpRpc",
        serviceType,
        type: "service",
        generate(
          config: Definition,
          thisNschema: NSchemaInterface,
          target: Target,
          context: object
        ) {
          return baseGenerate(
            config,
            thisNschema,
            target,
            templates[serviceType],
            typescript,
            context
          );
        }
      });
    });
    return Promise.resolve(null);
  }
}

const amqprpc = new AmqpRpc();

export default amqprpc;
