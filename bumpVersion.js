const fs = require("fs");

const packageJson = require("./package.json");

const arg1 = process.argv[2];

const versionString = packageJson.version;

const [major, minor, mini] = versionString.split(".");

const lastVersion = String(Number(mini) + 1);

const newVersionString = [major, minor, lastVersion].join(".");

const newPackageJson = {
  ...packageJson,
  version: newVersionString
};

fs.writeFileSync("./package.json", JSON.stringify(newPackageJson, null, " "));
console.log("Bumped package.json version to", newVersionString);
