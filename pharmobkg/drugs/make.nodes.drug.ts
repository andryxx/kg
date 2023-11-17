console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/drugs/source_drugs.csv";
const outputFile = "./pharmobkg/drugs/nodes.drugs.csv";

const uploadDate = "2023-10-19T09:04:40.920Z";

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

const counter = new Counter();

(async () => {
    await csv.clear();
    const dataSet = await parseCSV(csvFile, { separator: "," });
    console.log("rows", dataSet.length)
    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": id,
            "Name": drugName,
            "Type": drugType,
        } = dataRow;

        await csv.write([
            `pgkb_${id.toLowerCase()}`, // "~id", // ?	~id
            drugType.toLowerCase().replace(/ /g, "_").replace(/,_/g, ";"), // "~label", // ?	~label  // human_disease
            "DP", // "node_tty:String",
            "Drug Product", // "node_tty_text:String",
            id, // "node_code:String",
            drugName, // `"node_name:String"`,
            "pharmgkb", // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);
        counter.add("drug nodes");
    }
    console.log(counter.getAsArr());
})();
console.timeEnd("script");
