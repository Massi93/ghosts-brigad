/**
 * Change le mot de passe du cockpit.
 * Usage : npm run cockpit:password -- "nouveau-mot-de-passe" [utilisateur]
 */
import { openDatabase } from "../db/index.js";
import { setAdminPassword } from "../auth/admins.js";
import { config } from "../config.js";

const [password, username = config.admin.username] = process.argv.slice(2);

if (!password || password.length < 8) {
  console.error('Usage : npm run cockpit:password -- "nouveau-mot-de-passe" [utilisateur]');
  console.error("Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}

openDatabase();
await setAdminPassword(username, password);
console.log(`Mot de passe de « ${username} » mis à jour. Les sessions ouvertes ont été fermées.`);
