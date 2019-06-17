/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import * as path from "path";
import {
  NineSchemaConfig,
  NSchemaInterface,
  Target,
  TemplateFunction
} from "../../../../../model";
import { TypeScript } from "../../typescript";

function baseGenerate(
  config: NineSchemaConfig,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction,
  typescript: TypeScript,
  context: object
) {
  return typescript.generate(nschema, config, template, target, context);
}

const templates: any = {};

export class NObject {
  public typescript: TypeScript | undefined = undefined;
  public init(nschema: NSchemaInterface) {
    if (!this.typescript) {
      throw new Error("Argument exception");
    }
    const typescript = this.typescript;
    templates.object = nschema.buildTemplate(
      path.resolve(__dirname, "class.ejs")
    );
    nschema.registerTarget({
      description: "Generate typescript models for your nineschema definitions",
      language: "typescript",
      name: "typescript/object",
      type: "object",
      generate(
        config: NineSchemaConfig,
        thisNschema: NSchemaInterface,
        target: Target,
        context: object
      ) {
        return baseGenerate(
          config,
          thisNschema,
          target,
          templates.object,
          typescript,
          context
        );
      }
    });
    return Promise.resolve(true);
  }
}
const obj = new NObject();

export default obj;
