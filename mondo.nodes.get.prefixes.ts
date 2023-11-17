console.time("script");
import jsonData from "./mondo/nodes.json";

const data: any = jsonData;
const nodes: Array<any> = data;

const legalKeys = ["id", "lbl", "type", "meta"];
const extras = new Set();
const misseds = new Set();
const metas = new Set();
const subMetas = new Set();

class Counter {
    counts = {}

    add(property: string) {
        if (!this.counts[property]) this.counts[property] = 0;
        this.counts[property]++;
    };
};

const counter = new Counter();
const prefixes = new Set();

for (const node of nodes) {
    const prefixArr = node.id.split("/").pop().split("_");
    if (prefixArr.length === 1) {
        if (!Number.isNaN(Number(prefixArr[0]))) continue;
    } else prefixArr.pop();
    const prefix = prefixArr.join("_");
    prefixes.add(prefix);
    counter.add(prefix);
    if (prefix === "" && !node.id.split("/").includes("hgnc")) {
        console.log({ prefix, id: node.id })
        process.exit(0)
    }
}

console.log(counter.counts);
// console.log("prefixes ->", Array.from(prefixes));


console.timeEnd("script");