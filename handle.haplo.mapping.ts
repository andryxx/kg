console.time("script");
import { Logger } from "./mods/logger";
import { Counter, parseCSV } from "./mods/util";

const sourceFiles = [
    "./mappings/haplotypes.csv",
    "./mappings/hla_haplotypes.csv",
];
const outputFile = "./mappings/variants_haplos.csv"

const output = new Logger(outputFile, {
    withQuotes: "IfNeeded", separator: ",", header: ["haplo", "variant"]
});

const counter = new Counter();

(async () => {
    await output.clear();

    for (const sourceFile of sourceFiles) {
        const dataSet = await parseCSV(sourceFile, { separator: "," });
    
        for (const dataRow of dataSet) {
            const { haplo, variants } = dataRow;
            counter.add("haplos in file");
            if (!variants) console.log({dataRow});
            for (const variant of variants.split(" ")) {
                await output.write([haplo, variant]);
                counter.add("mapped variants");
            }
        }
    }

    console.log(counter.getAsArr());
})();
console.timeEnd("script");
// process.exit(0);
