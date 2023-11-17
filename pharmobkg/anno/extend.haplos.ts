console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV, timeout } from "../../mods/util";

const sourceFiles = [
    "./pharmobkg/anno/asource1.csv",
    "./pharmobkg/anno/asource2.csv",
    "./pharmobkg/anno/asource3.csv",
    "./pharmobkg/anno/asource4.csv",
    "./pharmobkg/anno/asource5.csv",
];

const haploVariMppFile = "./mappings/variants_haplos.csv";
const missedHaplosFile = "./mappings/missed.haplos.csv"

const variFile = "./pharmobkg/anno/dont.load.list.variants.csv";

// const edgesHaploFile = "./pharmobkg/anno/edges.haplo.snp.csv";

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

const haploCsv = new Logger(variFile, { withQuotes: "IfNeeded", separator: ",", header });
// const edgesHaploCsv = new Logger(edgesHaploFile, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });

const missedHaplosCsv = new Logger(missedHaplosFile, { withQuotes: "IfNeeded", separator: ",", header: ["haplotype"] });

const isVariant = (str: string): boolean => str.startsWith("rs");

const makeHaploId = (haplo: string): string => `pgkb_${haplo.toLowerCase().replace(/[-+*:]/g, "_")}`;

const makeVariId = (vari: string): string => `pgkb_${vari.toLowerCase()}`;

const counter = new Counter();

(async () => {
    await haploCsv.clear();
    // await edgesHaploCsv.clear();
    await missedHaplosCsv.clear();

    const variSet: Set<string> = new Set();
    const haploSet: Set<string> = new Set();

    const haploMapping = await parseCSV(haploVariMppFile, { separator: "," })
        .then(dataSet => dataSet.reduce((accum, dataRow) => {
            const { haplo, variant } = dataRow;
            if (!accum[haplo]) accum[haplo] = new Set();
            accum[haplo].add(variant);
            return accum;
        }, {}));

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
                if (isVariant(haplo)) variSet.add(haplo);
                else haploSet.add(haplo);
            }

        }
    }

    console.log("has", haploSet.has("CYP2D6*1"));

    for (const haplo of haploSet) {
        const extensions: Set<string> = haploMapping[haplo];
        if (!extensions) {
            counter.add("haplos missed in the mapping");
            await missedHaplosCsv.write([haplo]);
            continue;
        }

        const hid = makeHaploId(haplo);
        for (const vari of extensions) {
            variSet.add(vari);
            // const vid = makeVariId(vari);
            // await edgesHaploCsv.write([
            //     `${vid}-varaiant_of-${hid}`, // "~id",
            //     vid, // "~from",
            //     hid, // "~to",
            //     "varaiant_of", // "~label",
            //     "Varaiant of", // "edge_text:String",
            //     source, // "edge_source_1:String",
            //     uploadDate, // "uploaded_at:Date"
            // ]);

            // await edgesHaploCsv.write([
            //     `${hid}-varaiant_of-${vid}`, // "~id",
            //     hid, // "~from",
            //     vid, // "~to",
            //     "has_varaiant", // "~label",
            //     "Has varaiant", // "edge_text:String",
            //     source, // "edge_source_1:String",
            //     uploadDate, // "uploaded_at:Date"
            // ]);
        }   

        counter.add("haplos extended");
    }

    for (const variCode of Array.from(variSet)) {
        const nodeId = `pgkb_${variCode.toLowerCase().replace(/[-+*:]/g, "_")}`;
        await haploCsv.write([
            nodeId, // "~id", // ?	~id
            "", // "haplotype", // "~label", // ?	~label  // human_disease
            "", // tty, // "node_tty:String",
            "", // ttyText, // "node_tty_text:String",
            variCode, // "node_code:String",
            "", // variCode, // `"node_name:String"`,
            "", // source, // "node_source_1:String",
            "", // "atom", // "type:String", // ?	
            "", // uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);
    }

    console.log(counter.getAsArr());
})();
console.timeEnd("script");
