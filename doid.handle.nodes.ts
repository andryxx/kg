console.time("script");
import jsonData from "./doid/nodes.json";

const data: any = jsonData;
const nodes: Array<any> = data;

const legalKeys = ["id", "lbl", "type", "meta"];
const extras = new Set();
const misseds = new Set();
const metas = new Set();
const subMetas = new Set();

const counter: any = {
    proper: 0,
    missed: 0, // missed legal key
    extra: 0, // extra key
    both: 0, // missed & extra
};

const findSubmeta = (obj) => {
    if (typeof obj === 'string' || obj instanceof String) {
        subMetas.add("<string>")
    } else {
        const submetaKeys = Object.keys(obj);
        for (const submetaKey of submetaKeys) subMetas.add(submetaKey);
    }
};

for (const node of nodes) {
    let result = 0;
    let extra = false;

    if (node.meta) {
        const extraKeys = Object.keys(node.meta)
        for (const eKey of extraKeys) {
            metas.add(eKey);


            if (Array.isArray(node.meta[eKey])) {
                for (const arrEl of node.meta[eKey]) findSubmeta(arrEl);
            } else {
                findSubmeta(node.meta[eKey]);
            }


        }
    }

    const nodeKeys = Object.keys(node);
    for (const key of nodeKeys) {
        if (legalKeys.includes(key)) continue;
        extras.add(key);
        extra = true;
    }
    if (extra) result += 1; // extra

    let missed = false;
    for (const key of legalKeys) {
        if (nodeKeys.includes(key)) continue;
        misseds.add(key);
        missed = true;
    }
    result += 2; // missed

    let cntKey = "proper";
    if (result === 1) cntKey = "extra";
    else if (result === 2) cntKey = "missed";
    else if (result === 3) cntKey = "both";

    counter[cntKey]++;
}

console.log("len ->", nodes.length, {
    counter, extra: Array.from(extras), missed: Array.from(misseds),
    metas: Array.from(metas),
    subMetas: Array.from(subMetas)
});


console.timeEnd("script");