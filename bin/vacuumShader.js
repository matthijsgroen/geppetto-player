#!/usr/bin/env node

const {
  access: accessCallback,
  constants,
  readFile: readFileCallback,
  writeFile: writeFileCallback,
} = require("fs");
const { basename, extname, dirname, join } = require("path");
const { argv } = require("process");
const util = require("util");

const readFile = util.promisify(readFileCallback);
const writeFile = util.promisify(writeFileCallback);
const access = util.promisify(accessCallback);

const vacuumShader = (shaderSource) =>
  shaderSource
    .split("\n")
    .reduce(
      (result, line) =>
        result +
        (line.startsWith("#define")
          ? (result.endsWith("\n") ? "" : "\n") + `${line}\n`
          : line.trim().split("//")[0]),
      ""
    );

const VALID_EXTENSIONS = [".frag", ".vert", ".vs", ".fs"];

const start = async ([inputFile]) => {
  if (inputFile === undefined) {
    console.error("No input filename provided.");
    process.exit(1);
  }
  try {
    await access(inputFile, constants.R_OK);
  } catch (e) {
    console.error("No permission to read input file, or file does not exist.");
    process.exit(1);
  }

  const extension = extname(inputFile);
  if (!VALID_EXTENSIONS.includes(extension)) {
    console.error(
      `Input file does not seem to be a shader. Extension should be one of ${VALID_EXTENSIONS}`
    );
    process.exit(1);
  }

  const baseName = basename(inputFile, extension);
  const targetFolder = dirname(inputFile);

  const targetFilename = join(targetFolder, `${baseName}-min${extension}`);

  const shaderSource = await readFile(inputFile, "utf8");
  const vacuumed = vacuumShader(shaderSource);

  await writeFile(targetFilename, vacuumed);

  console.log(
    "%s %f%",
    targetFilename,
    Math.round((vacuumed.length / shaderSource.length) * 10000) / 100
  );
};

start(argv.slice(2));
