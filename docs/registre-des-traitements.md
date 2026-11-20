# Registre des activités de traitement — L'Atelier

*Article 30 du RGPD. Document interne tenu par le responsable du traitement. Dernière mise à jour : 20 novembre 2026.*

**Responsable du traitement** : Jules_LFL (particulier, mentorat bénévole), contact : jules.lfl.pro@proton.me
**Délégué à la protection des données** : aucun (non obligatoire).

---

## Traitement n° 1 — Fourniture de l'atelier et suivi pédagogique des élèves

| Rubrique | Contenu |
|---|---|
| Finalités | Fournir l'atelier d'apprentissage (enregistrer le travail, la progression) ; permettre au mentor d'assurer le suivi pédagogique ; publier le site de l'élève à sa demande. |
| Base légale | Intérêt légitime (art. 6.1.f) : mentorat demandé par la famille. Les parents sont informés (page `/parents`, date notée dans le panneau) et peuvent s'opposer à tout moment. Publication : à la demande de l'élève (case dans son atelier) + relecture du mentor. |
| Personnes concernées | Élèves (mineurs, collège), accompagnés par le mentor. |
| Données | Pseudo ; empreinte HMAC du code d'accès ; code HTML/CSS/JS et 60 versions ; missions réussies, indices, badges, résultats de quiz ; dates et durée des séances ; messages et notes du mentor ; site publié, nombre de visites, présence en vitrine ; dates d'acceptation de la charte, d'information des parents, d'accord de publication et de vitrine. **Aucune** donnée d'identité civile, de contact ni sensible. |
| Destinataires | Le mentor uniquement. Site publié : public pour qui a l'adresse (non indexé). Vitrine : publique, seulement avec l'accord de l'élève. |
| Sous-traitants | Cloudflare, Inc. (acheminement, États-Unis, EU-US DPF). Discord Inc. (alertes au mentor : pseudo + événement, États-Unis, EU-US DPF), si activé. |
| Transferts hors UE | Cloudflare et Discord (cadre EU-US Data Privacy Framework). |
| Durées | Jusqu'à la fin du mentorat ou demande de suppression ; comptes inactifs depuis plus d'un an supprimés (rappel automatique dans le panneau et sur Discord). Versions : 60 dernières. Sauvegardes : 14 jours. |
| Sécurité | HTTPS ; cookies HttpOnly/Secure/SameSite=Strict ; codes hachés ; limites d'essais (par IP et globales) ; code des élèves isolé (iframe sandbox, CSP sandbox) ; sauvegardes chiffrées AES-256-GCM, vérifiées, sans accès web ; conteneur non-root en lecture seule ; hébergement en France. |
| Droits | Accès, rectification, effacement, limitation, opposition, portabilité : par e-mail, réponse sous un mois. Export JSON complet depuis le panneau mentor (onglet Accès). |

## Traitement n° 2 — Mesure d'audience anonyme des sites publiés

| Rubrique | Contenu |
|---|---|
| Finalité | Afficher à l'élève le nombre de visites de son site. |
| Base légale | Intérêt légitime (art. 6.1.f), mesure d'audience anonyme. |
| Personnes concernées | Visiteurs des sites publiés. |
| Données | Aucune donnée conservée : empreinte salée (IP + navigateur + sel du jour) **en mémoire vive** jusqu'au lendemain, pour éviter les doublons. Seul un compteur total est enregistré. |
| Durées | Empreintes : 24 h maximum, jamais écrites sur disque. |

## Traitement n° 3 — Sécurité du service

| Rubrique | Contenu |
|---|---|
| Finalité | Bloquer les tentatives de connexion en rafale. |
| Base légale | Intérêt légitime (art. 6.1.f). |
| Données | Adresse IP et nombre d'essais, **en mémoire vive** uniquement. |
| Durées | 30 minutes maximum, jamais écrites sur disque. |
| Sous-traitant | Cloudflare (traite les IP pour acheminer et protéger le trafic). |
