import fs from "node:fs";
import path from "node:path";

const testRoot = path.resolve("tests");

const testFolders = [
  "e2e",
  "integration"
];

const testFileRegexes = [
  /\.test\.(ts|js|mjs|cjs)$/i,
  /\.spec\.(ts|js|mjs|cjs)$/i,
  /\.e2e\.(ts|js|mjs|cjs)$/i,
  /\.e2e\.test\.(ts|js|mjs|cjs)$/i,
  /\.e2e\.spec\.(ts|js|mjs|cjs)$/i
];

function isTestFile(filename: string) {
  return testFileRegexes.some(regex => regex.test(filename));
}

function countTestsInFile(filePath: string): number {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = content.match(/\b(test|it)\(/g);
  return matches ? matches.length : 0;
}

function scanFolderRecursive(folderPath: string) {
  let result = {
    files: [] as string[],
    fileCount: 0,
    testCount: 0
  };

  if (!fs.existsSync(folderPath)) return result;

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subfolders
      const sub = scanFolderRecursive(fullPath);
      result.files.push(...sub.files);
      result.fileCount += sub.fileCount;
      result.testCount += sub.testCount;
    } else if (entry.isFile() && isTestFile(entry.name)) {
      result.files.push(fullPath);
      result.fileCount++;
      result.testCount += countTestsInFile(fullPath);
    }
  }

  return result;
}

function run() {
  console.log("🔍 TEST STATISTICS\n");

  let totalFiles = 0;
  let totalTests = 0;

  for (const folderName of testFolders) {
    const folderPath = path.join(testRoot, folderName);

    const { fileCount, testCount } = scanFolderRecursive(folderPath);

    console.log(`📁 Folder: ${folderName}`);
    console.log(`   • Test files: ${fileCount}`);
    console.log(`   • Test cases: ${testCount}`);

    totalFiles += fileCount;
    totalTests += testCount;


    console.log(""); 
  }

  console.log("📌 SUMMARY");
  console.log(`   • Total test files: ${totalFiles}`);
  console.log(`   • Total test cases: ${totalTests}`);
}

run();
