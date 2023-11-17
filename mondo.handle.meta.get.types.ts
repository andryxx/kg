console.time("script");
import { Logger } from "./mods/logger";

import jsonData from "./mondo/meta.json";
import nodesJsonData from "./mondo/nodes.json";

const properLog = new Logger("./mondo/meta.property.types.csv", { header: ["Property", "Relations Amount", "Node ID"] });
const fillerLog = new Logger("./mondo/meta.filler.types.csv", { header: ["Property", "Relations Amount", "Node ID"] });

const data: any = jsonData;
const metas: Array<any> = data.logicalDefinitionAxioms;

const nodesData: any = nodesJsonData;
const nodesArr: Array<any> = nodesData;

const nodes = nodesArr.reduce((accum, item) => {
    accum[item.id] = item.lbl;
    return accum;
}, {});

const invertedNodes = Object.entries(nodes).reduce((accum, item: any) => {
    const [key, value] = item;
    return { ...accum, [value]: key };
}, {});

class Counter {
    counts = {}

    add(property: string) {
        if (!this.counts[property]) this.counts[property] = 0;
        this.counts[property]++;
    };

    sort() {
        const arr = Object.keys(this.counts).reduce((acc, item) => {
            acc.push({ [item]: this.counts[item] });
            return acc;
        }, []);

        arr.sort((item1, item2) => {
            const val1 = Object.values(item1)[0];
            const val2 = Object.values(item2)[0];
            return Number(val2) - Number(val1);
        })

        this.counts = {};
        for (const count of arr) {
            const [[key, value]] = Object.entries(count);
            this.counts[key] = value;
        }
    }
};

const cntProperties = new Counter();
const cntFillers = new Counter();

const propertyIds = new Set();
const fillerIds = new Set();

(async () => {
    await properLog.clear()
    await fillerLog.clear()

    for (const meta of metas) {
        if (!meta.restrictions) continue;
        for (const restr of meta.restrictions) {
            // const metaKeys = Object.keys(restr);
            // for (const key of metaKeys) keysTypes.add(key);

            propertyIds.add(restr.propertyId);
            fillerIds.add(restr.fillerId);

            const prop = nodes[restr.propertyId];
            cntProperties.add(prop);

            const filler = nodes[restr.fillerId];
            cntFillers.add(filler);
        }
    }

    cntProperties.sort();
    for (const key of Object.keys(cntProperties.counts)) {
        await properLog.write([
            key,
            cntProperties.counts[key],
            invertedNodes[key],
        ]);
    }

    cntFillers.sort();
    for (const key of Object.keys(cntFillers.counts)) {
        await fillerLog.write([
            key,
            cntFillers.counts[key],
            invertedNodes[key],
        ]);
    }

    console.log("result ->", { propertyIds: propertyIds.size, fillerIds: fillerIds.size });
})();


console.timeEnd("script");