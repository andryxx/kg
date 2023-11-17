console.time("script");
import { Logger } from "../../mods/logger";
import { parseCSV } from "../../mods/util";

const MAKE_COPY = false;
const mapping = {
    "PharmGKB Accession Id": "pharmgkb_id",
    Name: "name",
    "Generic Names": "generic_names",
    "Trade Names": "trade_names",
    "Brand Mixtures": "brand_mixtures",
    Type: "type",
    "Cross-references": "xrefs",
    SMILES: "smiles",
    InChI: "inchi",
    "Dosing Guideline": "dosing_guide",
    "External Vocabulary": "external_vocabulary",
    "Clinical Annotation Count": "clinical_anno_count",
    "Variant Annotation Count": "variant_anno_count",
    "Pathway Count": "pathway_count",
    "VIP Count": "vip_count",
    "Dosing Guideline Sources": "dosing_guide_sources",
    "Top Clinical Annotation Level": "top_clinical_anno_lvl",
    "Top FDA Label Testing Level": "top_fda_lbl_testing_lvl",
    "Top Any Drug Label Testing Level": "top_any_drug_lbl_testing_lvl",
    "Label Has Dosing Info": "lbl_has_dosing_info",
    "Has Rx Annotation": "has_rx_anno",
    "RxNorm Identifiers": "rxnorm_ids",
    "ATC Identifiers": "atc_ids",
    "PubChem Compound Identifiers": "pubchem_compound_ids"
  };
const repHeader = Object.values(mapping);

const variantsOutputFile = `./pharmobkg/source.csv`;
const vOut = new Logger(variantsOutputFile, {
    header: repHeader,
    separator: ",",
    withQuotes: "IfNeeded"

});


const file = "./pharmobkg/drugs/source.csv";
const counter = {};

const getOrigKey = repColumn => {
    for (const [origKey, key] of Object.entries(mapping)) {
        if (key === repColumn) return origKey;
    }
};

const converted = {};

(async () => {
    if (MAKE_COPY) await vOut.clear();

    const dataSet = await parseCSV(file, { separator: "," });
    for (const key of Object.keys(dataSet[0])) {
        counter[key] = 0;
        const columnName = key.toLowerCase().replace(/ /g, "_");
        converted[key] = columnName;
    }
    
    for (const dataRow of dataSet) {
        for (const key of Object.keys(dataRow)) {
            if ((dataRow[key]?.length || 0) > counter[key])
            counter[key] = dataRow[key]?.length;
        }
        
        if (MAKE_COPY) {
            const repRow = [];
            for (const repColumn of repHeader) {
                const origKey = getOrigKey(repColumn);
                repRow.push(dataRow[origKey]);
            }
            await vOut.write(repRow);
        }
    }

    console.log({ rows: dataSet.length, converted, counter });
})();
console.timeEnd("script");
// process.exit(0);
