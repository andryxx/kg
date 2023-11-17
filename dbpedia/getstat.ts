import fs from "fs";
import { bty, Counter, doInParallel, parseCSV } from "../mods/util";

// import config from "./config.json";

const entities = [
    // "drug",
    // "disease",
    // "chemical",
    "gene",
    // "proteins",
];


console.time("script duration");

const mappingFileTemplate = "./dbpedia/mapping.*.csv";
const nodesFileTemplate = "./dbpedia/nodes.*.csv";
const counter = new Counter();

(async () => {
    for (const entity of entities) {
        const mappingFileName = mappingFileTemplate.replace(/\*/g, entity);
        const dataSet = await parseCSV(mappingFileName);

        const nodesFileName = nodesFileTemplate.replace(/\*/g, entity);
        const nodesDataSet = await parseCSV(nodesFileName);
        counter.add(`${entity} nodes total`, nodesDataSet.length);


        for (const dataRow of dataSet) {
            counter.add(`${entity} nodes having references`);
            for (const onotology in dataRow) {
                if (onotology === "nodeId") continue;
                if (!dataRow[onotology]?.length) continue;
                counter.add(`${entity}/${onotology} references`);
            }
        }

        // END OF ENTITIES CYCLE
    }

    console.log(counter.getAsArr());
    console.timeEnd("script duration");
})();
