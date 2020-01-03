import core from "@actions/core";
import github from "@actions/github";
import fs from "fs";
import path from "path";
import packageJson from "../../../package.json";
import tsConfig from "../../../tsconfig.json";
import got from "got";

main().catch(error => {
  core.setFailed(error.message);
});

async function main() {
  const client = new github.GitHub(process.env.GITHUB_TOKEN);

  const files = readFiles("./src");

  const playgroundFiles = {};

  Object.keys(files).forEach(fileName => {
    const playgroundFileName = fileName.slice(process.cwd().length);
    playgroundFiles[playgroundFileName] = { content: files[fileName] };
  });

  const response = await got.post(
    "https://codesandbox.io/api/v1/sandboxes/define",
    {
      responseType: "json",
      json: {
        json: 1,
        files: {
          ...playgroundFiles,
          "tsconfig.json": {
            content: tsConfig
          },
          "package.json": {
            content: {
              main: "./src/playground.html",
              scripts: {
                start: "parcel ./src/playground.html --open",
                build: "parcel build ./src/playground/index.html"
              },
              dependencies: {
                ...packageJson.dependencies,
                "parcel-bundler": "^1.6.1",
                react: "=16.8.6",
                "@types/react": "=16.8.18",
                "react-dom": "=16.8.6",
                "@types/react-dom": "=16.8.4"
              }
            }
          }
        }
      }
    }
  );

  await client.issues.createComment({
    issue_number: github.context.payload.pull_request.number,
    body: `🚀 **PR Environment Ready** → **https://codesandbox.io/s/${response.body.sandbox_id}**`,
    owner: "bradenhs",
    repo: "type-route"
  });
}

function readFiles(directoryName) {
  const fileNameCollection = fs.readdirSync(directoryName);
  const files = {};

  for (const fileName of fileNameCollection) {
    const filePath = path.resolve(directoryName, fileName);

    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      files[filePath] = fs.readFileSync(filePath).toString();
    } else {
      Object.assign(files, readFiles(filePath));
    }
  }

  return files;
}