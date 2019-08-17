/**
 * @module nschema/provider/source/json
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import { SourceBind } from "../../../model";

/*
@param {string} payload - .
@returns json promise
 */
async function getData(payload: string) {
  return await Promise.resolve(JSON.parse(payload));
}

/*
@alias module:nschema/sourceProviders/nschemaJson
 */
const source: SourceBind = {
  description: "Reads config data from json",
  getData,
  name: "json",
  async init(nschema) {
    return nschema.registerSource(this);
  },
  type: "source"
};

export default source;
