/**
 * Formate un nom selon les règles :
 * - Monsieur -> M.
 * - Madame -> Mme
 * - Nom en MAJUSCULE
 * - Prénom en minuscule
 */
export function formatName(name: string | null | undefined): string {
  if (!name) return '';

  // 1. Remplacements de base (Monsieur -> M., Madame -> Mme)
  // On gère aussi les cas déjà abrégés avec ou sans points pour homogénéiser
  let result = name
    .replace(/\bMonsieur\b/gi, 'M.')
    .replace(/\bMadame\b/gi, 'Mme')
    .replace(/\bM\b\s*\./g, 'M.')
    .replace(/\bMme\b\s*\./g, 'Mme')
    .trim();

  // 2. Séparer en mots pour traiter la casse
  // On essaie de détecter le préfixe
  const parts = result.split(/\s+/);
  let prefix = '';
  if (parts.length > 0 && (parts[0] === 'M.' || parts[0] === 'Mme')) {
    prefix = parts.shift() + ' ';
  }

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

    result = `${prefix}${lastName} ${firstName}`.trim();
  } else if (parts.length === 1) {
    // Un seul mot : on le met en majuscule par défaut
    result = `${prefix}${parts[0].toUpperCase()}`.trim();
  }

  return result;
}
