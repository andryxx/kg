console.time("script");
import { Logger } from "../../mods/logger";
import { parseCSV, timeout } from "../../mods/util";

const sourceFiles = [
    "./pharmobkg/anno/asource1.csv",
    "./pharmobkg/anno/asource2.csv",
    "./pharmobkg/anno/asource3.csv",
    "./pharmobkg/anno/asource4.csv",
    "./pharmobkg/anno/asource5.csv",
];

const outputFile = "./pharmobkg/anno/nodes.haplotypes.csv";


const uploadDate = "2023-11-09T09:04:40.920Z";

const tty = "PT";
const ttyText = "Designated preferred name";

const source = "pharmgkb";

const header = [
    "~id", // ?	~id
    "~label", // ?	~label  // human_disease
    "node_tty:String",
    "node_tty_text:String",
    "node_code:String",
    "node_name:String",
    "node_source_1:String",
    "type:String", // ?	
    "uploaded_at:Date", // "YYYY-MM-DD"
];

// const headerEdges = [
//     "~id",
//     "~from",
//     "~to",
//     "~label",
//     "edge_text:String",
//     "edge_source_1:String",
//     "uploaded_at:Date"
// ];

const haploCsv = new Logger(outputFile, { withQuotes: "IfNeeded", separator: ",", header });

const isVariant = (str: string): boolean => str.startsWith("rs");

(async () => {
    await haploCsv.clear();
    const haploSet: Set<string> = new Set();

    for (const sourceFile of sourceFiles) {
        const dataSet = await parseCSV(sourceFile, { separator: "," });

        console.log("rows", dataSet.length)
        for (const dataRow of dataSet) {
            const {
                // "Clinical Annotation ID": pgkbId,
                "Variant/Haplotypes": haploField,
                // "Name": name,
                // "Alternate Names": altNames,
                // "Alternate Symbols": altSymbols,
                // "Symbol": symbol,
            } = dataRow;

            if (!haploField) continue;


            for (const haplo of haploField.replace(/ /g, "").split(",")) {
                if (isVariant(haplo)) continue;
                haploSet.add(haplo);
            }

        }
    }

    for (const haplo of Array.from(haploSet)) {
        const nodeId = `pgkb_${haplo.toLowerCase().replace(/[-+*:]/g, "_")}`;
        await haploCsv.write([
            nodeId, // "~id", // ?	~id
            "haplotype", // "~label", // ?	~label  // human_disease
            tty, // "node_tty:String",
            ttyText, // "node_tty_text:String",
            haplo, // "node_code:String",
            haplo, // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);
    }
})();
console.timeEnd("script");
