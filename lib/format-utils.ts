/**
 * Formate un nom selon les règles :
 * - Monsieur -> M.
 * - Madame -> Mme
 * - Nom en MAJUSCULE
 * - Prénom en minuscule
 */
export function formatName(name: string | null | undefined): string {
  if (!name) return '';

  // 1. Suppression des titres (Monsieur, Madame, M., Mme, etc.)
  let result = name
    .replace(/\b(Monsieur|Madame|monsieur|madame)\b/gi, '')
    .replace(/\b(M|Mme)\b\s*\.?/gi, '') // Supprime M. ou Mme. ou M ou Mme
    .trim();

  // 2. Séparer en mots pour traiter la casse
  const parts = result.split(/\s+/).filter(p => p.length > 0);

  if (parts.length >= 2) {
    // Heuristique pour le nom de famille (souvent le premier mot ou celui déjà en majuscules)
    // On va chercher si un mot est déjà tout en majuscules (et fait plus de 1 lettre)
    const capsParts = parts.filter(p => p.length > 1 && p === p.toUpperCase());

    let lastName = '';
    let firstName = '';

    if (capsParts.length > 0) {
      // On considère que les mots en majuscules sont le NOM
      lastName = parts.filter(p => capsParts.includes(p)).join(' ').toUpperCase();
      firstName = parts.filter(p => !capsParts.includes(p)).join(' ').toLowerCase();
    } else {
      // Par défaut si rien n'est en majuscule : Premier mot = NOM, reste = Prénom
      lastName = parts[0].toUpperCase();
      firstName = parts.slice(1).join(' ').toLowerCase();
    }

    // On s'assure que si firstName existe, on lui met une majuscule au début (Optionnel mais propre)
    // Le user a demandé "prénom en minuscule", on va suivre à la lettre : tout en minuscule.

    result = `${lastName} ${firstName}`.trim();
  } else if (parts.length === 1) {
    // Un seul mot : on le met en majuscule par défaut
    result = `${parts[0].toUpperCase()}`.trim();
  }

  return result;
}

/**
 * Nettoie un numéro CESU :
 * - Commence par Z (insensible à la casse, forcé en majuscule)
 * - Puis uniquement des chiffres
 * - Supprime tout le reste (espaces, autres lettres)
 */
export function cleanCesuNumber(cesu: string | null | undefined): string | null {
  if (!cesu) return null;

  // 1. Extraire la partie commençant par Z
  const match = cesu.match(/Z[\d\s]*/i);
  if (!match) return null;

  // 2. Garder 'Z' + uniquement les chiffres
  const digits = match[0].replace(/\D/g, '');
  return `Z${digits}`;
}
