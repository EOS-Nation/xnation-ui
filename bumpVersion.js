const fs = require("fs");

const packageJson = require("./package.json");

const arg1 = process.argv[2];

const versionString = packageJson.version;
console.log(versionString);

const [major, minor, mini] = versionString.split(".");

const lastVersion = String(Number(mini) + 1);

const newVersionString = [major, minor, lastVersion].join(".");

const newPackageJson = {
  ...packageJson,
  version: newVersionString
};

console.log(newPackageJson, "is the draft");

fs.writeFileSync("./package.json", JSON.stringify(newPackageJson, null, " "));
