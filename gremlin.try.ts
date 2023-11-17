import gremlin from "gremlin";
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const endpoint = "wss://neptune-dev-database-1.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ ONLY
// const endpoint = "wss://neptune-dev-database-1.cluster-ro-csuiw8leicqh.us-east-1.neptune.amazonaws.com:8182/gremlin"; // READ WRITE

const dc = new DriverRemoteConnection(endpoint, {});

const graph = new Graph();
const g = graph.traversal().withRemote(dc);

// g.V().has("uploaded_at", new Date("2023-09-26T09:04:40.920Z")).limit(1).toList().
// g.V().has("~label", "Drug").limit(1).toList(). //find node by id
// g.V().has("~id", "pgkb_pa166238901").toList(). //find node by id
// g.V().has("node_tty", "DP").limit(10).toList(). //find node by id
g.E().limit(10).toList(). //find node by id
    then(data => {
        console.log(JSON.parse(JSON.stringify(data)));
        dc.close();
    }).catch(error => {
        console.log("ERROR", error);
        dc.close();
    });

/**
удалить ребра

g.E().or(hasLabel("SY"),hasLabel("SY")).has("uploaded_at", datetime("2023-09-25")).sideEffect(drop()).iterate()

получить все вершины ребра
outE()
g.V("drugbank_DB07282").valueMap()
 */