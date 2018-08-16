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
import { TypeScript } from "../../typescript";

function baseGenerate(
  config: NineSchemaConfig,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction,
  typescript: TypeScript
) {
  return typescript.generate(nschema, config, template, target);
}

const templates: any = {};

export class NObject {
  public typescript: TypeScript;
  public init(nschema: NSchemaInterface) {
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
        target: Target
      ) {
        return baseGenerate(
          config,
          thisNschema,
          target,
          templates.object,
          typescript
        );
      }
    });
    return Promise.resolve(true);
  }
}
const obj = new NObject();

export default obj;
