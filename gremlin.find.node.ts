import { bty } from "./mods/util";
import gremlin from "gremlin";

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

// const endpoint = "wss://neptune-dev-database-1.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
// const endpoint = "wss://dev.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
const endpoint = "wss://dev-instance-2.csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY

// const endpoint = "wss://neptune-dev-database-1.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ WRITE

const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);


// const id = "umls_pa166238901";
// const id = "pgkb_pa166238901";

// g.V().has("~id", id).toList().
// g.V().has("~label", "disease").count().toList().
// g.V().has("node_code", "PA166238901").toList().
// g.V('123456').values('fld_type')

const searchValue = "Currarino syndrome";

(async () => {
    // const data = await g.V().has('node_name', searchValue).elementMap().toList();
    // const data = await g.V("umls_A18467593").outE().elementMap().toList(); // all edges
    const data = await g.V("umls_A18467593").out("is_atom_of").elementMap().toList();
    const resp = data.map(item => JSON.parse(JSON.stringify(Object.fromEntries(item))));
    console.log(resp);
    dc.close();

})();
