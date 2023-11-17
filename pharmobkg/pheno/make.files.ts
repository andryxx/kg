console.time("script");
import { Logger } from "../../mods/logger";
import { parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/pheno/source.csv";
const outputFile = "./pharmobkg/pheno/nodes_phenotypes.csv";
const outputFileAlt = "./pharmobkg/pheno/nodes_phenotypes_altnames.csv";

const edgesFileAlt = "./pharmobkg/pheno/edges_phenotypes_altnames.csv";

const uploadDate = "2023-10-03T09:04:40.920Z";

const tty = "PHENO";
const ttyText = "Phenotype";

const ttyAlt = "XQ";
const ttyTextAlt = "Alternate name for a qualifier";

const source = "pharmgkb";

const header = [
    "~id", // ?	~id
    "~label", // ?	~label  // human_disease
    "node_tty:String",
    "node_tty_text:String",
    "node_code:String",
    `node_name:String`,
    "node_source_1:String",
    // ?	node_source_2:String
    "type:String", // ?	
    "uploaded_at:Date", // "YYYY-MM-DD"
];

const headerEdges = [
    "~id",
    "~from",
    "~to",
    "~label",
    "edge_text:String",
    "edge_source_1:String",
    "uploaded_at:Date"
];

const edgeNameDirect = "alternative_of";
const edgeNameInverted = "has_alternative";

const nodesCsv = new Logger(outputFile, { withQuotes: "IfNeeded", separator: ",", header });
const altNodesCsv = new Logger(outputFileAlt, { withQuotes: "IfNeeded", separator: ",", header });
const altEdgesCsv = new Logger(edgesFileAlt, { withQuotes: "IfNeeded", separator: ",", headerEdges });

interface ReportRowData {
    from: string;
    to: string;
    eType: string;
    eLbl: string;
};

const logEdge = async (rowData: ReportRowData, csv = altEdgesCsv) => {
    const { from, to, eType, eLbl } = rowData;
    await csv.write([
        [from, eType, to].join("-"), // "~id",
        from, // "~from",
        to, // "~to",
        eType, // "~label",
        eLbl, // "edge_text:String",
        source, // "edge_source_1:String",
        uploadDate, // "uploaded_at:Date"
    ]);
};

(async () => {
    await nodesCsv.clear();
    await altNodesCsv.clear();
    await altEdgesCsv.clear();

    const dataSet = await parseCSV(csvFile, { separator: "," });
    console.log("rows", dataSet.length)
    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": id,
            "Name": name,
            "Alternate Names": altNames,
            "Type": drugType,
        } = dataRow;

        const nodeId = `pgkb_${id.toLowerCase()}`;

        await nodesCsv.write([
            nodeId, // "~id", // ?	~id
            "phenotype", // "~label", // ?	~label  // human_disease
            tty, // "node_tty:String",
            ttyText, // "node_tty_text:String",
            id, // "node_code:String",
            name, // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);


        if (!altNames) continue;

        let altCount = 1;
        for (const altName of altNames.replace(/"/g, "").split(", ")) {
            const atomId = `pgkb_${id.toLowerCase()}_altname_${altCount++}`;
            await altNodesCsv.write([
                atomId, // "~id", // ?	~id
                "phenotype", // "~label", // ?	~label  // human_disease
                ttyAlt, // "node_tty:String",
                ttyTextAlt, // "node_tty_text:String",
                id, // "node_code:String",
                altName, // `"node_name:String"`,
                source, // "node_source_1:String",
                // // ?	node_source_2:String
                "atom", // "type:String", // ?	
                uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
            ]);

            await logEdge({
                from: atomId,
                to: nodeId,
                eType: "alternative_of",
                eLbl: "Alternative of",
            });

            await logEdge({
                from: nodeId,
                to: atomId,
                eType: "has_alternative",
                eLbl: "Has alternative",
            });
        }
    }
})();
console.timeEnd("script");
