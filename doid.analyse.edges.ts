import { Counter, parseCSV } from "./mods/util";

const edgesFile = "./doid/edges.csv";

// ': FROM_OR_TO_VERTEX_ARE_MISSING',
const missedEdges = [
    'chebi',
    'foodon',
    'ncbitaxon',
    'uberon',
    'hp',
    'trans',
    'symp',
    'geno',
    'so',
    'cl'
];

const counter = new Counter();

(async () => {
    const dataSet: any[] = await parseCSV(edgesFile, { separator: "," });

    for (const dataRow of dataSet) {
        const { "~to": reference, "~label": label } = dataRow;
        const refPref = reference.split("_").shift();
        if (missedEdges.includes(refPref)) continue;
        counter.add(label);
        if (label === "disease_has_feature") {
            counter.add(`features for ${refPref}`);
        } else {
            counter.add(`relations with ontolgy ${refPref}`)
        }
    }

    console.log(counter.getAsArr());
})();