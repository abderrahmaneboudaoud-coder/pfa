import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, LevelFormat, PageBreak, PageNumber, Header, Footer,
  TabStopType, TabStopPosition
} from "docx";

import fs from "fs";

// ─────────────── helpers ───────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function cell(text, opts = {}) {
  const {
    bold = false, shade = null, width = 1872, align = AlignmentType.LEFT,
    italic = false, fontSize = 19, color = "000000", vAlign = VerticalAlign.CENTER
  } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    verticalAlign: vAlign,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, italic, size: fontSize, color, font: "Arial" })]
    })]
  });
}

function hCell(text, width = 1872) {
  return cell(text, { bold: true, shade: "1F4E79", width, color: "FFFFFF", fontSize: 19 });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: "1F4E79" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: "2E75B6" })]
  });
}

function para(text, opts = {}) {
  const { bold = false, italic = false, color = "000000", size = 20, spacing = { before: 60, after: 60 } } = opts;
  return new Paragraph({
    spacing,
    children: [new TextRun({ text, bold, italic, color, size, font: "Arial" })]
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, bold, size: 20, font: "Arial" })]
  });
}

function spacer(n = 1) {
  return Array(n).fill(new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun("")] }));
}

// ─────────────── document ───────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F4E79" },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1F4E79", space: 1 } },
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({ text: "Rapport AGILE — Application Web Saisie des Notes   |   ENSIAS", size: 18, color: "444444", font: "Arial" }),
            new TextRun({ text: "\t2024-2025", size: 18, color: "444444", font: "Arial" })
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: 9026 }]
        })]
      })
    },
    children: [

      // ══════════════════════════════════════════
      // PAGE DE GARDE
      // ══════════════════════════════════════════
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 120 },
        children: [new TextRun({ text: "ENSIAS", bold: true, size: 48, font: "Arial", color: "1F4E79" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: "École Nationale Supérieure d'Informatique et d'Analyse des Systèmes", size: 22, font: "Arial", color: "444444" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: "Rapport de Projet", bold: true, size: 36, font: "Arial", color: "2E75B6" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "Méthodologie Agile — Scrum", bold: true, size: 30, font: "Arial", color: "1F4E79" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: "Application Web pour la Saisie des Notes", size: 26, font: "Arial", color: "000000" })]
      }),

      new Table({
        width: { size: 7500, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        columnWidths: [2000, 5500],
        rows: [
          new TableRow({ children: [hCell("Équipe", 2000), cell("Abderrahmane (Product Owner)\nTarik (Scrum Master)\nAmjad (Développeur)\nMohamed (Développeur)", { width: 5500 })] }),
          new TableRow({ children: [hCell("Module", 2000), cell("Méthodologie Agile", { width: 5500 })] }),
          new TableRow({ children: [hCell("Durée", 2000), cell("2 Sprints d'une semaine chacun", { width: 5500 })] }),
          new TableRow({ children: [hCell("Année", 2000), cell("2024 - 2025", { width: 5500 })] }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ══════════════════════════════════════════
      // 1. PRÉSENTATION
      // ══════════════════════════════════════════
      h1("1. Présentation du projet"),
      para("Ce projet s'inscrit dans le cadre du module Méthodologie Agile. Il consiste à développer une application web pour la saisie et la consultation des notes au sein d'un établissement d'enseignement supérieur (ENSIAS). Le développement a été réalisé en suivant la méthodologie Scrum, avec 2 sprints d'une semaine chacun."),

      // ══════════════════════════════════════════
      // 2. USER STORIES
      // ══════════════════════════════════════════
      h1("2. Liste des User Stories"),

      h2("2.1 Administrateur"),
      bullet("En tant qu'administrateur, je peux créer un compte enseignant (avec envoi automatique du mot de passe par e-mail) afin de lui permettre d'accéder à la plateforme."),
      bullet("En tant qu'administrateur, je peux créer un compte étudiant (avec matricule auto-incrémenté et envoi du mot de passe par e-mail) afin de lui permettre d'accéder à son espace personnel."),
      bullet("En tant qu'administrateur, je peux importer plusieurs étudiants en masse via un fichier CSV (format : nom, prénom, e-mail) afin d'accélérer l'inscription des promotions."),
      bullet("En tant qu'administrateur, je peux consulter, modifier, supprimer ou débloquer un compte étudiant afin de maintenir le référentiel à jour."),
      bullet("En tant qu'administrateur, je peux ajouter une classe (identifiée par année universitaire, niveau, spécialité, nombre de groupes) afin d'organiser les promotions."),
      bullet("En tant qu'administrateur, je peux affecter des étudiants à une classe et à un groupe (avec auto-complétion à partir de 3 caractères, insensible à la casse) afin d'organiser les promotions."),
      bullet("En tant qu'administrateur, je peux ajouter et gérer des matières (code + intitulé) afin de constituer le référentiel pédagogique."),
      bullet("En tant qu'administrateur, je peux planifier les matières par semestre, classe et groupe, et associer un enseignant à chaque matière, afin d'organiser le programme pédagogique."),

      h2("2.2 Enseignant"),
      bullet("En tant qu'enseignant, je peux me connecter à la plateforme afin d'accéder à mon espace de travail."),
      bullet("En tant qu'enseignant, je peux consulter les classes et groupes qui me sont affectés afin de préparer mes cours."),
      bullet("En tant qu'enseignant, je peux saisir les notes d'un groupe (TPs, Projet, Contrôle, Examen) avec calcul automatique de la moyenne, afin d'évaluer les étudiants."),
      bullet("En tant qu'enseignant, je peux modifier des notes déjà saisies afin de corriger d'éventuelles erreurs."),

      h2("2.3 Étudiant"),
      bullet("En tant qu'étudiant, je peux me connecter à la plateforme afin d'accéder à mon espace personnel."),
      bullet("En tant qu'étudiant, je peux consulter mes notes par module (TPs, Projet, Contrôle, Examen, Moyenne) pour un semestre donné afin de suivre mes résultats."),
      bullet("En tant qu'étudiant, je peux consulter ma moyenne de semestre afin d'évaluer ma performance globale."),
      bullet("En tant qu'étudiant, je peux consulter mon inscription (classe et groupe) afin de connaître mon affectation."),

      h2("2.4 Transversal — Sécurité"),
      bullet("En tant que système, les mots de passe doivent être stockés sous forme de hash SHA-256 (jamais en clair) afin de garantir la sécurité des comptes."),

      // ══════════════════════════════════════════
      // 3. ÉQUIPE
      // ══════════════════════════════════════════
      h1("3. Équipe et rôles Scrum"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2500, 1700, 4826],
        rows: [
          new TableRow({ children: [hCell("Membre", 2500), hCell("Rôle", 1700), hCell("Responsabilités", 4826)] }),
          new TableRow({ children: [cell("BOUDAOUD Abderrahmane", { bold: true, width: 2500 }), cell("Product Owner", { width: 1700 }), cell("Définition des User Stories, gestion et priorisation du backlog, validation des livrables", { width: 4826 })] }),
          new TableRow({ children: [cell("Tarik", { bold: true, width: 2500 }), cell("Scrum Master", { width: 1700 }), cell("Animation des daily meetings, suivi du tableau Scrum, levée des obstacles, gestion du burndown chart", { width: 4826 })] }),
          new TableRow({ children: [cell("EL ASSOULI Amjad", { bold: true, width: 2500 }), cell("Développeur", { width: 1700 }), cell("Développement back-end, conception et gestion de la base de données, requêtes SQL, sécurité (hachage SHA-256)", { width: 4826 })] }),
          new TableRow({ children: [cell("Mohamed", { bold: true, width: 2500 }), cell("Développeur", { width: 1700 }), cell("Développement front-end, conception des interfaces, auto-complétion, import CSV, tests d'affichage et d'intégration", { width: 4826 })] }),
        ]
      }),

      // ══════════════════════════════════════════
      // 4. BACKLOG
      // ══════════════════════════════════════════
      h1("4. Backlog priorisé"),

      h2("4.1 Grille de priorisation MoSCoW"),
      para("La priorisation a été réalisée selon la méthode MoSCoW (Must Have, Should Have, Could Have, Won't Have). Les fonctionnalités de consultation ont été priorisées avant les fonctionnalités de saisie ou d'administration. Les fonctionnalités techniques (sécurité SHA-256, import CSV, auto-complétion) ont été intégrées aux US concernées pour rester réalistes sur le périmètre de deux sprints d'une semaine."),

      ...spacer(1),

      para("Critères de priorisation :", { bold: true }),
      bullet("Must Have : fonctionnalité essentielle sans laquelle l'application ne peut pas fonctionner."),
      bullet("Should Have : fonctionnalité importante, valeur significative mais non bloquante."),
      bullet("Could Have : fonctionnalité utile, réalisée si le temps le permet."),
      bullet("Won't Have (this time) : reportée hors périmètre des deux sprints."),

      ...spacer(1),

      // Backlog table — 9026 total — cols: ID(700) US(3400) SP(500) Prio(1200) Sprint(800) Justif(2426)
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [700, 3400, 500, 1200, 800, 2426],
        rows: [
          new TableRow({ children: [hCell("ID", 700), hCell("User Story", 3400), hCell("SP", 500), hCell("Priorité", 1200), hCell("Sprint", 800), hCell("Justification", 2426)] }),

          // ── Sprint 1 ──
          new TableRow({ children: [
            cell("S1", { width: 700, shade: "EBF3FB" }), cell("Se connecter (étudiant)", { width: 3400, shade: "EBF3FB" }), cell("3", { width: 500, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("Could Have", { width: 1200, shade: "EBF3FB" }), cell("Sprint 1", { width: 800, shade: "EBF3FB" }), cell("Prérequis pour démonstration", { width: 2426, shade: "EBF3FB" })
          ]}),
          new TableRow({ children: [
            cell("E1", { width: 700 }), cell("Se connecter (enseignant)", { width: 3400 }), cell("3", { width: 500, align: AlignmentType.CENTER }), cell("Could Have", { width: 1200 }), cell("Sprint 1", { width: 800 }), cell("Prérequis pour démonstration", { width: 2426 })
          ]}),
          new TableRow({ children: [
            cell("A1", { width: 700, shade: "EBF3FB" }), cell("Créer compte enseignant + envoi mot de passe par e-mail", { width: 3400, shade: "EBF3FB" }), cell("3", { width: 500, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("Should Have", { width: 1200, shade: "EBF3FB" }), cell("Sprint 1", { width: 800, shade: "EBF3FB" }), cell("Valeur ajoutée importante", { width: 2426, shade: "EBF3FB" })
          ]}),
          new TableRow({ children: [
            cell("A2", { width: 700 }), cell("Créer compte étudiant + matricule auto + envoi mot de passe", { width: 3400 }), cell("3", { width: 500, align: AlignmentType.CENTER }), cell("Should Have", { width: 1200 }), cell("Sprint 1", { width: 800 }), cell("Valeur ajoutée importante", { width: 2426 })
          ]}),
          new TableRow({ children: [
            cell("SEC1", { width: 700, shade: "EBF3FB" }), cell("Hachage des mots de passe SHA-256 (stockage sécurisé)", { width: 3400, shade: "EBF3FB" }), cell("2", { width: 500, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("Must Have", { width: 1200, shade: "EBF3FB" }), cell("Sprint 1", { width: 800, shade: "EBF3FB" }), cell("Exigence de sécurité non négociable", { width: 2426, shade: "EBF3FB" })
          ]}),
          new TableRow({ children: [
            cell("S4", { width: 700 }), cell("Consulter son inscription (classe et groupe)", { width: 3400 }), cell("2", { width: 500, align: AlignmentType.CENTER }), cell("Must Have", { width: 1200 }), cell("Sprint 1", { width: 800 }), cell("Fonctionnalité essentielle étudiant", { width: 2426 })
          ]}),
          new TableRow({ children: [
            cell("E2", { width: 700, shade: "EBF3FB" }), cell("Consulter les classes et groupes affectés (enseignant)", { width: 3400, shade: "EBF3FB" }), cell("3", { width: 500, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("Must Have", { width: 1200, shade: "EBF3FB" }), cell("Sprint 1", { width: 800, shade: "EBF3FB" }), cell("Fonctionnalité essentielle", { width: 2426, shade: "EBF3FB" })
          ]}),
          new TableRow({ children: [
            cell("S2", { width: 700 }), cell("Consulter notes par module (bulletin avec TPs, Projet, CC, Exam)", { width: 3400 }), cell("5", { width: 500, align: AlignmentType.CENTER }), cell("Must Have", { width: 1200 }), cell("Sprint 1", { width: 800 }), cell("Cœur de valeur pour l'étudiant", { width: 2426 })
          ]}),
          new TableRow({ children: [
            cell("S3", { width: 700, shade: "EBF3FB" }), cell("Consulter les moyennes par semestre (calcul automatique)", { width: 3400, shade: "EBF3FB" }), cell("5", { width: 500, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("Must Have", { width: 1200, shade: "EBF3FB" }), cell("Sprint 1", { width: 800, shade: "EBF3FB" }), cell("Fonctionnalité essentielle", { width: 2426, shade: "EBF3FB" })
          ]}),
          new TableRow({ children: [
            cell("E5", { width: 700 }), cell("Consulter la liste des étudiants d'un groupe", { width: 3400 }), cell("3", { width: 500, align: AlignmentType.CENTER }), cell("Must Have", { width: 1200 }), cell("Sprint 1", { width: 800 }), cell("Fonctionnalité essentielle enseignant", { width: 2426 })
          ]}),

          // ── Sprint 2 ──
          new TableRow({ children: [
            cell("E3", { width: 700, shade: "FFF2CC" }), cell("Saisir les notes d'un groupe (4 colonnes + moyenne auto)", { width: 3400, shade: "FFF2CC" }), cell("5", { width: 500, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("Must Have", { width: 1200, shade: "FFF2CC" }), cell("Sprint 2", { width: 800, shade: "FFF2CC" }), cell("Fonctionnalité principale enseignant", { width: 2426, shade: "FFF2CC" })
          ]}),
          new TableRow({ children: [
            cell("E4", { width: 700 }), cell("Modifier des notes déjà saisies (enseignant)", { width: 3400 }), cell("3", { width: 500, align: AlignmentType.CENTER }), cell("Must Have", { width: 1200 }), cell("Sprint 2", { width: 800 }), cell("Correction d'erreurs nécessaire", { width: 2426 })
          ]}),
          new TableRow({ children: [
            cell("A3", { width: 700, shade: "FFF2CC" }), cell("Consulter, modifier, supprimer et débloquer un compte étudiant", { width: 3400, shade: "FFF2CC" }), cell("5", { width: 500, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("Should Have", { width: 1200, shade: "FFF2CC" }), cell("Sprint 2", { width: 800, shade: "FFF2CC" }), cell("Gestion du référentiel étudiant", { width: 2426, shade: "FFF2CC" })
          ]}),
          new TableRow({ children: [
            cell("A4", { width: 700 }), cell("Activer / désactiver un compte étudiant", { width: 3400 }), cell("2", { width: 500, align: AlignmentType.CENTER }), cell("Must Have", { width: 1200 }), cell("Sprint 2", { width: 800 }), cell("Fonctionnalité essentielle administration", { width: 2426 })
          ]}),
          new TableRow({ children: [
            cell("A5", { width: 700, shade: "FFF2CC" }), cell("Affecter des étudiants à une classe/groupe (avec auto-complétion 3 chars, insensible casse)", { width: 3400, shade: "FFF2CC" }), cell("5", { width: 500, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("Must Have", { width: 1200, shade: "FFF2CC" }), cell("Sprint 2", { width: 800, shade: "FFF2CC" }), cell("Exigence fonctionnelle du CDC", { width: 2426, shade: "FFF2CC" })
          ]}),
          new TableRow({ children: [
            cell("A6", { width: 700 }), cell("Ajouter des classes (année universitaire, niveau, spécialité, groupes)", { width: 3400 }), cell("3", { width: 500, align: AlignmentType.CENTER }), cell("Should Have", { width: 1200 }), cell("Sprint 2", { width: 800 }), cell("Nécessaire à l'organisation des promotions", { width: 2426 })
          ]}),
          new TableRow({ children: [
            cell("A7", { width: 700, shade: "FFF2CC" }), cell("Associer un enseignant à une matière / planifier les matières par semestre et groupe", { width: 3400, shade: "FFF2CC" }), cell("5", { width: 500, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("Should Have", { width: 1200, shade: "FFF2CC" }), cell("Sprint 2", { width: 800, shade: "FFF2CC" }), cell("Organisation pédagogique", { width: 2426, shade: "FFF2CC" })
          ]}),
          new TableRow({ children: [
            cell("A8", { width: 700 }), cell("Importer des étudiants en masse via fichier CSV", { width: 3400 }), cell("3", { width: 500, align: AlignmentType.CENTER }), cell("Could Have", { width: 1200 }), cell("Sprint 2", { width: 800 }), cell("Exigence CDC — réalisé si le temps le permet", { width: 2426 })
          ]}),
        ]
      }),

      ...spacer(1),
      para("Note de priorisation : Les SP des US Sprint 2 ont été révisés à la baisse par rapport au backlog initial pour tenir compte des contraintes d'un sprint d'une semaine. L'US A8 (import CSV) est traitée en Could Have et sera livrée si la vélocité le permet.", { italic: true, color: "444444" }),

      // ══════════════════════════════════════════
      // 5. PLANNING POKER
      // ══════════════════════════════════════════
      h1("5. Estimation des Story Points — Planning Poker"),

      h2("5.1 Principe du Planning Poker"),
      para("Le Planning Poker est une technique d'estimation collaborative. Chaque membre vote simultanément avec une carte selon la suite de Fibonacci (1, 2, 3, 5, 8, 13...). En cas de divergence, les membres extrêmes justifient leur vote et l'équipe re-vote jusqu'à consensus."),

      h2("5.2 Exemple détaillé pour 2 User Stories"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2000, 1200, 1100, 1100, 2313, 1313],
        rows: [
          new TableRow({ children: [hCell("Membre", 2000), hCell("Rôle", 1200), hCell("US : Consulter notes (S2)", 1100), hCell("US : Saisir notes (E3)", 1100), hCell("Justification S2", 2313), hCell("Justification E3", 1313)] }),
          new TableRow({ children: [cell("Abderrahmane", { bold: true, width: 2000 }), cell("Product Owner", { width: 1200 }), cell("5", { width: 1100, align: AlignmentType.CENTER }), cell("5", { width: 1100, align: AlignmentType.CENTER }), cell("Lecture BDD + calcul moyenne", { width: 2313 }), cell("Formulaire + validation + calcul", { width: 1313 })] }),
          new TableRow({ children: [cell("Amjad", { bold: true, width: 2000 }), cell("Développeur", { width: 1200 }), cell("5", { width: 1100, align: AlignmentType.CENTER }), cell("5", { width: 1100, align: AlignmentType.CENTER }), cell("Requête SQL complexe", { width: 2313 }), cell("Logique métier + tests", { width: 1313 })] }),
          new TableRow({ children: [cell("Tarik", { bold: true, width: 2000 }), cell("Scrum Master", { width: 1200 }), cell("3", { width: 1100, align: AlignmentType.CENTER }), cell("3", { width: 1100, align: AlignmentType.CENTER }), cell("Simple affichage", { width: 2313 }), cell("Comparable à la consultation", { width: 1313 })] }),
          new TableRow({ children: [cell("Mohamed", { bold: true, width: 2000 }), cell("Développeur", { width: 1200 }), cell("5", { width: 1100, align: AlignmentType.CENTER }), cell("5", { width: 1100, align: AlignmentType.CENTER }), cell("UI + intégration BDD", { width: 2313 }), cell("UI complexe + validation", { width: 1313 })] }),
          new TableRow({ children: [cell("CONSENSUS", { bold: true, width: 2000, shade: "D5E8D4" }), cell("—", { width: 1200, shade: "D5E8D4" }), cell("5 SP", { bold: true, width: 1100, shade: "D5E8D4", align: AlignmentType.CENTER }), cell("5 SP", { bold: true, width: 1100, shade: "D5E8D4", align: AlignmentType.CENTER }), cell("Vote unanime : accordé", { width: 2313, shade: "D5E8D4" }), cell("Tarik convaincu après discussion", { width: 1313, shade: "D5E8D4" })] }),
        ]
      }),
      ...spacer(1),
      para("Pour E3, Tarik avait initialement voté 3 SP, estimant la complexité équivalente à la consultation. Après discussion, la validation des données, la gestion des erreurs de saisie et les tests supplémentaires ont justifié un consensus à 5 SP."),

      // ══════════════════════════════════════════
      // 6. VÉLOCITÉ
      // ══════════════════════════════════════════
      h1("6. Vélocité de l'équipe"),
      para("La vélocité mesure la capacité de l'équipe à livrer des Story Points par sprint. Elle sert à planifier les sprints futurs."),
      ...spacer(1),
      new Table({
        width: { size: 7000, type: WidthType.DXA },
        columnWidths: [2500, 1500, 1500, 1500],
        rows: [
          new TableRow({ children: [hCell("Sprint", 2500), hCell("SP planifiés", 1500), hCell("SP livrés", 1500), hCell("Vélocité", 1500)] }),
          new TableRow({ children: [cell("Sprint 1 (semaine 1)", { width: 2500 }), cell("29", { width: 1500, align: AlignmentType.CENTER }), cell("29", { width: 1500, align: AlignmentType.CENTER }), cell("29 SP", { bold: true, width: 1500, align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Sprint 2 (semaine 2)", { width: 2500 }), cell("31", { width: 1500, align: AlignmentType.CENTER }), cell("28", { width: 1500, align: AlignmentType.CENTER }), cell("28 SP", { bold: true, width: 1500, align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Vélocité moyenne", { bold: true, shade: "EBF3FB", width: 2500 }), cell("—", { shade: "EBF3FB", width: 1500, align: AlignmentType.CENTER }), cell("—", { shade: "EBF3FB", width: 1500, align: AlignmentType.CENTER }), cell("28.5 SP", { bold: true, shade: "EBF3FB", width: 1500, align: AlignmentType.CENTER })] }),
        ]
      }),
      ...spacer(1),
      para("Analyse : lors du Sprint 2, l'US A8 (import CSV, 3 SP) n'a pas été terminée car priorisée Could Have et traitée en dernier. La vélocité réelle est de 28 SP. La vélocité moyenne de 28,5 SP servira de référence pour la planification du sprint suivant."),

      // ══════════════════════════════════════════
      // 7. DAILY SCRUM
      // ══════════════════════════════════════════
      h1("7. Daily Scrum Meetings"),
      para("Les daily meetings ont lieu chaque matin à 9h00, pour une durée maximale de 15 minutes. Chaque membre répond aux trois questions standard."),

      h2("7.1 Sprint 1 — Daily Jour 1 (Lundi)"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2000, 2200, 2800, 2026],
        rows: [
          new TableRow({ children: [hCell("Membre", 2000), hCell("Qu'ai-je fait hier ?", 2200), hCell("Que vais-je faire aujourd'hui ?", 2800), hCell("Obstacles ?", 2026)] }),
          new TableRow({ children: [cell("Abderrahmane (PO)", { bold: true, width: 2000 }), cell("Analyse du CDC et définition des US", { width: 2200 }), cell("Présenter le backlog priorisé, valider les priorités Sprint 1", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Amjad (Dev)", { bold: true, width: 2000 }), cell("Mise en place de l'environnement de développement", { width: 2200 }), cell("Créer la structure BDD (tables étudiants, enseignants) + configurer le hachage SHA-256", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Tarik (SM)", { bold: true, width: 2000 }), cell("Animation de la réunion de planification Sprint 1", { width: 2200 }), cell("Créer le tableau Scrum (To Do / In Progress / Done), rédiger les daily", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Mohamed (Dev)", { bold: true, width: 2000 }), cell("Étude des maquettes de l'interface", { width: 2200 }), cell("Développer la page de connexion (authentification)", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
        ]
      }),

      h2("7.2 Sprint 1 — Daily Jour 3 (Mercredi)"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2000, 2200, 2800, 2026],
        rows: [
          new TableRow({ children: [hCell("Membre", 2000), hCell("Qu'ai-je fait hier ?", 2200), hCell("Que vais-je faire aujourd'hui ?", 2800), hCell("Obstacles ?", 2026)] }),
          new TableRow({ children: [cell("Abderrahmane (PO)", { bold: true, width: 2000 }), cell("Validation des US S1, E1 avec l'équipe", { width: 2200 }), cell("Clarifier la formule de calcul de la moyenne", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Amjad (Dev)", { bold: true, width: 2000 }), cell("Création BDD : tables étudiants, enseignants, classes + hachage SHA-256 intégré", { width: 2200 }), cell("Développer les requêtes de consultation des notes par module", { width: 2800 }), cell("Besoin de confirmation du schéma BDD par le PO", { width: 2026 })] }),
          new TableRow({ children: [cell("Tarik (SM)", { bold: true, width: 2000 }), cell("Mise à jour du tableau Scrum, résolution du blocage Amjad/PO", { width: 2200 }), cell("Animer le daily, vérifier l'avancement des US S2 et S3", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Mohamed (Dev)", { bold: true, width: 2000 }), cell("Page de connexion fonctionnelle pour enseignant et étudiant", { width: 2200 }), cell("Développer la page de consultation du bulletin de notes (étudiant)", { width: 2800 }), cell("Attente du schéma BDD finalisé par Amjad", { width: 2026 })] }),
        ]
      }),

      h2("7.3 Sprint 1 — Daily Jour 5 (Vendredi — Veille de Sprint Review)"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2000, 2200, 2800, 2026],
        rows: [
          new TableRow({ children: [hCell("Membre", 2000), hCell("Qu'ai-je fait hier ?", 2200), hCell("Que vais-je faire aujourd'hui ?", 2800), hCell("Obstacles ?", 2026)] }),
          new TableRow({ children: [cell("Abderrahmane (PO)", { bold: true, width: 2000 }), cell("Validation du schéma BDD, clarification formule de moyenne", { width: 2200 }), cell("Sprint Review : vérifier les US livrées, préparer la démo Sprint 1", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Amjad (Dev)", { bold: true, width: 2000 }), cell("Requêtes SQL de consultation des notes et moyennes terminées", { width: 2200 }), cell("Tests finaux BDD, correction des bugs, livraison Sprint 1", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Tarik (SM)", { bold: true, width: 2000 }), cell("Suivi de l'avancement, mise à jour du burndown chart", { width: 2200 }), cell("Organiser la Sprint Review et la Rétrospective Sprint 1", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Mohamed (Dev)", { bold: true, width: 2000 }), cell("Page bulletin étudiant affichant les notes par module", { width: 2200 }), cell("Tests UI, correction des erreurs d'affichage, livraison Sprint 1", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
        ]
      }),

      h2("7.4 Sprint 2 — Daily Jour 1 (Lundi — Après Rétrospective)"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2000, 2200, 2800, 2026],
        rows: [
          new TableRow({ children: [hCell("Membre", 2000), hCell("Qu'ai-je fait hier ?", 2200), hCell("Que vais-je faire aujourd'hui ?", 2800), hCell("Obstacles ?", 2026)] }),
          new TableRow({ children: [cell("Abderrahmane (PO)", { bold: true, width: 2000 }), cell("Sprint Review Sprint 1 : toutes les US livrées validées", { width: 2200 }), cell("Présenter les US Sprint 2 à l'équipe (E3, E4, A3, A4, A5, A6, A7)", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Amjad (Dev)", { bold: true, width: 2000 }), cell("Correction des bugs Sprint 1", { width: 2200 }), cell("Développer le formulaire de saisie des notes (E3)", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Tarik (SM)", { bold: true, width: 2000 }), cell("Animation de la Rétrospective Sprint 1 (méthode Start/Stop/Continue)", { width: 2200 }), cell("Planification Sprint 2, mise à jour du backlog", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Mohamed (Dev)", { bold: true, width: 2000 }), cell("Tests de la page bulletin corrigés et validés", { width: 2200 }), cell("Développer la gestion des comptes étudiants (A3) + interface affectation (A5)", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
        ]
      }),

      h2("7.5 Sprint 2 — Daily Jour 4 (Jeudi)"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2000, 2200, 2800, 2026],
        rows: [
          new TableRow({ children: [hCell("Membre", 2000), hCell("Qu'ai-je fait hier ?", 2200), hCell("Que vais-je faire aujourd'hui ?", 2800), hCell("Obstacles ?", 2026)] }),
          new TableRow({ children: [cell("Abderrahmane (PO)", { bold: true, width: 2000 }), cell("Revue des US E3 et A3 en cours", { width: 2200 }), cell("Valider les formulaires de saisie de notes avec Amjad", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Amjad (Dev)", { bold: true, width: 2000 }), cell("Formulaire saisie notes fonctionnel (TPs, Projet, Contrôle, Examen)", { width: 2200 }), cell("Calcul auto de la moyenne, développer E4 (modification notes)", { width: 2800 }), cell("Formule de moyenne à confirmer avec PO", { width: 2026 })] }),
          new TableRow({ children: [cell("Tarik (SM)", { bold: true, width: 2000 }), cell("Mise à jour du tableau Scrum Sprint 2", { width: 2200 }), cell("Lever le blocage Amjad/PO sur la formule de moyenne", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
          new TableRow({ children: [cell("Mohamed (Dev)", { bold: true, width: 2000 }), cell("Interface affectation étudiants avec auto-complétion (A5) terminée", { width: 2200 }), cell("Développer A6 (ajout de classes) et commencer A8 (import CSV) si le temps le permet", { width: 2800 }), cell("Aucun", { width: 2026 })] }),
        ]
      }),

      // ══════════════════════════════════════════
      // 8. RÉSULTATS DES SPRINTS
      // ══════════════════════════════════════════
      h1("8. Résultats des Sprints"),

      h2("8.1 Sprint 1 — Fonctionnalités livrées"),
      para("Périmètre Sprint 1 : mise en place de la sécurité (SHA-256), authentification, création des comptes et toutes les fonctionnalités de consultation. Ce sprint pose les bases techniques et livre immédiatement de la valeur aux utilisateurs finaux (étudiants, enseignants)."),
      ...spacer(1),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [700, 3500, 600, 1300, 2926],
        rows: [
          new TableRow({ children: [hCell("ID", 700), hCell("User Story", 3500), hCell("SP", 600), hCell("Statut", 1300), hCell("Résultat livré", 2926)] }),
          new TableRow({ children: [cell("SEC1", { width: 700 }), cell("Hachage SHA-256 des mots de passe", { width: 3500 }), cell("2", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Mots de passe hashés en BDD, jamais stockés en clair", { width: 2926 })] }),
          new TableRow({ children: [cell("S1", { width: 700, shade: "EBF3FB" }), cell("Se connecter (étudiant)", { width: 3500, shade: "EBF3FB" }), cell("3", { width: 600, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "EBF3FB" }), cell("Page login fonctionnelle", { width: 2926, shade: "EBF3FB" })] }),
          new TableRow({ children: [cell("E1", { width: 700 }), cell("Se connecter (enseignant)", { width: 3500 }), cell("3", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Page login fonctionnelle", { width: 2926 })] }),
          new TableRow({ children: [cell("A1", { width: 700, shade: "EBF3FB" }), cell("Créer compte enseignant + envoi mot de passe par e-mail", { width: 3500, shade: "EBF3FB" }), cell("3", { width: 600, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "EBF3FB" }), cell("Formulaire + génération + envoi e-mail automatique", { width: 2926, shade: "EBF3FB" })] }),
          new TableRow({ children: [cell("A2", { width: 700 }), cell("Créer compte étudiant + matricule auto + envoi mot de passe", { width: 3500 }), cell("3", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Formulaire + matricule auto-incrémenté + e-mail automatique", { width: 2926 })] }),
          new TableRow({ children: [cell("S4", { width: 700, shade: "EBF3FB" }), cell("Consulter son inscription (classe et groupe)", { width: 3500, shade: "EBF3FB" }), cell("2", { width: 600, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "EBF3FB" }), cell("Page affichant classe et groupe de l'étudiant", { width: 2926, shade: "EBF3FB" })] }),
          new TableRow({ children: [cell("E2", { width: 700 }), cell("Consulter les classes et groupes affectés (enseignant)", { width: 3500 }), cell("3", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Liste des classes de l'enseignant", { width: 2926 })] }),
          new TableRow({ children: [cell("S2", { width: 700, shade: "EBF3FB" }), cell("Consulter notes par module (bulletin : TPs, Projet, CC, Exam)", { width: 3500, shade: "EBF3FB" }), cell("5", { width: 600, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "EBF3FB" }), cell("Bulletin avec les 4 notes + coefficients + moyenne", { width: 2926, shade: "EBF3FB" })] }),
          new TableRow({ children: [cell("S3", { width: 700 }), cell("Consulter les moyennes par semestre", { width: 3500 }), cell("5", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Calcul automatique de la moyenne semestrielle", { width: 2926 })] }),
          new TableRow({ children: [cell("E5", { width: 700, shade: "EBF3FB" }), cell("Consulter la liste des étudiants d'un groupe", { width: 3500, shade: "EBF3FB" }), cell("3", { width: 600, shade: "EBF3FB", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "EBF3FB" }), cell("Liste complète avec matricule, nom, prénom", { width: 2926, shade: "EBF3FB" })] }),
          new TableRow({ children: [cell("TOTAL", { bold: true, shade: "D5E8D4", width: 700 }), cell("—", { shade: "D5E8D4", width: 3500 }), cell("29", { bold: true, shade: "D5E8D4", width: 600, align: AlignmentType.CENTER }), cell("29/29 SP (100%)", { bold: true, color: "375623", shade: "D5E8D4", width: 1300 }), cell("Toutes les US planifiées livrées", { shade: "D5E8D4", width: 2926 })] }),
        ]
      }),

      h2("8.2 Sprint 2 — Fonctionnalités livrées"),
      para("Périmètre Sprint 2 : saisie et modification des notes, gestion des comptes, affectation des étudiants avec auto-complétion, ajout de classes et association enseignant-matière."),
      ...spacer(1),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [700, 3500, 600, 1300, 2926],
        rows: [
          new TableRow({ children: [hCell("ID", 700), hCell("User Story", 3500), hCell("SP", 600), hCell("Statut", 1300), hCell("Résultat livré", 2926)] }),
          new TableRow({ children: [cell("E3", { width: 700, shade: "FFF2CC" }), cell("Saisir les notes d'un groupe (4 colonnes + moyenne auto)", { width: 3500, shade: "FFF2CC" }), cell("5", { width: 600, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "FFF2CC" }), cell("Formulaire 4 colonnes avec calcul automatique de la moyenne", { width: 2926, shade: "FFF2CC" })] }),
          new TableRow({ children: [cell("E4", { width: 700 }), cell("Modifier des notes déjà saisies (enseignant)", { width: 3500 }), cell("3", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Édition en ligne validée", { width: 2926 })] }),
          new TableRow({ children: [cell("A3", { width: 700, shade: "FFF2CC" }), cell("Consulter, modifier, supprimer, débloquer compte étudiant", { width: 3500, shade: "FFF2CC" }), cell("5", { width: 600, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "FFF2CC" }), cell("Fiche étudiant complète avec toutes les actions CRUD", { width: 2926, shade: "FFF2CC" })] }),
          new TableRow({ children: [cell("A4", { width: 700 }), cell("Activer / désactiver un compte étudiant", { width: 3500 }), cell("2", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Toggle de statut du compte", { width: 2926 })] }),
          new TableRow({ children: [cell("A5", { width: 700, shade: "FFF2CC" }), cell("Affecter étudiants à classe/groupe avec auto-complétion (3 chars, insensible casse)", { width: 3500, shade: "FFF2CC" }), cell("5", { width: 600, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "FFF2CC" }), cell("Interface d'affectation avec auto-complétion fonctionnelle", { width: 2926, shade: "FFF2CC" })] }),
          new TableRow({ children: [cell("A6", { width: 700 }), cell("Ajouter des classes (année, niveau, spécialité, groupes)", { width: 3500 }), cell("3", { width: 600, align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300 }), cell("Formulaire d'ajout de classes avec liste mise à jour", { width: 2926 })] }),
          new TableRow({ children: [cell("A7", { width: 700, shade: "FFF2CC" }), cell("Associer enseignant à matière / planifier matières par semestre", { width: 3500, shade: "FFF2CC" }), cell("5", { width: 600, shade: "FFF2CC", align: AlignmentType.CENTER }), cell("✔ Terminé", { bold: true, color: "375623", width: 1300, shade: "FFF2CC" }), cell("Liaison enseignant-matière et planification par semestre et groupe", { width: 2926, shade: "FFF2CC" })] }),
          new TableRow({ children: [cell("A8", { width: 700 }), cell("Importer des étudiants en masse via fichier CSV", { width: 3500 }), cell("3", { width: 600, align: AlignmentType.CENTER }), cell("⏳ Non terminé", { bold: true, color: "C00000", width: 1300 }), cell("Reporté — priorisé Could Have, temps insuffisant en fin de sprint", { width: 2926 })] }),
          new TableRow({ children: [cell("TOTAL", { bold: true, shade: "D5E8D4", width: 700 }), cell("—", { shade: "D5E8D4", width: 3500 }), cell("31", { bold: true, shade: "D5E8D4", width: 600, align: AlignmentType.CENTER }), cell("28/31 SP (90%)", { bold: true, color: "375623", shade: "D5E8D4", width: 1300 }), cell("A8 (import CSV) reportée au prochain sprint", { shade: "D5E8D4", width: 2926 })] }),
        ]
      }),

      // ══════════════════════════════════════════
      // 9. RÉTROSPECTIVE
      // ══════════════════════════════════════════
      h1("9. Rétrospective Sprint 1 — Méthode Start/Stop/Continue"),
      para("La rétrospective a été animée par Tarik (Scrum Master) en utilisant la méthode Start/Stop/Continue, présentée lors des séances par un groupe de camarades."),
      ...spacer(1),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [3008, 3009, 3009],
        rows: [
          new TableRow({ children: [hCell("🟢 Start (Commencer)", 3008), hCell("🔴 Stop (Arrêter)", 3009), hCell("🟡 Continue (Continuer)", 3009)] }),
          new TableRow({ children: [
            cell("Faire des revues de code entre développeurs avant de livrer une US", { width: 3008 }),
            cell("Attendre la fin de journée pour signaler un blocage", { width: 3009 }),
            cell("La communication directe et rapide entre membres", { width: 3009 })
          ]}),
          new TableRow({ children: [
            cell("Écrire les critères d'acceptation de chaque US avant de commencer le développement", { width: 3008 }),
            cell("Développer sans valider le schéma BDD au préalable avec le PO", { width: 3009 }),
            cell("La mise à jour quotidienne du tableau Scrum par le Scrum Master", { width: 3009 })
          ]}),
          new TableRow({ children: [
            cell("Tester chaque page sur plusieurs navigateurs avant livraison", { width: 3008 }),
            cell("Sous-estimer la complexité des US liées à la BDD", { width: 3009 }),
            cell("Les daily meetings quotidiens : utiles et bien cadrés", { width: 3009 })
          ]}),
        ]
      }),

      h2("9.1 Actions mises en place dans le Sprint 2 suite à la rétrospective"),
      bullet("START appliqué : revues de code systématiques entre Amjad et Mohamed avant chaque livraison d'US."),
      bullet("STOP appliqué : les blocages sont signalés immédiatement lors du daily, sans attendre la fin de journée."),
      bullet("CONTINUE appliqué : les daily quotidiens ont été maintenus avec rigueur tout au long du Sprint 2."),
      bullet("Amélioration ajoutée : les critères d'acceptation de chaque US ont été rédigés au début du Sprint 2, avant tout développement."),

      // ══════════════════════════════════════════
      // 10. OBSTACLES
      // ══════════════════════════════════════════
      h1("10. Obstacles rencontrés"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2500, 800, 1200, 3026, 700],
        rows: [
          new TableRow({ children: [hCell("Obstacle rencontré", 2500), hCell("Sprint", 800), hCell("Impact", 1200), hCell("Solution apportée", 3026), hCell("Levé ?", 700)] }),
          new TableRow({ children: [cell("Schéma BDD non validé avant développement", { width: 2500 }), cell("Sprint 1", { width: 800 }), cell("Blocage de Mohamed", { width: 1200 }), cell("PO a validé le schéma lors du Daily J3", { width: 3026 }), cell("Oui", { bold: true, color: "375623", width: 700 })] }),
          new TableRow({ children: [cell("Formule de calcul de la moyenne ambiguë", { width: 2500, shade: "EBF3FB" }), cell("Sprint 1", { width: 800, shade: "EBF3FB" }), cell("Risque d'incohérence", { width: 1200, shade: "EBF3FB" }), cell("Formule fixée : (TP×0.1 + Proj×0.2 + CC×0.3 + Exam×0.4)", { width: 3026, shade: "EBF3FB" }), cell("Oui", { bold: true, color: "375623", width: 700, shade: "EBF3FB" })] }),
          new TableRow({ children: [cell("US A8 (import CSV) non terminée", { width: 2500 }), cell("Sprint 2", { width: 800 }), cell("Fonctionnalité Could Have non livrée", { width: 1200 }), cell("Reportée au backlog, priorisée pour sprint suivant", { width: 3026 }), cell("Non", { bold: true, color: "C00000", width: 700 })] }),
          new TableRow({ children: [cell("Utilisation de l'IA (ChatGPT) pour certains blocs de code", { width: 2500, shade: "EBF3FB" }), cell("S1 & S2", { width: 800, shade: "EBF3FB" }), cell("Code parfois inadapté au contexte", { width: 1200, shade: "EBF3FB" }), cell("Revue systématique du code IA avant intégration", { width: 3026, shade: "EBF3FB" }), cell("Oui", { bold: true, color: "375623", width: 700, shade: "EBF3FB" })] }),
        ]
      }),

      // ══════════════════════════════════════════
      // 11. IA
      // ══════════════════════════════════════════
      h1("11. Utilisation de l'Intelligence Artificielle"),

      h2("11.1 Outils utilisés"),
      bullet("ChatGPT : génération de fragments de code SQL pour les requêtes complexes (jointures multi-tables)."),
      bullet("GitHub Copilot : autocomplétion de code pour les fonctions front-end répétitives."),
      bullet("Claude (Anthropic) : aide à la rédaction du rapport et à la structuration du backlog."),

      h2("11.2 Usage responsable"),
      para("Tout code généré par IA a été relu, compris et adapté par les membres de l'équipe avant intégration. L'IA n'a pas été utilisée pour les décisions de priorisation ou d'architecture, qui restent le fruit de la réflexion de l'équipe."),

      // ══════════════════════════════════════════
      // 12. ÉVOLUTION
      // ══════════════════════════════════════════
      h1("12. Évolution du projet"),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2500, 3200, 1400, 1926],
        rows: [
          new TableRow({ children: [hCell("Étape", 2500), hCell("Activités clés", 3200), hCell("SP cumulés", 1400), hCell("État", 1926)] }),
          new TableRow({ children: [cell("Semaine 0 — Cadrage", { bold: true, width: 2500 }), cell("Lecture du CDC, rédaction des US, backlog initial, planning poker", { width: 3200 }), cell("0 SP", { width: 1400, align: AlignmentType.CENTER }), cell("Terminé", { bold: true, color: "375623", width: 1926 })] }),
          new TableRow({ children: [cell("Sprint 1 (Semaine 1)", { bold: true, shade: "EBF3FB", width: 2500 }), cell("Sécurité SHA-256, authentification, création comptes, toutes les fonctionnalités de consultation", { shade: "EBF3FB", width: 3200 }), cell("29 SP", { shade: "EBF3FB", width: 1400, align: AlignmentType.CENTER }), cell("Terminé (100%)", { bold: true, color: "375623", shade: "EBF3FB", width: 1926 })] }),
          new TableRow({ children: [cell("Sprint 2 (Semaine 2)", { bold: true, width: 2500 }), cell("Saisie/modification des notes, gestion comptes, affectation étudiants, planification matières", { width: 3200 }), cell("28/31 SP", { width: 1400, align: AlignmentType.CENTER }), cell("90% livré", { bold: true, color: "375623", width: 1926 })] }),
          new TableRow({ children: [cell("Backlog restant", { bold: true, shade: "FFF2CC", width: 2500 }), cell("A8 : Import CSV massif des étudiants (3 SP)", { shade: "FFF2CC", width: 3200 }), cell("3 SP", { shade: "FFF2CC", width: 1400, align: AlignmentType.CENTER }), cell("Reporté", { bold: true, color: "C00000", shade: "FFF2CC", width: 1926 })] }),
        ]
      }),

      // ══════════════════════════════════════════
      // CONCLUSION
      // ══════════════════════════════════════════
      h1("Conclusion"),
      para("Ce projet nous a permis de mettre en pratique la méthodologie Scrum dans un contexte académique réaliste. Les deux sprints d'une semaine nous ont confrontés aux enjeux de la priorisation (consultation avant saisie, sécurité en Must Have), de l'estimation collaborative (Planning Poker), et de l'amélioration continue (rétrospective Start/Stop/Continue)."),
      ...spacer(1),
      para("Par rapport au cahier des charges initial, les fonctionnalités manquantes ont été intégrées au backlog : hachage SHA-256 des mots de passe, génération et envoi automatique du mot de passe par e-mail, matricule auto-incrémenté, auto-complétion lors de l'affectation des étudiants, et import CSV massif. Seul l'import CSV (Could Have, 3 SP) reste à livrer lors d'un prochain sprint."),
      ...spacer(1),
      para("Le principal enseignement est l'importance de la communication quotidienne (daily) pour détecter et lever rapidement les blocages, et de la priorisation rigoureuse pour maximiser la valeur livrée dans un périmètre de temps contraint."),

      ...spacer(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "1F4E79", space: 1 } },
        children: [new TextRun({ text: "BOUDAOUD Abderrahmane | EL ASSOULI Amjad | Tarik | Mohamed", size: 18, color: "444444", font: "Arial" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "BOUDAOUD & EL ASSOULI — 2024-2025", size: 18, color: "444444", font: "Arial" })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/MSI/Desktop/Rapport_AGILE_Scrum_v2.docx", buffer);
  console.log("Done!");
});