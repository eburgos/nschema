/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import * as path from "path";
import {
  Definition,
  NSchemaInterface,
  Target,
  TargetBind,
  TemplateFunction
} from "../../../../../model";
import { FSharp } from "../../fsharp";

function baseGenerate(
  config: Definition,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction,
  fsharp: FSharp
) {
  return fsharp.generate(nschema, config, template, target);
}

const templates: { [name: string]: TemplateFunction } = {};

export class NRest {
  public fsharp: FSharp | undefined;
  public init(nschema: NSchemaInterface) {
    if (!this.fsharp) {
      throw new Error("Argument exception");
    }
    const fsharp = this.fsharp;

    templates.consumer = nschema.buildTemplate(
      path.resolve(__dirname, "serviceConsumer.ejs")
    );
    templates.producer = nschema.buildTemplate(
      path.resolve(__dirname, "serviceProducer.ejs")
    );
    ["consumer", "producer"].forEach(serviceType => {
      nschema.registerTarget({
        bind: "rest",
        description: "Rest services in fsharp",
        language: "fsharp",
        name: "fsharp/rest",
        serviceType,
        type: "service",
        generate(
          config: Definition,
          thisNschema: NSchemaInterface,
          target: Target
        ) {
          return baseGenerate(
            config,
            thisNschema,
            target,
            templates[serviceType],
            fsharp
          );
        }
      });
    });
    return Promise.resolve(null);
  }
}

const rest = new NRest();

export default rest;
