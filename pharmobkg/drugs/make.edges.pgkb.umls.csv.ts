console.time("script");
import { Logger } from "../../mods/logger";
import { Counter, parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/drugs/source_drugs.csv";
const outputFile = "./pharmobkg/drugs/mapping.pgkb.umls.csv";
const edgesFile = "./pharmobkg/drugs/edges.drugs.pgkb.umls.csv";

const uploadDate = "2023-10-19T09:04:40.920Z";
const source = "pgkb";

const edges = new Logger(edgesFile, {
    withQuotes: false, separator: ",", header: [
        "~id",
        "~from",
        "~to",
        "~label",
        "edge_text:String(single)",
        "edge_source_1:String(single)",
        "uploaded_at:Date"
    ]
});

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

const mppUmlsAtcFile = "./mappings/umls_atc.csv";
const mppUmlsRxnormFile = "./mappings/umls_rxnorm.csv";
const mppUmlsDrbFile = "./mappings/umls_drugbank.csv";
const mppUmlsMeshFile = "./mappings/umls_mesh.csv";

const counter = new Counter();
(async () => {
    // await csv.clear();
    const dataSet = await parseCSV(csvFile, { separator: "," });
    const mppUmlsAtcFileDS = await parseCSV(mppUmlsAtcFile, { separator: "," });
    const atcUmlsMapping = mppUmlsAtcFileDS.reduce((accum, item) => {
        const { umls_concept_id, atc_id } = item;
        return { ...accum, [atc_id]: umls_concept_id };
    }, {});

    const mppUmlsRxnormFileDS = await parseCSV(mppUmlsRxnormFile, { separator: "," });
    const rxnormUmlsMapping = mppUmlsRxnormFileDS.reduce((accum, item) => {
        const { umls_concept_id, rxnorm_id } = item;
        accum[rxnorm_id] = umls_concept_id;
        return accum;
    }, {});

    const mppUmlsDrbFileDS = await parseCSV(mppUmlsDrbFile, { separator: "," });
    const drbUmlsMapping = mppUmlsDrbFileDS.reduce((accum, item) => {
        const { umls_concept_id, drugbank_id } = item;
        accum[drugbank_id] = umls_concept_id;
        return accum;
    }, {});

    const mppUmlsMeshFileDS = await parseCSV(mppUmlsMeshFile, { separator: "," });
    const meshUmlsMapping = mppUmlsMeshFileDS.reduce((accum, item) => {
        const { umls_concept_id, id } = item;
        accum[id] = umls_concept_id;
        return accum;
    }, {});

    const ontologies: Set<string> = new Set();
    for (const dataRow of dataSet) {
        const {
            "Cross-references": xrefs,
            "External Vocabulary": xvocs,
        } = dataRow;

        const refs = [];
        if (xrefs) refs.push(...xrefs.split(", "));
        if (xvocs) refs.push(...xvocs.split(", "));

        if (refs.length === 0) continue;

        for (const ref of refs) {
            const [ontology] = ref.split(":");
            ontologies.add(ontology);
        }
    }

    const headers: string[] = Array.from(ontologies);

    const csv = new Logger(outputFile, {
        withQuotes: "IfNeeded", separator: ",", header: [
            "pgkb",
            ...headers,
        ]
    });
    csv.clear();

    const mapping = [];

    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": id,
            "Cross-references": xrefs,
            "External Vocabulary": xvocs,
        } = dataRow;

        const refs = [];
        if (xrefs) refs.push(...xrefs.split(", "));
        if (xvocs) refs.push(...xvocs.split(", "));

        if (refs.length === 0) continue;
        const elMapping = {};

        for (const ref of refs) {
            const [ontology, val] = ref.split(":");
            elMapping[ontology] = val;
        }

        const mappingElement = { pgkb: id };
        counter.add("pgkb entities");
        for (const column of headers) {
            mappingElement[column] = elMapping[column] || "";
            if (column === "UMLS" && elMapping[column]) counter.add("originally mapped");
        }
        mapping.push(mappingElement);
    }

    const notMapped = mapping.filter(elem => elem["UMLS"].length === 0).length;
    counter.add("originally not mapped", notMapped);

    for (const mappingElement of mapping) {
        if (!mappingElement["UMLS"] && mappingElement["ATC"]) {
            const atcId = mappingElement["ATC"];
            if (atcUmlsMapping[atcId]) {
                mappingElement["UMLS"] = atcUmlsMapping[atcId];
                counter.add("mapped from ATC");
            } else {
                counter.add("mapping not found in ATC");
            }
        }
        
        if (!mappingElement["UMLS"] && mappingElement["RxNorm"]) {
            const vocId = mappingElement["RxNorm"];
            if (rxnormUmlsMapping[vocId]) {
                mappingElement["UMLS"] = rxnormUmlsMapping[vocId];
                counter.add("mapped from RxNorm");
            } else {
                counter.add("mapping not found in RxNorm");
            }
        }
        
        if (!mappingElement["UMLS"] && mappingElement["DrugBank"]) {
            const vocId = mappingElement["DrugBank"];
            if (drbUmlsMapping[vocId]) {
                mappingElement["UMLS"] = drbUmlsMapping[vocId];
                counter.add("mapped from DrugBank");
            } else {
                counter.add("mapping not found in DrugBank");
            }
        }

        if (!mappingElement["UMLS"] && mappingElement["MeSH"]) {
            const vocId = mappingElement["MeSH"];
            if (meshUmlsMapping[vocId]) {
                mappingElement["UMLS"] = meshUmlsMapping[vocId];
                counter.add("mapped from MeSH");
            } else {
                counter.add("mapping not found in MeSH");
            }
        }

        const reportRow = [mappingElement["pgkb"]];
        for (const column of headers) {
            reportRow.push(mappingElement[column] || "");
        }
        await csv.write(reportRow);

        
    }

    const unmapped = mapping.filter(elem => elem["UMLS"].length === 0);
    const unmappedCounter = new Counter();

    const mesh = [];
    for (const mappingElement of unmapped) {
        unmappedCounter.add("unmapped in total");
        for (const column of headers) {
            if (mappingElement[column]) unmappedCounter.add(column);
            if (column === "MeSH" && mappingElement[column]) mesh.push(mappingElement[column]);
        }
    }

    console.log(counter.getAsArr());
    console.log("references to the unmapped rows", unmappedCounter.getAsArr());
    console.timeEnd("script");
    console.log(mesh)
})();
