console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV } from "../../mods/util";

const counter = new Counter();
counter.add("missed variants", 0);

const csvFile = "./pharmobkg/variants/source.csv";

const snpFile = "./pharmobkg/variants/nodes.snp.2.csv";
const edgesFile = "./pharmobkg/variants/edges.vari.snp.2.csv";

const mappingFile = "./mappings/variants_haplos.csv";
const variantsFile = "./pharmobkg/variants/nodes.variants.csv";


const tty = "PTAV";
const ttyText = "Preferred Allelic Variant";

const source = "pharmgkb";

const header = [
    "~id", // ?	~id
    "~label", // ?	~label  // human_disease
    "node_tty:String",
    "node_tty_text:String",
    "node_code:String",
    `node_name:String`,
    "node_source_1:String",
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


const variCsv = new Logger(variFile, {
    withQuotes: "IfNeeded", separator: ",", header: [
        ...header,
        "location:String(single)",
        "variant_anno_count:String(single)",
        "clinic_anno_count:String(single)",
        "half_clinic_anno_count:String(single)",
        "guide_anno_count:String(single)",
        "label_anno_count:String(single)",
    ]
});
const snpCsv = new Logger(snpFile, { withQuotes: "IfNeeded", separator: ",", header });

const eSnpCsv = new Logger(edgesFileSnp, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });
const eGeneCsv = new Logger(edgesFileGene, { withQuotes: "IfNeeded", separator: ",", header: headerEdges });

const missedVariCsv = new Logger(missedVariFile, { withQuotes: "IfNeeded", separator: ",", header: ["snpid"] });

interface ReportRowData {
    from: string;
    to: string;
    eType: string;
    eLbl: string;
};

const logEdge = async (rowData: ReportRowData, csv: Logger) => {
    if (!csv) throw new Error("The logger object not defined");

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

const logEdgesPair = async ({ from, to, directLbl, invertedLbl }, csv): Promise<void> => {
    await logEdge({
        from,
        to,
        eType: directLbl.toLowerCase().replace(/ /g, "_"),
        eLbl: directLbl,
    }, csv);

    await logEdge({
        from: to,
        to: from,
        eType: invertedLbl.toLowerCase().replace(/ /g, "_"),
        eLbl: invertedLbl,
    }, csv);
};

const splitNames = (str: string): string[] => str.replace(/"/g, "").split(", ");

interface edgeMeta {
    eType: string;
    eLbl: string;
};

const makeAtomFiles = async (
    atomType: string,
    nCsv: Logger,
    eCsv: Logger,
    namesStr: string,
    nodeId: string,
    pgkbId: string,
    dirEdgeMeta: edgeMeta,
    invEdgeMeta: edgeMeta,
    labels: string[],
): Promise<void> => {
    let gCount = 1;
    for (const entityName of splitNames(namesStr)) {
        const atomId = [nodeId, atomType, gCount++].join("_");
        await nCsv.write([
            atomId, // "~id", // ?	~id
            [`chemical_${atomType}`, ...labels].join(";"), // "~label", // ?	~label
            "EQ", // ttyGen, // "node_tty:String",
            "Equivalent name", // ttyTextGen, // "node_tty_text:String",
            pgkbId, // "node_code:String",
            entityName, // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);

        await logEdge({
            from: atomId,
            to: nodeId,
            ...dirEdgeMeta,
        }, eCsv);

        await logEdge({
            from: nodeId,
            to: atomId,
            ...invEdgeMeta,
        }, eCsv);
    }
};

(async () => {
    await variCsv.clear();
    await snpCsv.clear();
    await eSnpCsv.clear();
    await eGeneCsv.clear();
    await missedVariCsv.clear();

    const dataSet = await parseCSV(csvFile, { separator: "," }); // variants table
    const checkList = await parseCSV(checkListFile, { separator: "," })
        .then(dtSet => dtSet.reduce((set, dataRow) => {
            const { "node_code:String": vid } = dataRow;
            set.add(vid);
            return set;
        }, new Set()));

    const sourceCodesSet = dataSet.reduce((set, dataRow) => {
        const { "Variant Name": vid } = dataRow;
        set.add(vid);
        return set;
    }, new Set());

    const genes = await parseCSV(genesFile, { separator: "," })
        .then(dtSet => dtSet.reduce((mapping, dataRow) => {
            const {
                "~id": pgkbGeneId,
                "node_code:String": geneId
            } = dataRow;
            mapping[geneId] = pgkbGeneId;
            return mapping;
        }, {}));

    console.log({
        sourceSize: dataSet.length,
        sourceCodesSize: sourceCodesSet.size,
        checkListSize: checkList.size,
    });


    for (const vcode of checkList) {
        if (sourceCodesSet.has(vcode)) continue;
        await missedVariCsv.write([vcode]);
        counter.add("missed variants")
    }

    for (const dataRow of dataSet) {
        const {
            "Variant ID": pgkbId,
            "Variant Name": snpId,
            "Gene IDs": genePgkbIds,
            "Gene Symbols": geneSymbols,
            "Location": location,
            "Variant Annotation count": varAnnoCnt,
            "Clinical Annotation count": clinicAnnoCnt,
            "Level 1/2 Clinical Annotation count": halfClinicAnnoCnt,
            "Guideline Annotation count": guideAnnoCnt,
            "Label Annotation count": lblAnnoCnt,
        } = dataRow;

        const variNodeId = `pgkb_${pgkbId.toLowerCase()}`;
        //     const labels = typesStr.split(", ").map(item => item.toLowerCase().replace(/ /g, "_"));

        await variCsv.write([
            variNodeId, // "~id", // ?	~id
            "variant", // "~label", // ?	~label  // human_disease
            tty, // "node_tty:String",
            ttyText, // "node_tty_text:String",
            pgkbId, // "node_code:String",
            snpId, // `"node_name:String"`,
            source, // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
            location, // "Location"
            varAnnoCnt, //  "Variant Annotation count"
            clinicAnnoCnt, // "Clinical Annotation count"
            halfClinicAnnoCnt, //"Level 1/2 Clinical Annotation count"
            guideAnnoCnt, //"Guideline Annotation count"
            lblAnnoCnt, //"Label Annotation count"
        ]);

        const snpNodeId = ["dbsnp", snpId].join("_");
        await snpCsv.write([
            snpNodeId, // "~id", // ?	~id
            "snp", // "~label", // ?	~label  // human_disease
            tty, // "node_tty:String",
            ttyText, // "node_tty_text:String",
            snpId, // "node_code:String",
            snpId, // `"node_name:String"`,
            "dbsnp", // "node_source_1:String",
            // // ?	node_source_2:String
            "atom", // "type:String", // ?	
            uploadDate, // "uploaded_at:Date", // "YYYY-MM-DD"
        ]);

        await logEdge({
            from: variNodeId,
            to: snpNodeId,
            eType: "is_a",
            eLbl: "Is a",
        }, eSnpCsv);

        await logEdge({
            from: snpNodeId,
            to: variNodeId,
            eType: "is_a",
            eLbl: "Is a",
        }, eSnpCsv);

        if (genePgkbIds) {
            const geneIds = genePgkbIds.split(",");
            for (const geneId of geneIds) {
                const geneNodeId = genes[geneId];
                if (!geneNodeId) {
                    counter.add("missed genes");
                    continue;
                } else {
                    await logEdgesPair({
                        from: geneNodeId,
                        to: variNodeId,
                        directLbl: "Has variant",
                        invertedLbl: "Variant of",
                    }, eGeneCsv);
                }
            }
        }
    }

    console.log(counter.getAsArr());
})();
console.timeEnd("script");
