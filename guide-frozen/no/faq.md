# FAQ

Ting som dukker opp ofte, ting som ser ut som feil men ikke er det,
og kjente begrensninger.

## Laster Purl opp dataene mine noe sted?

Nei. Alt bor på enheten din. Purl har ikke noe kontosystem, ingen
sky, ingen analyse, ingen telemetri. Du kan bruke appen på flyet.
Baksiden er at sikkerhetskopier er ditt ansvar (se
[sikkerhetskopier](./backups.md)), men appen gjør dem enkle.

## Hvordan flytter jeg dataene mine til en ny telefon?

Eksporter en `.purl`-sikkerhetskopi fra Mer → Data →
Sikkerhetskopi, flytt filen til den nye enheten (Drive, e-post,
USB, alt virker), installer Purl på den nye telefonen, og importer.
Se [sikkerhetskopier](./backups.md) for steg for steg.

## Jeg slettet noe ved et uhell.

Ingen panikk. **Mer → Data → Gjenoppretting** har ryggen din:

- **Nylig slettet**: alt du har slettet de siste 30 dagene kan
  hentes tilbake med ett trykk.
- **Øyeblikksbilder**: appen tar automatisk daglige bilder av
  tilstanden sin; 7 dager med historikk. Nyttig for "jeg slettet
  ti garn i den tro at de var duplikater" eller "jeg importerte en
  sikkerhetskopi oppå dataene mine".

## Søket finner ikke noe jeg vet er der.

Prøv med færre bokstaver; søket er delstrengbasert ("lopi" finner
"Léttlopi", "jarbo" finner "Järbo"). Det tåler også aksenter begge
veier. Det takler *ikke* skrivefeil ennå ("Sandnse" finner ikke
"Sandnes", så skriv nøye).

Hver fane (Stash, Oppskrifter, Prosjekter, Strekkode-maler) har sitt
eget søk over listen. **Globalsøket** (forstørrelsesglasset øverst
i Mer) søker på tvers av alt: prosjekter, oppskrifter, garn, utstyr,
notatlapper i PDF-er, PDF-bokmerker og ordlisten.

## Den norske oversettelsen har en skrivefeil / klønete formulering.

Send en beskjed via **Mer → Send tilbakemelding**. De norske
tekstene gjennomgås før de godkjennes; høres noe rart ut, er det
sannsynligvis det.

## PDF-verktøyknappen er i veien.

Dra den. Den flytende knappen kan flyttes dit du vil (hvilket som
helst hjørne, hvilken som helst kant), og den husker plasseringen
per enhet. Du kan også endre rekkefølgen på verktøyene, skjule
noen, og justere avstand og gjennomsiktighet i **Innstillinger**.

## Tegningene mine på en PDF forsvant etter at jeg trykket Tøm.

Tøm-knappen spør først ("Bare denne siden" eller "Alle sider").
Trykket du "Alle sider", er det borte. Oppdaget du det med en gang:
åpne Gjenoppretting og hent tilbake fra det nyeste
øyeblikksbildet (merknadene dine er en del av bildet).

## En skanning kjente ikke igjen garnet mitt.

Den innebygde katalogen dekker nordiske produsenter. Skannet du et
ikke-nordisk garn (Cascade, Madelinetosh, Brooklyn Tweed og så
videre), er koden ukjent til du lagrer garnet første gang; etterpå
husker appen den. Skann igjen senere, og den blir gjenkjent.

Skannet du et nordisk garn som *burde* ligget i katalogen, men ikke
gjør det, er det verdt en tilbakemelding. Katalogen blir rikere for
hver utgave.

## Autofyll-forslagene er feil / utdaterte.

Skriv din egen verdi. Forslagslisten er bare en hjelpende hånd.
Autofyll fyller bare *tomme* felt når du velger et forslag; det
overskriver aldri det du har skrevet.

Er en katalogoppføring feil (løpelengden på et garn er endret, en
tykkelse er omklassifisert), rediger din versjon. Endringen din
blir din egen kopi; katalogen beholder sin versjon under. Send
gjerne tilbakemelding, så katalogen kan rettes for alle.

## Hvorfor står samme garn to ganger i stashen min?

To grunner:

- **Ulike fargepartier.** To nøster med samme merke, navn og farge,
  men ulike fargepartier, føres hver for seg fordi nyansen kan
  variere mellom partier. Stashen grupperer dem under samme
  garnoppføring.
- **Ulike farger.** To nøster av samme garn i ulike farger er
  ulike oppføringer i stashen.

Stashlisten grupperer først på merke + navn, så på farge, og så på
fargeparti innerst. Har du *faktisk* to like oppføringer for samme
garn, samme farge og samme fargeparti, slår du dem sammen ved å
slette den ene og justere nøstetallet på den andre.

## Strekkode-mallisten min har duplikater.

Åpne Strekkode-maler. Finnes det duplikater av samme produkt (tom
tykkelse den ene gangen, "DK" den andre, eller en skrivefeil),
dukker et **Mulige duplikater**-kort opp øverst med en Slå
sammen-knapp per gruppe. Trykk for å slå sammen.

## Er PDF-er med i sikkerhetskopier?

Ja. En `.purl`-sikkerhetskopi med Oppskrifter-kategorien huket av
inneholder hver importerte PDF-fil, hvert omslagsminiatyrbilde,
hver tegning og hver notatlapp. Sikkerhetskopifilen blir
tilsvarende større.

## Hvordan deler jeg en oppskrift med en venn?

For en oppskrift du har skrevet selv: oppskriftsdetaljer → Del → det
skrives en `.purlp`-fil du kan sende på e-post, Drive eller
AirDrop.

For en PDF du har importert: del selve PDF-en via telefonens
vanlige delingsark (fra en hvilken som helst filbehandler som ser
den). Det finnes ingen egen "del PDF"-knapp i Purl. Det er bare en
PDF, delbar som alle andre.

For det skannede strekkodebiblioteket ditt (så en venn slipper å
skanne alt på nytt): Strekkode-maler → delingsikonet i toppen →
`.purlt`-fil.

## Hvor er iPhone-versjonen?

Underveis. Android-utgaven er test-målet akkurat nå fordi
testenheten er en Samsung S25. iOS kommer via App Store etter
hvert; ingen dato, men kodebasen er laget for begge fra dag én.

## En funksjon ser ut til å mangle / jeg ønsker meg X.

To steder å se:

- **Mer → Veikart**: hva som er planlagt.
- **Mer → Nyheter**: hva som nylig er levert.

Står ideen din ingen av stedene, er **Mer → Send tilbakemelding**
den direkte linjen. Hver beskjed blir lest.
