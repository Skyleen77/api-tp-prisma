import express from 'express';
import { prisma } from './lib/prisma';

const app = express();

const PORT = 3333;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// QUESTION 1
app.get('/projets/budgets', async (req, res) => {
  try {
    const budgets = await prisma.projet.findMany({
      select: {
        BUDGET: true,
      },
      where: {
        BUDGET: {
          not: null,
        },
      },
      orderBy: {
        BUDGET: 'desc',
      },
      distinct: ['BUDGET'],
    });

    res.json(budgets);
  } catch (error) {
    console.error('Erreur lors de la récupération des budgets : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

// QUESTION 2
// ex: /projets/budgets-interval?min=5000&max=100000
app.get('/projets/budgets-interval', async (req, res) => {
  const { min, max } = req.query;

  if (!min || !max) {
    return res
      .status(400)
      .send("Vous devez spécifier les paramètres 'min' et 'max'.");
  }

  try {
    const projets = await prisma.projet.findMany({
      where: {
        BUDGET: {
          gte: parseFloat(min as string),
          lte: parseFloat(max as string),
        },
      },
      orderBy: {
        BUDGET: 'asc',
      },
    });

    res.json(projets);
  } catch (error) {
    console.error('Erreur lors de la récupération des projets : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

// QUESTION 3
app.get('/chercheurs', async (req, res) => {
  try {
    const chercheurs = await prisma.chercheur.findMany({
      include: {
        equipe: true,
      },
    });

    const resultat = chercheurs.map((chercheur) => ({
      Nom: chercheur.NOM,
      Prenom: chercheur.PRENOM || 'Non spécifié',
      Equipe: chercheur.equipe?.NOM,
    }));

    res.json(resultat);
  } catch (error) {
    console.error('Erreur lors de la récupération des chercheurs : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

// QUESTION 4
app.get('/equipes', async (req, res) => {
  try {
    const equipes = await prisma.equipe.findMany({
      include: {
        _count: {
          select: { projet: true },
        },
      },
    });

    const resultat = equipes.map((equipe) => ({
      Nom: equipe.NOM,
      NombreDeProjets: equipe._count.projet,
    }));

    res.json(resultat);
  } catch (error) {
    console.error('Erreur lors de la récupération des équipes : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

// QUESTION 5
// ex: /chercheurs-projets-actifs?valeurX=100000&annee=2018
app.get('/chercheurs-projets-actifs', async (req, res) => {
  const valeurX = parseFloat(req.query.valeurX as string);
  const annee = parseInt(req.query.annee as string);

  try {
    const chercheurs = await prisma.chercheur.findMany({
      include: {
        affs: {
          where: {
            ANNEE: annee,
            projet: {
              BUDGET: {
                gt: valeurX,
              },
            },
          },
          include: {
            projet: true,
          },
        },
      },
    });

    const chercheursQualifies = chercheurs
      .filter((ch) => ch.affs.length > 2)
      .map((ch) => ({
        Nom: ch.NOM,
        Prenom: ch.PRENOM || 'Non spécifié',
        Projets: ch.affs.map((a) => `${a.projet.NOM} (${a.projet.BUDGET}€)`),
      }));

    res.json(chercheursQualifies);
  } catch (error) {
    console.error('Erreur lors de la récupération des chercheurs : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

// QUESTION 6
// ex: /chercheurs-collegues?nom=BOUGUEROUA&annee=2018
app.get('/chercheurs-collegues', async (req, res) => {
  const nomChercheur = req.query.nom as string;
  const annee = parseInt(req.query.annee as string);

  try {
    const projetsDuChercheur = await prisma.aff.findMany({
      where: {
        ANNEE: annee,
        chercheur: {
          NOM: nomChercheur,
        },
      },
      select: {
        NP: true,
      },
    });

    const idsProjets = projetsDuChercheur.map((p) => p.NP);

    const collegues = await prisma.aff.findMany({
      where: {
        NP: { in: idsProjets },
        ANNEE: annee,
        chercheur: {
          NOM: { not: nomChercheur },
        },
      },
      include: {
        chercheur: true,
      },
    });

    const resultat = collegues.map((c) => ({
      Nom: c.chercheur.NOM,
      Prenom: c.chercheur.PRENOM || 'Non spécifié',
    }));

    res.json(resultat);
  } catch (error) {
    console.error('Erreur lors de la récupération des chercheurs : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

// QUESTION 7
// ex: /projets-budget-sup?annee=2018
app.get('/projets-budget-sup', async (req, res) => {
  const annee = parseInt(req.query.annee as string);

  try {
    const budgets = await prisma.aff.findMany({
      where: {
        ANNEE: annee,
      },
      include: {
        projet: true,
      },
    });

    const budgetValues = budgets
      .map((a) => a.projet?.BUDGET)
      .filter((budget) => budget !== null)
      .map((budget) => Number(budget));

    const maxBudgetValue =
      budgetValues.length > 0 ? Math.max(...budgetValues) : 0;

    const projets = await prisma.projet.findMany({
      where: {
        BUDGET: {
          gt: maxBudgetValue,
        },
      },
    });

    res.json(
      projets.map((proj) => ({
        Nom: proj.NOM,
        Budget: proj.BUDGET,
      })),
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des projets : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

// QUESTION 8
// ex: /projets-communs?nomA=BOUGUEROUA&nomB=ZAIDI
app.get('/projets-communs', async (req, res) => {
  const nomA = req.query.nomA as string;
  const nomB = req.query.nomB as string;

  try {
    const projetsA = await prisma.aff.findMany({
      where: {
        chercheur: {
          NOM: nomA,
        },
      },
      include: {
        projet: true,
      },
    });

    const idsProjetsA = projetsA.map((aff) => aff.projet.NP);

    const projetsCommuns = await prisma.aff.findMany({
      where: {
        chercheur: {
          NOM: nomB,
        },
        NP: {
          in: idsProjetsA,
        },
      },
      include: {
        projet: true,
      },
    });

    const resultat = projetsCommuns.map((aff) => ({
      Nom: aff.projet.NOM,
      Budget: aff.projet.BUDGET,
    }));

    res.json(resultat);
  } catch (error) {
    console.error('Erreur lors de la récupération des projets : ', error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
