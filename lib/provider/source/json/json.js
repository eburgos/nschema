function getData(payload) {
    return Promise.resolve(JSON.parse(payload));
}
const source = {
    description: "Reads config data from json",
    getData,
    name: "json",
    init(nschema) {
        return nschema.registerSource(this);
    },
    type: "source"
};
export default source;
//# sourceMappingURL=json.js.map