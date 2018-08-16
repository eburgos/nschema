/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import { TemplateFunction } from "ejs";
import * as path from "path";
import {
  NineSchemaConfig,
  NSchemaInterface,
  Target
} from "../../../../../model";
import { FSharp } from "../../fsharp";

function baseGenerate(
  config: NineSchemaConfig,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction,
  fsharp: FSharp
) {
  return fsharp.generate(nschema, config, template, target);
}

const templates: { [name: string]: TemplateFunction } = {};

export class NObject {
  public fsharp: FSharp;
  public init(nschema: NSchemaInterface) {
    const fsharp = this.fsharp;
    templates.object = nschema.buildTemplate(
      path.resolve(__dirname, "class.ejs")
    );
    nschema.registerTarget({
      description: "Generate fsharp models for your nineschema definitions",
      language: "fsharp",
      name: "fsharp/object",
      type: "object",
      generate(
        config: NineSchemaConfig,
        thisNschema: NSchemaInterface,
        target: Target
      ) {
        return baseGenerate(
          config,
          thisNschema,
          target,
          templates.object,
          fsharp
        );
      }
    });
    return Promise.resolve(true);
  }
}
const obj = new NObject();

export default obj;
