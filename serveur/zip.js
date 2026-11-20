// Création d'un fichier .zip (sans dépendance) : en-têtes locaux + répertoire central.
// Utilise zlib (inclus dans Node) pour la compression et le calcul CRC-32.
import zlib from 'node:zlib';

const dateDos = (d = new Date()) => ({
  heure: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  jour: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

/** @param {{ nom: string, contenu: string|Buffer }[]} fichiers */
export function creerZip(fichiers) {
  const { heure, jour } = dateDos();
  const locaux = [];
  const central = [];
  let position = 0;
  for (const f of fichiers) {
    const nom = Buffer.from(f.nom, 'utf8');
    const donnees = Buffer.isBuffer(f.contenu) ? f.contenu : Buffer.from(f.contenu, 'utf8');
    const compresse = zlib.deflateRawSync(donnees, { level: 9 });
    const crc = zlib.crc32(donnees);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version nécessaire
    local.writeUInt16LE(0x0800, 6); // noms en UTF-8
    local.writeUInt16LE(8, 8); // compression « deflate »
    local.writeUInt16LE(heure, 10);
    local.writeUInt16LE(jour, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compresse.length, 18);
    local.writeUInt32LE(donnees.length, 22);
    local.writeUInt16LE(nom.length, 26);
    locaux.push(local, nom, compresse);

    const entree = Buffer.alloc(46);
    entree.writeUInt32LE(0x02014b50, 0);
    entree.writeUInt16LE(20, 4);
    entree.writeUInt16LE(20, 6);
    entree.writeUInt16LE(0x0800, 8);
    entree.writeUInt16LE(8, 10);
    entree.writeUInt16LE(heure, 12);
    entree.writeUInt16LE(jour, 14);
    entree.writeUInt32LE(crc, 16);
    entree.writeUInt32LE(compresse.length, 20);
    entree.writeUInt32LE(donnees.length, 24);
    entree.writeUInt16LE(nom.length, 28);
    entree.writeUInt32LE(position, 42);
    central.push(entree, nom);
    position += local.length + nom.length + compresse.length;
  }
  const repertoire = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(fichiers.length, 8);
  fin.writeUInt16LE(fichiers.length, 10);
  fin.writeUInt32LE(repertoire.length, 12);
  fin.writeUInt32LE(position, 16);
  return Buffer.concat([...locaux, repertoire, fin]);
}
