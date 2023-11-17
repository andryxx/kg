import fs from "fs";
import { bty, Counter, doInParallel, parseCSV } from "../mods/util";
import { Logger } from "../mods/logger";

// import config from "./config.json";

const entities = [
    // "drug",
    // "disease",
    // "chemical",
    // "gene",
    "proteins",
];


console.time("script duration");

const fileTemplate = "./dbpedia/data.*.csv";
const sourceFileTemplate = "./dbpedia/data.*.origin.csv";


(async () => {

    for (const entity of entities) {
        const fileName = fileTemplate.replace(/\*/g, entity);
        const file = new Logger(fileName);
        await file.clear();
        
        const sourceFileName = sourceFileTemplate.replace(/\*/g, entity);
        const fileText = fs.readFileSync(sourceFileName).toString();

        const result = fileText
            .replace(/"\\"/g, `"|"`)
            .replace(/:";"/g, `:","`)
            .replace(/";"/g, `~~~`)
            .replace(/";/g, `",`)
            .replace(/~~~/g, `";"`)
            .replace(/\\\\"/g, `'`)
            .replace(/\\"/g, `"`);

        await file.write(result);

        // END OF ENTITIES CYCLE
    }
    console.timeEnd("script duration");
})();
