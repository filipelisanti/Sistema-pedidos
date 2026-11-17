/**
 * Corre antes de cada archivo de test: hace que la app use la base de TEST.
 * Así los tests nunca tocan los datos de la base de desarrollo.
 */
import 'dotenv/config';

const urlTest = process.env.DATABASE_URL_TEST;
if (!urlTest) {
  throw new Error('Falta DATABASE_URL_TEST (ver apps/api/.env.example)');
}
process.env.DATABASE_URL = urlTest;
