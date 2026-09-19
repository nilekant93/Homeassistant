# Kotitabletti

Home Assistantin custom card, joka on koko käyttöliittymä seinätabletille.
Suunniteltu kiinteään 1280 × 800 vaakanäyttöön, jota katsotaan HA:n
mobiilisovelluksessa kioskitilassa.

Toteutettuna **Koti**, **Valot** ja **Asetukset**. Sivupalkin muut kohdat (Imuri,
Kauppalista, Junat) näkyvät himmennettyinä eivätkä reagoi kosketukseen.

## Asennus HACS:lla

1. HACS → ⋮ → *Mukautetut tietovarastot*
2. Liitä tämän repon URL, tyypiksi **Lovelace**
3. Etsi "Kotitabletti" ja asenna
4. Lisää resurssi jos HACS ei tee sitä automaattisesti:
   *Asetukset → Kojelaudat → ⋮ → Resurssit*, tyyppi **JavaScript-moduuli**
5. Luo uusi kojelauta ja liitä `examples/dashboard.yaml` sen raakaeditoriin

Kohta 4 vaatii että profiilissa on *Lisäasetukset* päällä.

## Konfiguraatio

Koko käyttöliittymä on yksi kortti yhdessä `type: panel` -näkymässä, koska
sivupalkki on pysyvä — erilliset HA-näkymät renderöisivät sen uudelleen joka
napautuksella. Kortti hoitaa reitityksen itse.

Täysi esimerkki on `examples/dashboard.yaml`. Keskeiset avaimet:

| Avain | Merkitys |
|---|---|
| `start_page` | Sivu jolla käynnistytään |
| `idle_return_minutes` | Paluu aloitussivulle koskettamattomuuden jälkeen, 0 = ei koskaan |
| `default_theme` | `light` tai `dark` |
| `theme_entity` | Valinnainen kytkinentiteetti teemalle; päällä = tumma |
| `nav` / `settings_nav` | Sivupalkin kohdat |
| `home.weather` | Sääentiteetti ja ennustepäivien määrä |
| `home.calendar` | Viikkonumerot ja mistä "seuraava juhlapyhä" luetaan |
| `home.lights` | Etusivun neljä valoa; `style: dimmer` tai `switch` |
| `settings.kiosk_toggle` | `input_boolean` jota kioskitilan kytkin ohjaa |

Ilman `theme_entity`ä teemavalinta tallentuu tabletin omaan localStorageen.
Se riittää yhdelle laitteelle eikä vaadi Home Assistantiin mitään.

## Kehitys

```bash
npm install
npm run dev      # esikatselu osoitteessa http://localhost:5173
```

Esikatselu (`index.html`) ajaa kortin simuloidulla `hass`-objektilla, joten
Home Assistantia ei tarvita kehitykseen. Osoiteparametrit `?page=asetukset` ja
`?theme=dark` ovat kätevät iteroidessa.

```bash
npm run build    # dist/kotitabletti.js
npm run typecheck
```

`dist/` on versionhallinnassa tarkoituksella: HACS asentaa valmiin tiedoston
suoraan reposta eikä aja buildia. **Muista siis buildata ja commitoida `dist/`
ennen kuin julkaiset muutoksen.**

Build tuottaa yhden itsenäisen ES-moduulin. Fontit (IBM Plex Sans, Space
Grotesk) on upotettu data-URI:na, joten tabletti ei tarvitse internetyhteyttä
typografiaan.

## Rakenne

| Tiedosto | Vastuu |
|---|---|
| `src/main.ts` | Rekisteröinti Lovelacen korttivalitsimeen |
| `src/app.ts` | Kuori: teema, reititys, idle-paluu |
| `src/theme.ts` | Designtokenit molemmille paleteille |
| `src/icons.ts` | Ikonit, myös säätilat |
| `src/format.ts` | Suomenkieliset päivämäärät, viikkonumerot, värinimet |
| `src/components/` | Sivupalkki, valokortti, sääkortti, kalenteri |
| `src/pages/` | Koti, Asetukset |

Väripaletti määritellään **vain** `app.ts`:n juuressa. CSS-muuttujat periytyvät
shadow DOM:n läpi, joten alikomponentit eivät saa määritellä niitä uudelleen —
muuten tumma teema ylikirjoittuisi vaalealla.

Sääennuste tulee WebSocket-tilauksesta (`weather/subscribe_forecast`), ei
entiteetin attribuuteista — HA siirsi ennusteet pois attribuuteista versiossa
2023.9.
