# Projekt brief: Teszt admin felulet

## Alapadatok

- Projekt neve: Teszt admin felulet
- Projekt kulcs: TESTUI
- Projekt tipus: `software`
- Jira mod: `team-managed`
- Delivery mode: `kanban`

## Cel

A cel egy egyszeru, belso admin felulet elinditasa, amellyel a tamogatasi csapat tudja kezelni a felhasznaloi kerdeseket, alap adatokat es manualis ellenorzeseket.

## Celhasznalo

- belso tamogatasi munkatars
- operacios team
- projektgazda

## Elso release

Az elso hasznalhato slice legyen egy olyan alap felulet, ahol:
- be lehet jelentkezni
- listazhatok a nyitott kerelmek
- egy kerelmet statusz alapjan meg lehet tekinteni
- a tamogatasi munkatars tud rola kommentet hagyni

## Mi nem fer bele most

- teljes jogosultsagkezeles
- automatizalt SLA motor
- tobb rendszeres integracio
- reporting dashboard

## Korlatozasok

- A csapat kis letszamu, ezert a kezdo backlog legyen kicsi.
- A projekt team-managed maradjon, hogy a kezdeti konfiguracio gyors legyen.
- A munkat Kanban alapon kell vezetni.

## Kezdo Jira struktura

### Epic

- Admin felulet alapjai

### Starter story-k

- Bejelentkezes es session kezeles
- Nyitott kerelmek listaja
- Kerelmek reszletezo nezet
- Komment hozzaadas kerelemhez

### Kezdo taskok

- Repo es projekt alapbeallitas
- UI vaz letrehozasa
- Alap API kapcsolat
- Tesztadat minta

## Elfogadasi elvek

- Az elso slice mukodo legyen end-to-end.
- A backlog legyen kicsi, attekintheto, es azonnal indithato.
- Minden story-hoz legyen egyertelmu elfogadasi feltetel.
- A dependency-k legyenek explicit linkelve.
