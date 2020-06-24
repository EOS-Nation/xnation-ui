type node = string;
type edge = [string, string];

const routes: edge[] = [
  ["BNT", "KARMA"],
  ["BNT", "BTC"],
  ["BNT", "DICE"],
  ["BNT", "ETH"],
  ["BNT", "POWR"],
  ["KARMA", "CAT"],
  ["CAT", "GOOSE"],
  ["CAT", "CHASE"],
  ["CHASE", "ANT"]
];

const airports: node[] = _.uniq(routes.flat(1));

const adjacencyList = new Map();

function addNode(airport: string) {
  adjacencyList.set(airport, []);
}

function addEdge(origin: string, destination: string) {
  adjacencyList.get(origin).push(destination);
  adjacencyList.get(destination).push(origin);
}

airports.forEach(addNode);
routes.forEach(([origin, destination]) => addEdge(origin, destination));

const dfs = (
  start: string,
  goal: string,
  visited = new Set(),
  path: string[] = [start]
): any => {
  const startExists = adjacencyList.get(start);
  const goalExists = adjacencyList.get(goal);
  if (!(startExists && goalExists))
    throw new Error("Start or goal does not exist in adjacency list");

  visited.add(start);

  const destinations = adjacencyList.get(start);
  for (const destination of destinations) {
    if (destination === goal) {
      console.log("found path, of goal", path, goal);
      return [...path, goal];
    }

    if (!visited.has(destination)) {
      return dfs(destination, goal, visited, [...path, destination]);
    }
  }
};

console.log(adjacencyList, "were airports");

const x = dfs("BNT", "CAT");
console.log(x, "was returned");
