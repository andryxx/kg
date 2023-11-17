console.time("script");
import { sep } from "path";
import { Logger } from "../../mods/logger";
import { Counter, parseCSV } from "../../mods/util";

const csvFile = "./pharmobkg/pheno/source.csv";
const outputFile = "./pharmobkg/pheno/pheno.mapping.csv";

// const mppUmlsAtcFile = "./mappings/umls_atc.csv";
// const mppUmlsRxnormFile = "./mappings/umls_rxnorm.csv";
// const mppUmlsDrbFile = "./mappings/umls_drugbank.csv";
// const mppUmlsMeshFile = "./mappings/umls_mesh.csv";
const mppUmlsMedrtFile = "./mappings/umls_medrt.csv";

const allowed = [
    "SnoMedCT",
    "NDFRT",
    "MedDRA",
    "MeSH",
    "UMLS",
    "URL",
];

const separate = (expr) => {
    const separator = expr.includes("\"") ? "\"; \"" : "; ";
    return expr.split(separator).map(item => item.replace(/"/g, "")).filter(item => item.includes(":"));
};

const counter = new Counter();
(async () => {
    // await csv.clear();
    const dataSet = await parseCSV(csvFile, { separator: "," });
    // const mppUmlsAtcFileDS = await parseCSV(mppUmlsAtcFile, { separator: "," });
    // const atcUmlsMapping = mppUmlsAtcFileDS.reduce((accum, item) => {
    //     const { umls_concept_id, atc_id } = item;
    //     return { ...accum, [atc_id]: umls_concept_id };
    // }, {});

    // const mppUmlsRxnormFileDS = await parseCSV(mppUmlsRxnormFile, { separator: "," });
    // const rxnormUmlsMapping = mppUmlsRxnormFileDS.reduce((accum, item) => {
    //     const { umls_concept_id, rxnorm_id } = item;
    //     accum[rxnorm_id] = umls_concept_id;
    //     return accum;
    // }, {});

    // const mppUmlsDrbFileDS = await parseCSV(mppUmlsDrbFile, { separator: "," });
    // const drbUmlsMapping = mppUmlsDrbFileDS.reduce((accum, item) => {
    //     const { umls_concept_id, drugbank_id } = item;
    //     accum[drugbank_id] = umls_concept_id;
    //     return accum;
    // }, {});

    // const mppUmlsMeshFileDS = await parseCSV(mppUmlsMeshFile, { separator: "," });
    // const meshUmlsMapping = mppUmlsMeshFileDS.reduce((accum, item) => {
    //     const { umls_concept_id, id } = item;
    //     accum[id] = umls_concept_id;
    //     return accum;
    // }, {});

    const mppUmlsMedrtFileDS = await parseCSV(mppUmlsMedrtFile, { separator: "," });
    const medrtUmlsMapping = mppUmlsMedrtFileDS.reduce((accum, item) => {
        const { umls_concept_id, id } = item;
        accum[id] = umls_concept_id;
        return accum;
    }, {});

    let exit = false;
    const ontologies: Set<string> = new Set();
    for (const dataRow of dataSet) {
        const {
            "Cross-references": xrefs,
            "External Vocabulary": xvocs,
            "PharmGKB Accession Id": pgkbid,
        } = dataRow;

        const refs = [];
        if (xrefs) refs.push(...separate(xrefs));
        if (xvocs) refs.push(...separate(xvocs));

        if (refs.length === 0) continue;

        for (const ref of refs) {
            const [ontology] = ref.split(":").map(item => item.replace(/"/g, ""));
            ontologies.add(ontology);
            // if (pgkbid !== "PA446086qqqqq") console.log(dataRow["PharmGKB Accession Id"], ontology);
            if (Array.from(ontologies).some(item => !allowed.includes(item))) exit = true;
        }
        // if (pgkbid === "PA446086qqqqq") {
        if (exit) {
            console.log({
                xvocs,
                separated: separate(xvocs),
                ontologies: Array.from(ontologies),
            });
            return;
        }
        // """MeSH:D053307(Hyper-IgM Immunodeficiency Syndrome; Type 1)""; ""SnoMedCT:403835002(X-linked hyper-IgM syndrome)""; ""UMLS:C0398689(C0398689)""; ""NDFRT:N0000181141(Hyper-IgM Immunodeficiency Syndrome; Type 1 [Disease/Finding])"""

    }
    const headers: string[] = Array.from(ontologies);
    // console.log(headers.length)

    const csv = new Logger(outputFile, {
        withQuotes: "IfNeeded", separator: ",", header: [
            "pgkb",
            ...headers,
        ]
    });

    const mapping = [];

    for (const dataRow of dataSet) {
        const {
            "PharmGKB Accession Id": id,
            "Cross-references": xrefs,
            "External Vocabulary": xvocs,
        } = dataRow;

        const refs = [];
        if (xrefs) refs.push(...separate(xrefs));
        if (xvocs) refs.push(...separate(xvocs));

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

    await csv.clear();
    for (const mappingElement of mapping) {
        // if (!mappingElement["UMLS"] && mappingElement["ATC"]) {
        //     const atcId = mappingElement["ATC"];
        //     if (atcUmlsMapping[atcId]) {
        //         mappingElement["UMLS"] = atcUmlsMapping[atcId];
        //         counter.add("mapped from ATC");
        //     } else {
        //         counter.add("mapping not found in ATC");
        //     }
        // }

        // if (!mappingElement["UMLS"] && mappingElement["RxNorm"]) {
        //     const vocId = mappingElement["RxNorm"];
        //     if (rxnormUmlsMapping[vocId]) {
        //         mappingElement["UMLS"] = rxnormUmlsMapping[vocId];
        //         counter.add("mapped from RxNorm");
        //     } else {
        //         counter.add("mapping not found in RxNorm");
        //     }
        // }

        // if (!mappingElement["UMLS"] && mappingElement["DrugBank"]) {
        //     const vocId = mappingElement["DrugBank"];
        //     if (drbUmlsMapping[vocId]) {
        //         mappingElement["UMLS"] = drbUmlsMapping[vocId];
        //         counter.add("mapped from DrugBank");
        //     } else {
        //         counter.add("mapping not found in DrugBank");
        //     }
        // }

        // if (!mappingElement["UMLS"] && mappingElement["MeSH"]) {
        //     const vocId = mappingElement["MeSH"];
        //     if (meshUmlsMapping[vocId]) {
        //         mappingElement["UMLS"] = meshUmlsMapping[vocId];
        //         counter.add("mapped from MeSH");
        //     } else {
        //         counter.add("mapping not found in MeSH");
        //     }
        // }

        if (!mappingElement["UMLS"] && mappingElement["NDFRT"]) {
            const vocId = mappingElement["NDFRT"].split("(").shift();
            if (medrtUmlsMapping[vocId]) {
                mappingElement["UMLS"] = medrtUmlsMapping[vocId];
                counter.add("mapped from NDFRT");
            } else {
                counter.add("mapping not found in NDFRT");
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

    // const mesh = [];
    for (const mappingElement of unmapped) {
        unmappedCounter.add("unmapped in total");
        for (const column of headers) {
            if (mappingElement[column]) unmappedCounter.add(column);
            // if (column === "MeSH" && mappingElement[column]) mesh.push(mappingElement[column]);
        }
    }

    console.log(counter.getAsArr());
    console.log("references to the unmapped rows", unmappedCounter.getAsArr());
    console.timeEnd("script");
    // console.log(mesh.map(el => el.split("(").shift()))
})();
