import { spawnSync } from 'node:child_process';
import path from 'node:path';

const eslint = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'eslint.cmd' : 'eslint',
);

// B0 started at 474 errors, B2 closed at 382 and the final B3 exact-head
// measurement reached 182 while consolidating auth. Later blocks are not
// allowed to give those gains back.
const baseline = {
  errors: 182,
  warnings: 0,
};

const result = spawnSync(
  eslint,
  ['{src,apps,libs,test}/**/*.ts', '--format', 'json'],
  {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0 && result.status !== 1) {
  process.stderr.write(result.stderr ?? '');
  process.stdout.write(result.stdout ?? '');
  console.error(`ESLint infrastructure failed with exit code ${result.status}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch (error) {
  process.stderr.write(result.stderr ?? '');
  console.error('Could not parse ESLint JSON output.', error);
  process.exit(1);
}

const totals = report.reduce(
  (acc, file) => {
    acc.errors += file.errorCount ?? 0;
    acc.warnings += file.warningCount ?? 0;
    acc.fixableErrors += file.fixableErrorCount ?? 0;
    acc.fixableWarnings += file.fixableWarningCount ?? 0;
    return acc;
  },
  { errors: 0, warnings: 0, fixableErrors: 0, fixableWarnings: 0 },
);

console.log('ESLint debt ratchet');
console.log(`errors=${totals.errors} baseline_max=${baseline.errors}`);
console.log(`warnings=${totals.warnings} baseline_max=${baseline.warnings}`);
console.log(`fixable_errors=${totals.fixableErrors}`);

const regressions = [];
if (totals.errors > baseline.errors) {
  regressions.push(
    `errors increased from baseline max ${baseline.errors} to ${totals.errors}`,
  );
}
if (totals.warnings > baseline.warnings) {
  regressions.push(
    `warnings increased from baseline max ${baseline.warnings} to ${totals.warnings}`,
  );
}

if (regressions.length > 0) {
  console.error('Lint debt regressed:');
  for (const regression of regressions) console.error(`- ${regression}`);
  process.exit(1);
}

if (totals.errors < baseline.errors) {
  console.log(
    `Improvement detected: ${baseline.errors - totals.errors} fewer lint errors than the current ratchet.`,
  );
}

console.log(
  'Lint debt did not regress. Existing debt remains visible until later blocks reduce the baseline again.',
);
