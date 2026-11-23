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
export const CONFIRMED_ALL_CORRECT_QUESTIONS = {
  'hc-ch1-q79': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch1-q122': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch1-q124': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch1-q151': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch1-q187': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch17-q14': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch17-q17': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch17-q24': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch18-q14': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch18-q17': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch18-q24': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch19-q09': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch15-q28': 'QCM du cours : les trois propositions sont justes.',
  'hc-ch16-q05': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch16-q06': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch12-q21': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch12-q56': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch10-q43': 'Corrigé : toutes les propositions sont justes.',
  'hc-ch9-q47': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch8-q45': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch6-q08': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q68': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q69': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q71': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q74': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q75': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q94': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q111': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch5-q115': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch4-q13': 'Corrigé de la banque : toutes les propositions sont justes.',
  'hc-ch3-q16': 'Corrigé de la banque : toutes les propositions sont justes.',
  'hc-ch3-q17': 'Corrigé de la banque : toutes les propositions sont justes.',
  'hc-ch3-q27': 'Corrigé de la banque : toutes les propositions sont justes.',
  'hc-ch3-q33': 'Corrigé de la banque : toutes les propositions sont justes.',
  'hc-ch3-q34': 'Corrigé de la banque : toutes les propositions sont justes.',
  'hc-ch2-q113': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
  'hc-ch1-q202': 'Corrigé imprimé du manuel : toutes les propositions sont justes.',
}
