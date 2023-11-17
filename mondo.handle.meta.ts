console.time("script");

import jsonData from "./mondo/meta.json";

const data: any = jsonData;
const metas: Array<any> = data.logicalDefinitionAxioms;

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

const counter = new Counter();

(async () => {
    for (const meta of metas) {
        counter.add("total nodes");
    }

    console.log("result ->", counter.counts);
})();


console.timeEnd("script");