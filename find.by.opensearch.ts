import { bty } from "./mods/util";
import { getConceptsOfNode, getEdgesBetweenNodes, searchExact, getEdges } from "./mods/open.search";

(async () => {
    console.log("OPEN SEARCH:");

    // const field = "node_code";
    // const value = "D065635";
    // const field = "node_name";
    // const value = "Benign Paroxysmal Positional Vertigo";
    // const value = "coronavirus";
    // const field = "entity_id";
    const field = "node_code";
    const value = "E67.3";
    // const conceptId = "umls_C0155502";

    // const response = await searchExact(field, value);
    // const response = await getAllMatched(field, value);
    // const response = await getAllById(value);
    // const response = await getEdges({ from: value, edgeLabel: "is_atom_of" });
    // const response = await getConceptsOfNode("id", value);
    // const response = await getEdgesBetweenNodes(value, conceptId);
    // const response = await searchExact(field, value);
    // const response = await getEdges({ from: "umls_A17838111", edgeLabel: "is_atom_of" }) || [];
    // const response = await getEdges({ from: "umls_A17838111" }) || [];
    const response = await getEdges({ from: "umls_C1442839" }) || [];
    //umls_A17838111-is_atom_of-umls_C1442839


    // const response = await client.indices.
    // const results = response.body.hits?.hits?.map(({ _source }) => normalizeDoc(_source));
    // response.body.hits?.hits.map(item => item._source)
    // console.log(results, results.length, results.map(doc => doc.id));
    // console.log(response.length, bty(response));
    console.log(response.length, response.map(doc => doc.id).sort());
    // console.log(response.body.hits.hits);

})();