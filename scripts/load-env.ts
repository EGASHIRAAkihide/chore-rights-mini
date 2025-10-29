import 'dotenv/config';

import { config } from 'dotenv';
import { resolve } from 'path';

const root = process.cwd();

function loadEnvFile(filename: string) {
  config({
    path: resolve(root, filename),
    override: false,
  });
}

loadEnvFile('.env.local');
loadEnvFile('.env.test.local');
