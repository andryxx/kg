console.time("script");
import { Logger } from "../../mods/logger";
import { parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/source_drugs.csv";
const outputFile = "./pharmobkg/nodes_drugs_atm_generics.csv";

const uploadDate = "2023-09-26T09:04:40.920Z";

const csv = new Logger(outputFile, {
    withQuotes: "IfNeeded", separator: ",", header: [
        "~id", // ?	~id
        "~label", // ?	~label  // human_disease
        "node_tty:String(single)",
        "node_tty_text:String(single)",
        "node_code:String(single)",
        "node_name:String(single)",
        "node_source_1:String(single)",
        // ?	node_source_2:String
        "type:String(single)", // ?	
        "uploaded_at:Date", // "YYYY-MM-DD"
    ]
});

(async () => {
    await csv.clear();
    const dataSet = await parseCSV(csvFile, { separator: "," });
    console.log("rows", dataSet.length)
    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": id,
            "Generic Names": gNames,
            "Type": drugType,
        } = dataRow;
        if (!gNames) continue;

        let gCount = 1;
        for (const generic of gNames.replace(/"/g, "").split(", ")){
            await csv.write([
                `pgkb_${id.toLowerCase()}_generic_${gCount++}`, // "~id", // ?	~id
                drugType, // "~label", // ?	~label  // human_disease
                "DP", // "node_tty:String",
                "Drug Product", // "node_tty_text:String",
                id, // "node_code:String",
                generic, // `"node_name:String"`,
                "pharmgkb", // "node_source_1:String",
                // // ?	node_source_2:String
                "atom", // "type:String", // ?	
                uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
            ]);
        }
    }
})();
console.timeEnd("script");
