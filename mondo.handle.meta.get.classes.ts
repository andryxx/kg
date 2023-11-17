console.time("script");
import { Logger } from "./mods/logger";

import jsonData from "./mondo/meta.json";
import nodesJsonData from "./mondo/nodes.json";

const classesLog = new Logger("./mondo/meta.classes.csv", { header: ["Class", "Children Direct", "Children Total", "Node ID"] });
// const fillerLog = new Logger("./mondo/meta.filler.types.csv", { header: ["Property", "Relations Amount", "Node ID"] });

const data: any = jsonData;
const metas: Array<any> = data.logicalDefinitionAxioms;

const nodesData: any = nodesJsonData;
const nodesArr: Array<any> = nodesData;

const nodes = nodesArr.reduce((accum, item) => {
    accum[item.id] = item.lbl;
    return accum;
}, {});

const graphSet = new Set();
for (const meta of metas) {
    if (!meta.genusIds || !meta.definedClassId) continue;
    const child = meta.definedClassId;
    const parents = meta.genusIds;
    // console.log({meta, parents})

    for (const parent of parents) {
        graphSet.add(`${child}___${parent}`);
    };
}

const graph = [];
const arrSet: any[] = Array.from(graphSet);
for (const element of arrSet) {
    const [child, parent] = element.split("___");
    graph.push({parent, child});
}

const findAllChildren = (nodeId, skip = []) => {
    if (skip.includes(nodeId)) return 0;
    let childrenAmount = 0;
    for (const node of graph) {
        if (node.parent !== nodeId) continue;
        childrenAmount++;
        childrenAmount += findAllChildren(node.child, [...skip, nodeId]);
    }
    return childrenAmount;
};

const findDirectChildren = (nodeId) => {
    let childrenAmount = 0;
    for (const node of graph) {
        if (node.parent !== nodeId) continue;
        childrenAmount++;
    }
    return childrenAmount;
};

// const invertedNodes = Object.entries(nodes).reduce((accum, item: any) => {
//     const [key, value] = item;
//     return { ...accum, [value]: key };
// }, {});

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

const classes = new Counter();

// const cntProperties = new Counter();
// const cntFillers = new Counter();

// const propertyIds = new Set();
// const fillerIds = new Set();


(async () => {
    await classesLog.clear()
    // await fillerLog.clear()

    for (const meta of metas) {
        const parents = meta.genusIds || [];
        for (const parent of parents) classes.add(parent);
    }

    // classes.sort();
    for (const key of Object.keys(classes.counts)) {
        await classesLog.write([
            nodes[key],
            findDirectChildren(key),
            findAllChildren(key),
            key,
        ]);
    }

    // cntFillers.sort();
    // for (const key of Object.keys(cntFillers.counts)) {
    //     await fillerLog.write([
    //         key,
    //         cntFillers.counts[key],
    //         invertedNodes[key],
    //     ]);
    // }

    // console.log("result ->", { propertyIds: propertyIds.size, fillerIds: fillerIds.size });
})();


console.timeEnd("script");