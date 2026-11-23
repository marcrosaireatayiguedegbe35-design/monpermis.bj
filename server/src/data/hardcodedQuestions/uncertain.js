/**
 * Questions explicitement signalées comme NON SÛRES (réponse à confirmer, énoncé douteux…).
 * Elles ne sont proposées à aucun apprenant tant qu'elles figurent ici. Retirer la ligne une fois la
 * question vérifiée la remet en service. Clé = identifiant de question (hc-chN-qNN).
 */
export const UNCERTAIN_QUESTIONS = {
  // vide — hc-ch15-q07 validée : parmi les options (0,6 / 0,4 / 1), 0,6 g/L est le premier
  // seuil au-dessus de la limite légale Bénin (0,5 g/L). Le seuil « 0,8 g/L » n’est pas proposé.
}

/**
 * QCM où toutes les options sont volontairement justes (vérifié manuellement).
 * Sans cette liste, le filtre « toutes bonnes » les exclurait des sujets / examens.
 */
export const CONFIRMED_ALL_CORRECT_QUESTIONS = {}
