# Dependency Control

## Purpose

A Jira asszisztensnek nem eleg issue-kat letrehozni es statuszt valtani. A projekt valos iranyitasahoz ertelmeznie kell, hogy melyik munka mit blokkol, min akad el, es melyik kovetkezo tetel indithato tenylegesen.

Ez a reteg a Jira `Blocks` kapcsolataira epitett dependency control operating modelt rogzit.

## Core Rules

- A blokkolasi logika elsodlegesen a Jira `Blocks` issue linktipusara epul.
- Egy issue akkor `blocked`, ha van olyan bejovo blokkoloja, amely nincs done statuszkategoriaban.
- Egy issue attol, hogy masokat blokkol, meg nem feltetlen blocked, de downstream kockazatot hordoz.
- A `pick next issue` logika csak olyan issue-t ajanlhat, amely nincs done allapotban es nincs nyitott blokkoloja.
- A dependency allapotot az asszisztensnek minden lifecycle muvelet elott ujra kell ertekelnie.

## Assistant Responsibilities

### 1. Dependency Discovery

- olvassa ki az issue bejovo es kimeno blokkolasi kapcsolatait
- kulonitse el az `blocked by` es `blocks` iranyokat
- mutassa meg, melyik blokkolo nyitott meg
- mutassa meg, ha az issue mas aktiv munkakat blokkol

### 2. Dependency-Aware Execution

- ne inditson el blokkolt issue-t
- ne zarjon le olyan issue-t, amelynek blokkolasi allapota ellentmond a workflow policynek
- a kovetkezo issue valasztasanal preferalja a tenylegesen indithato tetelt
- a kivalasztasi indokban jelenjen meg a dependency helyzet

### 3. Dependency Maintenance

- uj backlog seednel epitse fel a `Blocks` kapcsolatokat
- scope-valtozasnal frissitse a dependency graphot
- jelezze a stale vagy hianyzokapcsolatokat
- dokumentalja, ha egy dependency torlese vagy atkotese termekdontes

## Non-Goals

Az elso szelet nem old meg teljes dependency schedulinget es nem probal Gantt-jellegu tervet generalni. A cel az, hogy a board igaz maradjon, es a delivery loop ne vegyen fel blokkolt munkat.

## Relationship To Other Modules

- `Workflow Governance`: a workflow policy donthet ugy, hogy blokkolo helyzetnel mas statusz kell
- `Quality Control`: bug es failed test uj dependency-ket hozhat be
- `Change Control`: CR es reopen muveletek dependency driftet okozhatnak
- `Traceability and Audit`: a dependency mutacioknak is visszakereshetonek kell lenniuk
