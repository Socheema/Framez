#!/usr/bin/env node
// Lightweight local validator for app.json / app.config.js
// Ensures minimal required fields exist so you can run an offline validation
const fs = require('fs');
const path = require('path');

function loadAppConfig() {
  const appJsonPath = path.resolve(process.cwd(), 'app.json');
  if (fs.existsSync(appJsonPath)) {
    return JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  }
  // try app.config.js
  const appConfigJs = path.resolve(process.cwd(), 'app.config.js');
  if (fs.existsSync(appConfigJs)) {
    // require may execute code; require it and normalize
    // eslint-disable-next-line global-require
    const mod = require(appConfigJs);
    // if module exports a function, call with empty object
    const cfg = typeof mod === 'function' ? mod({ config: {} }) : mod;
    return cfg.expo || cfg;
  }
  return null;
}

function fail(msg) {
  console.error('✖ validate-app-config:', msg);
  process.exitCode = 2;
}

function ok(msg) {
  console.log('✔', msg);
}

const cfg = loadAppConfig();
if (!cfg) {
  fail('No app.json or app.config.js found');
  process.exit(2);
}

const expo = cfg.expo || cfg;
if (!expo) {
  fail('Missing top-level "expo" object in app.json/app.config.js');
  process.exit(2);
}

// Minimal set of checks (non-exhaustive)
const required = [
  { path: ['name'], msg: 'expo.name is required' },
  { path: ['slug'], msg: 'expo.slug is required' },
];

for (const r of required) {
  let cursor = expo;
  for (const p of r.path) {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, p)) {
      cursor = cursor[p];
    } else {
      fail(r.msg);
      process.exit(2);
    }
  }
  ok(`${r.msg.replace(' is required','')}: ${cursor}`);
}

// Optional: check android package
if (expo.android && expo.android.package) {
  ok(`expo.android.package: ${expo.android.package}`);
} else {
  console.warn('⚠ expo.android.package not found — add it if you intend to build Android');
}

console.log('\nLocal config validator completed (non-exhaustive).');
process.exit(0);
