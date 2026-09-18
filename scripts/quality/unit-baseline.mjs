import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const jest = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'jest.cmd' : 'jest',
);

const outputFile = path.join(
  os.tmpdir(),
  `ecommerce-nestjs-jest-${process.pid}-${Date.now()}.json`,
);

// B5 repaired the remaining historical Products/Categories scaffold suites.
// Unit coverage is now a normal zero-failure gate. New tests are welcome;
// later blocks may not reduce the verified suite/test counts.
const baseline = {
  minPassedSuites: 14,
  minTotalSuites: 14,
  minPassedTests: 38,
  minTotalTests: 38,
};

const result = spawnSync(
  jest,
  ['--runInBand', '--json', `--outputFile=${outputFile}`],
  {
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  },
);

process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (!fs.existsSync(outputFile)) {
  console.error(`Jest did not write its JSON result file (exit=${result.status}).`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
} catch (error) {
  console.error('Could not parse Jest JSON output.', error);
  process.exit(1);
} finally {
  fs.rmSync(outputFile, { force: true });
}

const actual = {
  failedSuites: report.numFailedTestSuites ?? 0,
  passedSuites: report.numPassedTestSuites ?? 0,
  totalSuites: report.numTotalTestSuites ?? 0,
  failedTests: report.numFailedTests ?? 0,
  passedTests: report.numPassedTests ?? 0,
  totalTests: report.numTotalTests ?? 0,
};

console.log('Unit-test gate');
console.log(`failed_suites=${actual.failedSuites} expected=0`);
console.log(
  `passed_suites=${actual.passedSuites} baseline_min=${baseline.minPassedSuites}`,
);
console.log(
  `total_suites=${actual.totalSuites} baseline_min=${baseline.minTotalSuites}`,
);
console.log(`failed_tests=${actual.failedTests} expected=0`);
console.log(
  `passed_tests=${actual.passedTests} baseline_min=${baseline.minPassedTests}`,
);
console.log(
  `total_tests=${actual.totalTests} baseline_min=${baseline.minTotalTests}`,
);

const regressions = [];
if (result.status !== 0 || actual.failedSuites !== 0 || actual.failedTests !== 0) {
  regressions.push('the unit suite is no longer fully green');
}
if (actual.passedSuites < baseline.minPassedSuites) {
  regressions.push(
    `passed suites dropped below ${baseline.minPassedSuites} to ${actual.passedSuites}`,
  );
}
if (actual.totalSuites < baseline.minTotalSuites) {
  regressions.push(
    `total suites dropped below ${baseline.minTotalSuites} to ${actual.totalSuites}`,
  );
}
if (actual.passedTests < baseline.minPassedTests) {
  regressions.push(
    `passed tests dropped below ${baseline.minPassedTests} to ${actual.passedTests}`,
  );
}
if (actual.totalTests < baseline.minTotalTests) {
  regressions.push(
    `total tests dropped below ${baseline.minTotalTests} to ${actual.totalTests}`,
  );
}

if (regressions.length > 0) {
  console.error('Unit-test contract regressed:');
  for (const regression of regressions) console.error(`- ${regression}`);
  process.exit(1);
}

console.log('Unit suite is fully green and meets the B5 coverage-count floor.');
