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

const baseline = {
  maxFailedSuites: 7,
  minPassedSuites: 5,
  minTotalSuites: 12,
  maxFailedTests: 7,
  minPassedTests: 13,
  minTotalTests: 20,
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

console.log('Unit-test debt ratchet');
console.log(
  `failed_suites=${actual.failedSuites} baseline_max=${baseline.maxFailedSuites}`,
);
console.log(
  `passed_suites=${actual.passedSuites} baseline_min=${baseline.minPassedSuites}`,
);
console.log(
  `total_suites=${actual.totalSuites} baseline_min=${baseline.minTotalSuites}`,
);
console.log(
  `failed_tests=${actual.failedTests} baseline_max=${baseline.maxFailedTests}`,
);
console.log(
  `passed_tests=${actual.passedTests} baseline_min=${baseline.minPassedTests}`,
);
console.log(
  `total_tests=${actual.totalTests} baseline_min=${baseline.minTotalTests}`,
);

const regressions = [];
if (actual.failedSuites > baseline.maxFailedSuites) {
  regressions.push(
    `failed suites increased from baseline max ${baseline.maxFailedSuites} to ${actual.failedSuites}`,
  );
}
if (actual.passedSuites < baseline.minPassedSuites) {
  regressions.push(
    `passed suites dropped below baseline min ${baseline.minPassedSuites} to ${actual.passedSuites}`,
  );
}
if (actual.totalSuites < baseline.minTotalSuites) {
  regressions.push(
    `total suites dropped below baseline min ${baseline.minTotalSuites} to ${actual.totalSuites}`,
  );
}
if (actual.failedTests > baseline.maxFailedTests) {
  regressions.push(
    `failed tests increased from baseline max ${baseline.maxFailedTests} to ${actual.failedTests}`,
  );
}
if (actual.passedTests < baseline.minPassedTests) {
  regressions.push(
    `passed tests dropped below baseline min ${baseline.minPassedTests} to ${actual.passedTests}`,
  );
}
if (actual.totalTests < baseline.minTotalTests) {
  regressions.push(
    `total tests dropped below baseline min ${baseline.minTotalTests} to ${actual.totalTests}`,
  );
}

if (regressions.length > 0) {
  console.error('Unit-test baseline regressed:');
  for (const regression of regressions) console.error(`- ${regression}`);
  process.exit(1);
}

if (result.status === 0) {
  console.log(
    'Historical unit suite is fully green; the ratchet can be tightened to a normal test gate.',
  );
} else {
  console.log(
    'Known historical unit failures remain, but the B3 baseline did not regress.',
  );
}
