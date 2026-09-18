# Strekkode-maler

Å skanne en garnbanderole bør ikke bare være en engangsutfylling.
Det bør *lære appen* hva produktet er, slik at neste gang noen
skanner det (du, en venn, en fersk installasjon) ligger svaret
klart.

Det er det strekkode-maler er til.

## Grunnflyten

Du er i garnbutikken. Du kjøper to nøster av et Sandnes-garn du
aldri har ført inn før. Hjemme:

1. **Stash → strekkodeikonet** (ved siden av Legg til garn).
2. Kameraet åpnes, skann banderolen.
3. Purl kjenner igjen Sandnes Sunday og åpner Legg til
   garn-skjemaet ferdig utfylt med merke, navn, tykkelse, fiber,
   strikkefasthet og anbefalt pinne. Du skriver bare fargenavnet
   og fargepartiet.
4. Lagre.

Gjenkjenningen skjer fordi Sandnes Sunday ligger i den innebygde
**katalogen** som følger med Purl.

Blir garnet ikke gjenkjent:

3. *(ukjent kode)*: skjemaet åpnes tomt med strekkoden festet. Du
   fyller inn merke, navn, tykkelse og så videre.
4. Lagre.

Den **lagringen** oppretter i det stille en strekkode-mal. Neste
gang du (eller en venn med samme mal) skanner samme kode, blir den
gjenkjent.

## Katalogen

Purl leveres med en kuratert katalog over rundt 20 nordiske
garnprodusenter og garnene deres: DROPS, Sandnes Garn, Ístex,
Knitting for Olive, Du Store Alpakka, Hillesvåg, Filcolana, Rauma,
Dale, Camilla Pihl, Viking of Norway, Järbo, Svarta Fåret,
CaMaRose, Hjertegarn, Isager, Novita og flere.

For de fleste: merke, garnnavn, tykkelse, fiber og løpelengde
utfylt. For noen: fargekart også (hele DROPS-sortimentet, Ístex
Lopi-numrene, alle de navngitte Knitting for Olive-seriene).

Katalogen er **skrivebeskyttet ved kilden**, men du kan redigere
enhver oppføring: endringen din blir en egen kopi i ditt eget
mallager. Appoppdateringer leverer nye katalogoppføringer uten å
overskrive det du har endret.

## Strekkode-maler-visningen

**Mer → Strekkode-maler** åpner administrasjonsflaten.

Øverst: et levende kamera for skanning. Under: listen over malene
du eier, pluss alt i katalogen (som bare dukker opp når du søker,
så dag-én-listen ikke er 150 rader lang).

Hver rad: merke · navn, med en undertekst som viser antall
strekkoder, tykkelse og fiber. Trykk på en rad for å åpne den.

Inne i en mal:

- **Strekkoder**: en brikkeliste. Legg til via tekstfeltet; fjern
  via krysset på hver brikke. Flere strekkoder per mal er hele
  poenget: produsenter bytter EAN-koder mellom
  emballasjeproduksjoner, og et gammelt nøste og et ferskt kan ha
  ulike koder for samme produkt.
- Felt for merke / navn / tykkelse / fiber / fasthet / pinne /
  meter / gram.

**Søkefeltet** over listen søker i alt (merke, navn, tykkelse,
fiber, strekkoder). Tåler aksenter: "jarbo" finner Järbo.

## Duplikater

Ender du opp med to maler for samme garn (tom tykkelse den ene
gangen, "DK" den andre, eller en liten skrivefeil i navnet), legger
Purl merke til det: et **Mulige duplikater**-kort dukker opp øverst
i listen. Trykk **Slå sammen** på en gruppe, og de foldes sammen:
strekkodene forenes, tomme felt fylles fra de andre, og den mest
komplette oppføringen beholdes som hovedoppføring.

Du kan også unngå duplikater i utgangspunktet: appen bruker merke +
navn som identitet ved lagring (med merke + navn + tykkelse som
første forsøk), så en tom tykkelse lager ikke en ny gren.

## Koble en skannet kode til en eksisterende mal

Skanner du en ukjent kode, men ser det riktige produktet i
biblioteket ditt (eller i katalogen), trykk **Eller fest denne
strekkoden til en eksisterende mal** i skjemaet. En velger åpnes
(søkbar på tvers av dine maler og katalogen). Trykk på produktet,
strekkoden festes, og du slipper to maler for samme garn.

## Dele maler med en venn

**Mer → Strekkode-maler → delingsikonet** i toppen. Purl skriver en
`.purlt`-fil med hele malbiblioteket ditt og åpner systemets
delingsark. Send på e-post, Drive eller AirDrop.

Vennen din mottar filen, trykker på den (på Android med Purl
installert), og Purl åpner rett i importskjermen og fletter:

- Maler som matcher på merke + navn + tykkelse får strekkodene
  slått sammen.
- Nye produkter legges inn som ferske oppføringer.

Ingen garn, prosjekter eller bilder følger med. Bare malkatalogen.

## Svinghjulet

Over tid:

1. Du skanner garn → maler samler seg i biblioteket ditt.
2. Du deler `.purlt` med testkontakten din (eller den blir med i de
   vanlige `.purl`-sikkerhetskopiene dine).
3. De nye malene foldes inn i den innebygde katalogen i en senere
   Purl-utgave.
4. Nestemann som installerer Purl får malene dine som en del av
   katalogen, klare til gjenkjenning fra dag én.

Hele katalogen er bygd slik. Innfoldingen er manuell med vilje:
Purl har ingen server, så ingenting forlater enheten din uten at
du selv velger å dele det.

## Se også

- [Stash](./yarn-stash.md): skann-inn-i-stashen-flyten fra
  brukerens side.
- [Sikkerhetskopier og gjenoppretting](./backups.md): `.purlt` er
  ett av tre delingsformater; de andre to er `.purl` (hel
  sikkerhetskopi) og `.purlp` (enkeltoppskrift).
