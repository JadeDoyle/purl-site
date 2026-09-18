# Sikkerhetskopier og gjenoppretting

Tre lag med vern mot å miste dataene dine.

## Kortversjonen

- **Nylig slettet**: alt du sletter blir liggende i papirkurven i
  30 dager. Ett trykk for å hente det tilbake.
- **Øyeblikksbilder**: appen tar automatisk et bilde av hele
  tilstanden sin omtrent daglig, og beholder 7 dager med historikk.
  Gjenopprett fra et øyeblikksbilde hvis noe har gått riktig galt.
- **Sikkerhetskopifiler**: du kan eksportere én `.purl`-fil med alt
  i, lagre den på Drive, sende den til deg selv på e-post, dele den
  hvor som helst. Veien til en ny enhet, eller til en trygg kopi
  utenfor enheten.

Alle tre ligger under **Mer → Data**: Gjenoppretting (de to
første), Sikkerhetskopi (den tredje).

## Nylig slettet

Når du sletter et garn, utstyr, prosjekt eller oppskrift, forsvinner
det ikke egentlig. Det havner i papirkurven i 30 dager. I det
vinduet kan du hente det tilbake med ett trykk.

**Mer → Data → Gjenoppretting** viser alt i papirkurven, nyest
først, sammen med en tidslinje over det du nylig har *lagt til*
eller *importert* (så du ser begge retninger av det du har gjort i
det siste).

Trykk **Gjenopprett** på en oppføring, og posten kommer tilbake,
med filer og alt. Handlingen føres i tidslinjen, så du kan se når
du gjenopprettet.

Etter 30 dager tømmes papirkurven automatisk; filene oppføringene
pekte på ryddes bort samtidig.

## Øyeblikksbilder

Med jevne mellomrom (automatisk, i bakgrunnen, uten oppsett) lagrer
Purl et øyeblikksbilde av hele tilstanden sin. Hvert garn, hver
oppskrift, hvert prosjekt, hver bildereferanse, hver innstilling.

7 dager med øyeblikksbilder beholdes; eldre ryddes bort. De bor i
Purls egen lagring, ikke noe sted du må holde styr på.

For å bruke ett: **Mer → Data → Gjenoppretting** → bla ned til
**Øyeblikksbilder** nederst → trykk på en dato. Sammenligningen
viser det som ligger i øyeblikksbildet, men *ikke* i den nåværende
tilstanden din. Velg hva du vil gjenopprette (per kategori, eller
per element).

Nyttig for tilfellene "jeg importerte en dårlig sikkerhetskopi
oppå dataene mine" eller "jeg slettet ti garn i den tro at de var
duplikater", der papirkurven alene ikke strekker til.

Haken: øyeblikksbildene er bare lokale. En fabrikktilbakestilling
av telefonen sletter dem også. For trygghet utenfor enheten, bruk
sikkerhetskopifiler.

## Sikkerhetskopifiler (.purl)

**Mer → Data → Sikkerhetskopi** åpner velgeren. Huk av kategoriene
du vil ha med (Prosjekter / Garn / Oppskrifter / Utstyr og så videre).
Små ting som innstillinger, fargepaletten, fiberlisten,
strekkode-malene og aktivitetsloggen blir alltid med automatisk (de
deles på tvers av appen, og du vil alltid ha dem med).

Trykk **Eksporter** → systemets delingsark åpnes → lagre på Drive,
send til deg selv på e-post, lagre i Filer, send via WhatsApp, hvor
du vil.

Resultatet er én `.purl`-fil. Filstørrelsen er omtrent som samlet
lagret data. Etter et år med aktiv bruk kan du vente deg titalls
eller hundretalls MB, avhengig av hvor mange PDF-er du har
importert.

### Importere en sikkerhetskopi

To veier:

- **Inne i appen**: Mer → Data → Sikkerhetskopi → Importer-fanen.
  Velg `.purl`-filen.
- **Fra filbehandleren**: trykk direkte på en `.purl`-fil. Purl
  åpner rett i importskjermen med filen klar.

Importen viser en forhåndsvisning (hva som er inni, hvor gammel den
er, hvilken appversjon som lagde den). Velg flettestrategi per
kategori:

- **Legg til**: fletter (behold ditt + deres).
- **Erstatt**: overskriver (bare de importerte postene blir igjen i
  den kategorien).
- **Hopp over**: lar den kategorien være i fred.

## Dele oppskrifter og maler hver for seg

To mindre filformater for å dele *bare* én ting:

- **.purlp**: én egenskrevet oppskrift. Nyttig for "jeg lagde denne
  lueoppskriften, vær så god." Del fra oppskriftens detaljskjerm.
  Trykker noen på en `.purlp` i filbehandleren, åpnes Purl med
  oppskriften lagt til.
- **.purlt**: strekkode-malbiblioteket ditt. Nyttig for å gi en
  venn en flying start på stashen, så hen slipper å skanne hvert
  garn selv. Del fra Strekkode-maler → delingsikonet i toppen.
  Trykker noen på en `.purlt` i filbehandleren, åpnes Purl med
  fletteforhåndsvisningen.

Dette er bittesmå JSON-filer (typisk KB, ikke MB), og de inneholder
ikke garnet, prosjektene eller bildene dine. Bare den navngitte
tingen.

## Flytte til en ny enhet

1. På den gamle enheten: **Mer → Data → Sikkerhetskopi →
   Eksporter**. Huk av alt. Lagre `.purl`-filen et sted du når den
   (Drive, e-post, USB-overføring).
2. Installer Purl på den nye enheten.
3. Åpne `.purl`-filen fra den nye enhetens filbehandler (eller
   importer via Sikkerhetskopi-skjermen). Bruk **Erstatt** for hver
   kategori: den nye enheten er tom.

Det er alt. PDF-er, bilder, tegninger, notatlapper, fargepartier,
tellere: alt blir med.

## Se også

- [Stash](./yarn-stash.md): stashen som sikkerhetskopieres.
- [Strekkode-maler](./barcode-templates.md): `.purlt`-formatet for
  å dele malbiblioteker.
- [Oppskrifter](./patterns.md): `.purlp`-formatet for å dele oppskrifter.
