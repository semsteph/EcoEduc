// =====================================================================
//  Contenu du guide d'utilisation : pour chaque espace, des guides (une
//  tâche chacun), découpés en étapes. Chaque étape a un texte (**gras**
//  permis), des actions pour atteindre l'écran, et l'élément à entourer.
//  Les actions ne valident jamais rien (aucun bouton Enregistrer/Valider).
//  `ordinateur: {...}` / `mobile: {...}` adaptent une étape à un format.
// =====================================================================
const menu = { ouvrirMenu: true };

module.exports = {
  // -------------------------------------------------------------------
  administration: {
    compte: { page: '/administration/connexion', identifiant: 'cocotiers_demo', motDePasse: 'Cocotiers2026' },
    guides: [
      {
        id: 'inscrire-classe', categorie: 'Élèves', icone: 'mdi-account-group',
        titre: 'Inscrire toute une classe d’un coup',
        resume: 'À partir d’un fichier Excel, Word ou d’une liste copiée.',
        etapes: [
          { texte: 'Dans **Élèves → Inscription**, choisissez **Toute une classe**.', actions: [{ aller: '/administration/dashbord/eleves/inscription' }], surligner: 'button:has-text("Toute une classe")' },
          { texte: 'Choisissez la classe, puis **importez votre fichier** (Excel ou Word) ou **collez la liste**. Le parent est facultatif : il pourra être rattaché plus tard.', actions: [{ clic: 'button:has-text("Toute une classe")' }, { clic: 'button:has-text("Coller la liste")' }], surligner: '.v-btn-toggle' },
          { texte: 'Collez une ligne par élève : nom, prénom, date de naissance, sexe (et le téléphone du parent si vous l’avez).', actions: [{ remplir: ['textarea', 'KOFFI Ama 12/03/2014 F 0197000001\nDOSSOU Jean 05/11/2013 M'] }], surligner: 'textarea' },
          { texte: 'Cliquez sur **Lire la liste**, vérifiez le tableau, puis **Inscrire**. Vous pourrez ensuite ajouter les photos de toute la classe.', surligner: 'button:has-text("Lire")' },
        ],
      },
      {
        id: 'rattacher-parent', categorie: 'Élèves', icone: 'mdi-account-supervisor',
        titre: 'Rattacher un parent à un élève',
        resume: 'Pour les élèves inscrits sans parent, ou pour corriger un parent.',
        etapes: [
          { texte: 'Ouvrez **Élèves → Nos élèves**. Le filtre **Sans parent** regroupe les élèves qui n’en ont pas.', actions: [{ aller: '/administration/dashbord/eleves/liste' }], surligner: '.filtres' },
          { texte: 'Touchez l’icône **parent** sur la carte de l’élève.', surligner: '.eleve-card .info-btn' },
          { texte: 'Choisissez un parent **déjà inscrit** (nom, téléphone ou e-mail) ou créez un **nouveau parent**. Les frères et sœurs sans parent sont proposés en même temps.', actions: [{ clic: '.eleve-card .info-btn' }], surligner: '.v-dialog .v-card' },
        ],
      },
      {
        id: 'cartes-scolaires', categorie: 'Élèves', icone: 'mdi-card-account-details',
        titre: 'Photos et cartes scolaires',
        resume: 'Ajouter les photos d’une classe et imprimer les cartes.',
        etapes: [
          { texte: 'Ouvrez **Élèves → Carte Scolaire**. Chaque classe indique combien d’élèves ont une photo.', actions: [{ aller: '/administration/dashbord/eleves/cartes-scolaires' }] },
          { texte: 'Ouvrez une classe : les cartes s’affichent (initiales tant qu’il n’y a pas de photo).', actions: [{ clic: '.v-card:has-text("6ème 1")', attendre: 2500 }] },
          { texte: 'Ajoutez les photos de la classe d’un coup (dossier nommé par élève ou rangé dans l’ordre de la liste), puis imprimez les cartes.', surligner: 'button:has-text("photo")' },
        ],
      },
      {
        id: 'enseignants', categorie: 'Enseignants', icone: 'mdi-human-male-board',
        titre: 'Ajouter un enseignant et lui donner ses classes',
        resume: 'Inscription, identifiants et répartition des classes et matières.',
        astuce: 'Si le professeur enseigne déjà dans une autre école qui utilise l’application (même téléphone ou e-mail), il est simplement ajouté à la vôtre et garde ses identifiants.',
        etapes: [
          { texte: 'Ouvrez **Enseignants** puis **Inscrire Enseignant**.', actions: [{ aller: '/administration/dashbord/enseignants' }], surligner: 'button:has-text("Inscrire Enseignant")' },
          { texte: 'Saisissez le nom, le prénom, l’e-mail et le téléphone. À la validation, un identifiant et un mot de passe provisoire s’affichent : remettez-les au professeur.', actions: [{ clic: 'button:has-text("Inscrire Enseignant")' }], surligner: '.v-dialog .v-card' },
          { texte: 'Avec **Affecter Enseignant**, choisissez ses classes, sa matière et le coefficient.', actions: [{ touche: 'Escape' }], surligner: 'button:has-text("Affecter Enseignant")' },
        ],
      },
      {
        id: 'bulletins', categorie: 'Notes et bulletins', icone: 'mdi-file-document-outline',
        titre: 'Enregistrer et imprimer les bulletins',
        resume: 'Les moyennes, rangs et décisions sont calculés par le logiciel.',
        etapes: [
          { texte: 'Ouvrez **Élèves → Gestion Bulletin** et choisissez la classe.', actions: [{ aller: '/administration/dashbord/eleves/bulletins' }] },
          { texte: 'Cliquez sur **Enregistrer les bulletins**. S’il manque des notes, le message indique quel enseignant doit terminer quoi.', actions: [{ clic: '.v-card:has-text("6ème 1") button:has-text("Ouvrir")', attendre: 4000 }], surligner: 'button:has-text("Enregistrer les bulletins")' },
          { texte: 'Chaque élève a son bulletin : ouvrez-le pour le consulter ou le télécharger en PDF. Les parents le voient dans leur espace.', surligner: '.v-expansion-panels' },
        ],
      },
      {
        id: 'educmaster', categorie: 'Notes et bulletins', icone: 'mdi-transfer-up',
        titre: 'Transférer les notes vers EducMaster',
        resume: 'Remplir automatiquement le fichier d’importation d’EducMaster.',
        etapes: [
          { texte: 'Téléchargez sur EducMaster le fichier d’importation de la classe, puis ouvrez **Élèves → EducMaster**.', actions: [{ aller: '/administration/dashbord/eleves/educmaster' }] },
          { texte: 'Déposez le fichier, cochez les matières et les notes voulues, puis téléchargez : le fichier garde exactement le nom attendu par EducMaster.' },
        ],
      },
      {
        id: 'orientation', categorie: 'Fin d’année', icone: 'mdi-sign-direction',
        titre: 'Orienter les admis de 3ème en 2nde',
        resume: 'Choisir la série de chaque élève selon son vœu.',
        etapes: [
          { texte: 'Après la clôture, ouvrez **Élèves → Orientation en 2nde** (un rappel s’affiche aussi sur le tableau de bord).', actions: [{ aller: '/administration/dashbord/eleves' }], surligner: '.menu-card:has-text("Orientation")' },
          { texte: 'Cochez les élèves, choisissez la **série**, puis **Orienter** : ils sont répartis dans les classes de cette série les moins remplies.', actions: [{ aller: '/administration/dashbord/eleves/orientation' }] },
        ],
      },
      {
        id: 'cloture', categorie: 'Fin d’année', icone: 'mdi-lock-check-outline',
        titre: 'Clôturer l’année scolaire',
        resume: 'Passage des élèves, sortants, nouvelle année : tout est vérifié avant.',
        astuce: 'Une clôture faite par erreur peut être annulée tant que rien n’a été fait dans la nouvelle année.',
        etapes: [
          { texte: 'Ouvrez **Paramètres → Clôture**. Vérifiez l’effectif maximum par classe et la création automatique des classes.', actions: [{ aller: '/administration/dashbord/parametres?onglet=cloture' }] },
          { texte: 'Cliquez sur **Clôturer l’année** : un rapport s’affiche, rien n’est encore appliqué.', surligner: 'button:has-text("Clôturer l’année")' },
          { texte: 'Lisez le rapport : ce qui bloque (avec un bouton pour corriger), la répartition des admis, les redoublants avec leur moyenne, les fins de cycle.', actions: [{ clic: 'button:has-text("Clôturer l’année")', attendre: 6000 }] },
          { texte: 'Si tout est prêt, **Valider définitivement**, puis tapez le nom de l’année pour confirmer.', surligner: 'button:has-text("Valider définitivement")' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------
  enseignant: {
    compte: { page: '/professeurs/connexion', identifiant: 'sylvie.hounsou1', motDePasse: 'Prof2026!' },
    guides: [
      {
        id: 'notes', categorie: 'Notes', icone: 'mdi-book-open-page-variant',
        titre: 'Saisir les notes et valider les moyennes',
        resume: 'Saisie à l’écran, enregistrement, puis validation.',
        astuce: 'Tous les élèves doivent avoir une note dans chaque colonne utilisée : donnez 00 à un absent. Une case vide bloque la validation.',
        etapes: [
          { texte: 'Dans le menu, choisissez votre **matière**, puis la **classe**, puis **Notes**.', actions: [{ aller: '/professeurs/dashbord/matieres/42/classes/75/notes', attendre: 3500 }] },
          { texte: 'Choisissez la **période**, tapez les notes (0 à 20) et passez à la ligne suivante avec Entrée. Sur téléphone, choisissez une colonne à la fois.', surligner: '.responsive-table' },
          { texte: 'Cliquez sur **Enregistrer les notes**.', surligner: 'button:has-text("Enregistrer les notes")' },
          { texte: 'Quand toute la classe a ses notes, **Valider les moyennes** : elles partent dans les bulletins. Une note validée ne se modifie plus que sur demande à l’administration.', surligner: 'button:has-text("Valider les moyennes")' },
        ],
      },
      {
        id: 'import-excel', categorie: 'Notes', icone: 'mdi-file-excel',
        titre: 'Importer des notes depuis Excel',
        resume: 'Télécharger le modèle, le remplir, l’importer.',
        etapes: [
          { texte: 'Dans l’écran des notes, ouvrez le menu **⋮** puis **Télécharger le modèle Excel** et remplissez la colonne Note.', actions: [{ aller: '/professeurs/dashbord/matieres/42/classes/75/notes', attendre: 3500 }, { clic: 'button[aria-label="Plus d\'actions"]' }], surligner: '.v-overlay--active .v-list' },
          { texte: 'Choisissez **Importer un fichier Excel**, le type de note (Inter 1, Devoir 1…) et le fichier. Une note déjà présente n’est jamais remplacée ; le bilan liste les élèves restés sans note.', actions: [{ clic: '.v-overlay--active .v-list-item:has-text("Importer")' }], surligner: '.v-dialog .v-card' },
        ],
      },
      {
        id: 'appel', categorie: 'Présences', icone: 'mdi-calendar-check-outline',
        titre: 'Faire l’appel',
        resume: 'Tout le monde est présent par défaut : un toucher par absent.',
        etapes: [
          { texte: 'Dans la classe, ouvrez **Présences**. Vérifiez la date de l’appel.', actions: [{ aller: '/professeurs/dashbord/matieres/42/classes/75/presences', attendre: 3500 }], surligner: '.appel-head' },
          { texte: 'Touchez le bouton d’un élève pour le marquer **Absent** (un second toucher : Permissionnaire). Un élève qui a une permission accordée est marqué d’office.', surligner: '.appel-ligne .appel-statut' },
          { texte: 'Cliquez sur **Enregistrer l’appel**. Les parents des absents sont prévenus.', surligner: '.appel-enregistrer' },
        ],
      },
      {
        id: 'demande-modification', categorie: 'Notes', icone: 'mdi-shield-alert-outline',
        titre: 'Modifier une note déjà validée',
        resume: 'La demande est envoyée à l’administration.',
        etapes: [
          { texte: 'Dans l’écran des notes, une note validée porte un **cadenas**. Cliquez dessus.', actions: [{ aller: '/professeurs/dashbord/matieres/42/classes/75/notes', attendre: 3500 }], surligner: '.locked-cell' },
          { texte: 'Indiquez la nouvelle note (ou laissez vide pour la supprimer) et le motif, puis **Envoyer la demande**. La réponse arrive dans vos notifications.', actions: [{ clic: '.locked-cell' }], surligner: '.v-dialog .v-card' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------
  parent: {
    compte: { page: '/parents/connexion', identifiant: 'parent.cocotiers', motDePasse: 'Parent2026!', etablissement: 'CEG Les Cocotiers' },
    guides: [
      {
        id: 'connexion', categorie: 'Démarrer', icone: 'mdi-login',
        titre: 'Se connecter ou activer mon compte',
        resume: 'Première connexion et connexions suivantes.',
        etapes: [
          { texte: 'Sur la page **Espace parents**, choisissez l’établissement, tapez votre identifiant (ou votre e-mail) et votre mot de passe.', actions: [{ aller: '/parents/connexion' }], surligner: 'form' },
          { texte: 'Première fois ? Si votre compte n’est pas encore activé, cliquez sur **Activer mon compte** : un code est envoyé à votre e-mail. Sans e-mail, l’école vous remet un identifiant et un mot de passe.' },
        ],
      },
      {
        id: 'alertes-telephone', categorie: 'Notifications', icone: 'mdi-cellphone-message',
        titre: 'Recevoir les alertes sur mon téléphone',
        resume: 'Être prévenu d’une absence ou d’un bulletin, même application fermée.',
        astuce: 'Sur iPhone : dans Safari, touchez Partager puis « Sur l’écran d’accueil », ouvrez l’application depuis l’icône, puis activez. Sur Android, utilisez Chrome.',
        etapes: [
          { texte: 'Ouvrez **Notifications** (la cloche en haut).', actions: [{ aller: '/parents/dashbord/notifications', attendre: 3000 }], surligner: 'button[aria-label="Notifications"]' },
          { texte: 'Dans **Notifications sur ce téléphone**, touchez **Activer** et acceptez. Une notification d’essai arrive.', surligner: '.alertes-carte' },
          { texte: 'Si l’école envoie des SMS, vous pouvez les couper ou les remettre avec l’interrupteur **SMS de l’école**.' },
        ],
      },
      {
        id: 'absence', categorie: 'Notifications', icone: 'mdi-account-off-outline',
        titre: 'Justifier une absence',
        resume: 'Indiquer à l’école la raison d’une absence.',
        etapes: [
          { texte: 'Une absence de votre enfant apparaît dans **Notifications** (et sur votre téléphone si vous avez activé les alertes).', actions: [{ aller: '/parents/dashbord/notifications', attendre: 3000 }], surligner: '.notif.t-absence' },
          { texte: 'Touchez **Justifier l’absence**, écrivez la raison (maladie, rendez-vous…) et **Envoyer** : l’école la reçoit.', surligner: '.notif.t-absence button:has-text("Justifier")' },
        ],
      },
      {
        id: 'permission', categorie: 'Scolarité', icone: 'mdi-calendar-check-outline',
        titre: 'Demander une permission d’absence',
        resume: 'Une journée, plusieurs jours ou quelques heures.',
        etapes: [
          { texte: 'Dans la page de l’enfant, ouvrez **Permission** puis **Ajouter une permission**.', actions: [{ aller: '/parents/dashbord/enfants/marie-esther/permission', attendre: 3500 }], surligner: 'button:has-text("Ajouter une permission")' },
          { texte: 'Choisissez **une journée**, **plusieurs jours** ou **quelques heures**, la date, le motif et votre téléphone, puis **Envoyer la demande**. La réponse de l’école vous est notifiée.', actions: [{ clic: 'button:has-text("Ajouter une permission")' }], surligner: '.v-dialog .v-card' },
        ],
      },
    ],
  },
};
