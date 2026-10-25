// ============================================================================
//  neuro.js (moduł ES) — „Neuro EN": angielskie nazwy struktur mózgu i neuronu.
//  Plansze to własne, uproszczone rysunki SVG (bez cudzych grafik). Każdy
//  element planszy: numer, akceptowane odpowiedzi EN, nazwa PL (podpowiedź),
//  punkt docelowy (x, y) i miejsce znacznika z numerem (lx, ly).
// ============================================================================

// Kolory rysunków są stałe (plansza ma jasne „papierowe" tło w obu motywach).
const INK = "#3a3f52";
const SULCUS = `fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"`;
const FINE = `fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity="0.55"`;

// ── Mózg — widok boczny (lewa półkula, przód po lewej) ──────────────────────
const LAT_OUTLINE =
  "M 110 250 C 80 190 100 105 180 70 C 250 40 360 35 440 60 C 520 85 575 145 565 215 " +
  "C 560 255 535 280 505 290 C 470 298 440 292 415 290 C 380 305 330 318 280 315 " +
  "C 235 312 200 300 190 282 C 185 270 178 264 168 263 C 148 264 124 262 110 250 Z";
const LAT_CS = "M 338 40 C 325 90 305 118 310 150 C 315 182 292 202 292 230";
const LAT_LS = "M 182 262 C 240 248 300 236 340 228 C 365 222 385 214 400 202";

const BRAIN_LATERAL_SVG = `
<defs><clipPath id="nb-lat-clip"><path d="${LAT_OUTLINE}"/></clipPath></defs>
<path d="M 362 282 C 346 300 344 336 362 350 C 368 370 372 400 376 438 L 402 438 C 402 404 404 372 408 348 C 414 322 414 300 404 282 Z"
  fill="#e9d3bd" stroke="${INK}" stroke-width="2"/>
<path d="M 364 352 C 380 358 396 356 408 348" ${FINE}/>
<path d="M 375 395 L 403 395" ${FINE}/>
<path d="M 400 300 C 420 280 470 270 520 278 C 560 286 572 318 556 340 C 538 362 490 366 450 356 C 420 348 400 330 400 300 Z"
  fill="#d9c7e6" stroke="${INK}" stroke-width="2"/>
<path d="M 420 318 C 460 306 510 304 552 318 M 430 334 C 470 326 510 326 548 334 M 440 348 C 470 344 505 344 530 348 M 412 304 C 450 292 500 290 540 300" ${FINE}/>
<g clip-path="url(#nb-lat-clip)">
  <rect x="0" y="0" width="640" height="440" fill="#cfe3d2"/>
  <path d="M 0 0 L 338 0 L 338 40 C 325 90 305 118 310 150 C 315 182 292 202 292 236 L 182 262 L 0 262 Z" fill="#f6d7b0"/>
  <path d="M 0 262 L 182 262 C 240 248 300 236 340 228 C 365 222 385 214 400 202 C 425 218 455 232 482 236 L 470 440 L 0 440 Z" fill="#c9daf2"/>
  <path d="M 490 0 L 640 0 L 640 440 L 470 440 L 470 296 C 476 232 494 150 490 62 Z" fill="#f3c9cf"/>
  <path d="M 300 52 C 288 95 268 125 272 155 C 276 185 255 205 256 238" ${FINE}/>
  <path d="M 372 52 C 362 95 346 125 350 158 C 352 180 340 198 336 222" ${FINE}/>
  <path d="M 130 150 C 170 130 220 120 268 118 M 140 205 C 175 192 215 185 262 182" ${FINE}/>
  <path d="M 362 140 C 400 128 440 125 480 140 C 500 150 515 168 520 190" ${FINE}/>
  <path d="M 210 282 C 270 270 340 262 410 248 C 440 244 465 250 480 262" ${FINE}/>
  <path d="M 240 300 C 300 294 360 288 430 278" ${FINE}/>
  <path d="M 500 120 C 520 150 530 190 525 230 M 520 250 C 535 255 548 248 555 235" ${FINE}/>
  <ellipse cx="228" cy="230" rx="34" ry="17" fill="#e7a873" fill-opacity="0.55" stroke="${INK}" stroke-width="1.4" stroke-dasharray="4 3"/>
  <ellipse cx="420" cy="238" rx="36" ry="17" fill="#8fb0e3" fill-opacity="0.6" stroke="${INK}" stroke-width="1.4" stroke-dasharray="4 3"/>
</g>
<path d="${LAT_CS}" ${SULCUS} stroke-width="3"/>
<path d="${LAT_LS}" ${SULCUS} stroke-width="3"/>
<path d="M 490 62 C 494 80 492 92 488 100" ${SULCUS}/>
<path d="${LAT_OUTLINE}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;

// ── Mózg — przekrój pośrodkowy (przód po lewej) ─────────────────────────────
const SAG_OUTLINE =
  "M 112 248 C 82 186 104 104 184 68 C 256 38 366 34 446 60 C 524 86 576 148 566 218 " +
  "C 562 250 544 272 520 284 C 490 292 450 290 420 282 C 380 280 350 270 320 268 " +
  "C 290 268 262 272 240 274 C 210 276 180 272 160 266 C 140 262 122 258 112 248 Z";

const BRAIN_SAGITTAL_SVG = `
<defs><clipPath id="nb-sag-clip"><path d="${SAG_OUTLINE}"/></clipPath></defs>
<path d="M 392 296 C 420 268 480 262 528 282 C 566 300 572 340 548 362 C 520 384 460 382 426 360 C 404 346 392 322 392 296 Z"
  fill="#d9c7e6" stroke="${INK}" stroke-width="2"/>
<path d="M 470 322 L 430 300 M 470 322 L 440 345 M 470 322 L 520 290 M 470 322 L 535 330 M 470 322 L 505 365 M 500 304 L 515 285 M 500 340 L 520 352" stroke="#f7f1fb" stroke-width="5" stroke-linecap="round"/>
<g clip-path="url(#nb-sag-clip)">
  <rect x="0" y="0" width="640" height="440" fill="#f2e3cf"/>
  <path d="M 150 200 C 160 120 250 82 340 84 C 430 86 500 130 506 196 C 470 150 410 126 340 126 C 260 126 190 150 150 200 Z" fill="#cfe3d2"/>
  <path d="M 150 200 C 160 120 250 82 340 84 C 430 86 500 130 506 196" fill="none" stroke="${INK}" stroke-width="1.6"/>
  <path d="M 130 150 C 140 110 170 90 200 80 M 250 60 C 262 74 266 84 264 96 M 420 60 C 412 74 412 86 420 98 M 520 120 C 530 160 532 190 520 220" ${FINE}/>
</g>
<path d="${SAG_OUTLINE}" fill="none" stroke="${INK}" stroke-width="2.5"/>
<path d="M 214 206 C 200 180 230 150 300 146 C 370 142 430 150 450 182 C 460 198 452 214 434 214 C 420 214 418 200 408 194 C 380 178 330 176 290 180 C 254 184 240 196 244 210 C 240 224 222 222 214 206 Z"
  fill="#fbf2d8" stroke="${INK}" stroke-width="2"/>
<path d="M 312 258 C 304 272 306 290 318 300 C 302 312 302 346 326 358 C 330 380 334 405 338 438 L 368 438 C 368 405 370 380 374 360 C 388 350 392 330 388 306 C 394 290 394 272 386 258 Z"
  fill="#e9d3bd" stroke="${INK}" stroke-width="2"/>
<path d="M 318 300 C 340 304 366 304 388 306 M 326 358 C 342 362 360 362 374 360" ${FINE}/>
<path d="M 388 306 L 404 324 L 384 346 C 390 332 390 318 388 306 Z" fill="#b9e0f0" stroke="${INK}" stroke-width="1.5"/>
<ellipse cx="342" cy="244" rx="40" ry="22" fill="#f6c6a2" stroke="${INK}" stroke-width="2"/>
<path d="M 432 210 C 410 228 370 232 330 230 C 300 228 284 240 284 258" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
<path d="M 432 210 C 410 228 370 232 330 230 C 300 228 284 240 284 258" fill="none" stroke="#e8cf8f" stroke-width="5.5" stroke-linecap="round"/>
<path d="M 312 258 C 300 252 284 254 276 262 C 272 272 280 280 292 282 C 302 280 310 272 312 258 Z" fill="#f2a98e" stroke="${INK}" stroke-width="1.6"/>
<path d="M 268 280 C 258 276 246 278 238 283 C 246 290 260 290 270 286 Z" fill="#fff2a6" stroke="${INK}" stroke-width="1.5"/>
<path d="M 286 282 C 285 292 283 298 282 304" fill="none" stroke="${INK}" stroke-width="2.4"/>
<ellipse cx="281" cy="312" rx="11" ry="9" fill="#e7b2d8" stroke="${INK}" stroke-width="1.6"/>
<ellipse cx="396" cy="252" rx="8" ry="6" fill="#c7d98f" stroke="${INK}" stroke-width="1.5"/>`;

// ── Neuron ───────────────────────────────────────────────────────────────────
function myelin() {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const x = 206 + i * 62;
    s += `<rect x="${x}" y="198" width="54" height="24" rx="12" fill="#f6d7b0" stroke="${INK}" stroke-width="1.6"/>`;
  }
  return s;
}
const NEURON_SVG = `
<path d="M 128 198 C 112 170 92 150 60 132 M 98 160 C 92 140 96 120 104 100 M 60 132 C 44 128 30 120 22 108 M 60 132 C 50 142 36 148 22 150
  M 114 228 C 96 252 76 276 46 290 M 82 268 C 76 290 78 306 88 324 M 46 290 C 32 286 22 276 16 264
  M 150 182 C 150 150 160 120 176 96 M 160 140 C 176 132 188 120 196 104 M 176 96 C 170 82 172 66 180 54
  M 150 240 C 154 270 150 300 140 330 M 148 290 C 164 300 172 316 176 332" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M 128 198 C 112 170 92 150 60 132 M 98 160 C 92 140 96 120 104 100 M 60 132 C 44 128 30 120 22 108 M 60 132 C 50 142 36 148 22 150
  M 114 228 C 96 252 76 276 46 290 M 82 268 C 76 290 78 306 88 324 M 46 290 C 32 286 22 276 16 264
  M 150 182 C 150 150 160 120 176 96 M 160 140 C 176 132 188 120 196 104 M 176 96 C 170 82 172 66 180 54
  M 150 240 C 154 270 150 300 140 330 M 148 290 C 164 300 172 316 176 332" fill="none" stroke="#d9c7e6" stroke-width="3.5" stroke-linecap="round"/>
<path d="M 118 210 C 110 180 140 168 160 178 C 180 186 200 198 206 206 L 206 214 C 200 222 180 238 158 244 C 134 250 112 238 118 210 Z" fill="#d9c7e6" stroke="${INK}" stroke-width="2"/>
<path d="M 186 198 C 196 204 202 206 210 208 L 210 212 C 202 214 196 216 186 222 Z" fill="#c7b2da" stroke="none"/>
<circle cx="150" cy="210" r="16" fill="#9d84c4" stroke="${INK}" stroke-width="1.6"/>
<circle cx="146" cy="206" r="4" fill="#5d4a85"/>
<line x1="200" y1="210" x2="520" y2="210" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
<line x1="200" y1="210" x2="520" y2="210" stroke="#d9c7e6" stroke-width="2.5" stroke-linecap="round"/>
${myelin()}
<ellipse cx="295" cy="200" rx="10" ry="5" fill="#e7a873" stroke="${INK}" stroke-width="1.2"/>
<path d="M 520 210 C 540 210 548 180 566 166 M 520 210 C 545 210 556 200 580 196 M 520 210 C 546 212 556 228 576 236 M 520 210 C 538 214 546 246 560 264"
  fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
<g fill="#f3c9cf" stroke="${INK}" stroke-width="1.6">
  <circle cx="570" cy="162" r="8"/><circle cx="586" cy="196" r="8"/><circle cx="582" cy="239" r="8"/><circle cx="563" cy="270" r="8"/>
</g>`;

// ── Synapsa ──────────────────────────────────────────────────────────────────
const SYN_DOTS = [[300, 214], [312, 224], [292, 230], [322, 238], [306, 246], [334, 222], [286, 250]]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#d2504a"/>`).join("");
function vesicle(cx, cy) {
  return `<circle cx="${cx}" cy="${cy}" r="15" fill="#fbf2d8" stroke="${INK}" stroke-width="1.6"/>` +
    `<circle cx="${cx - 5}" cy="${cy - 4}" r="2.6" fill="#d2504a"/><circle cx="${cx + 5}" cy="${cy - 2}" r="2.6" fill="#d2504a"/>` +
    `<circle cx="${cx}" cy="${cy + 5}" r="2.6" fill="#d2504a"/>`;
}
function receptor(x) {
  return `<path d="M ${x - 9} 296 L ${x - 9} 276 C ${x - 9} 270 ${x - 3} 270 ${x - 3} 276 L ${x - 3} 296 Z M ${x + 3} 296 L ${x + 3} 276 C ${x + 3} 270 ${x + 9} 270 ${x + 9} 276 L ${x + 9} 296 Z" fill="#7fb6e0" stroke="${INK}" stroke-width="1.4"/>`;
}
const SYNAPSE_SVG = `
<path d="M 210 20 L 210 70 C 140 90 120 150 150 196 C 170 214 230 218 320 218 C 410 218 470 214 490 196 C 520 150 500 90 430 70 L 430 20"
  fill="#f6e3d0" stroke="none"/>
<path d="M 210 20 L 210 70 C 140 90 120 150 150 196 C 170 214 230 218 290 218 M 350 218 C 410 218 470 214 490 196 C 520 150 500 90 430 70 L 430 20"
  fill="none" stroke="${INK}" stroke-width="3"/>
<path d="M 290 218 C 296 236 344 236 350 218" fill="#f6e3d0" stroke="${INK}" stroke-width="3"/>
${vesicle(250, 130)}${vesicle(300, 105)}${vesicle(360, 135)}${vesicle(400, 170)}${vesicle(220, 180)}${vesicle(320, 170)}
<ellipse cx="440" cy="120" rx="34" ry="16" fill="#f2a98e" stroke="${INK}" stroke-width="1.6" transform="rotate(-20 440 120)"/>
<path d="M 414 128 C 422 116 430 130 438 118 C 446 106 452 122 462 112" fill="none" stroke="${INK}" stroke-width="1.3" transform="rotate(-20 440 120)"/>
<rect x="176" y="198" width="14" height="22" rx="3" fill="#c7d98f" stroke="${INK}" stroke-width="1.4" transform="rotate(-28 183 209)"/>
<rect x="190" y="202" width="14" height="22" rx="3" fill="#c7d98f" stroke="${INK}" stroke-width="1.4" transform="rotate(-28 197 213)"/>
<rect x="452" y="200" width="22" height="16" rx="7" fill="#e7a873" stroke="${INK}" stroke-width="1.4" transform="rotate(25 463 208)"/>
${SYN_DOTS}
<path d="M 120 296 C 220 292 420 292 520 296 L 540 420 L 100 420 Z" fill="#dfe9d6" stroke="none"/>
<path d="M 120 296 C 220 292 420 292 520 296" fill="none" stroke="${INK}" stroke-width="3"/>
${receptor(270)}${receptor(320)}${receptor(370)}${receptor(230)}
<path d="M 130 420 C 180 380 460 380 510 420" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.4"/>`;

export const NEURO_BOARDS = [
  {
    id: "brain-lateral",
    title: "Brain — lateral view",
    titlePl: "Mózg — widok boczny",
    viewBox: "0 0 640 450",
    svg: BRAIN_LATERAL_SVG,
    items: [
      { n: 1, en: ["frontal lobe"], pl: "płat czołowy", x: 190, y: 140, lx: 60, ly: 70 },
      { n: 2, en: ["parietal lobe"], pl: "płat ciemieniowy", x: 420, y: 100, lx: 460, ly: 22 },
      { n: 3, en: ["temporal lobe"], pl: "płat skroniowy", x: 300, y: 285, lx: 230, ly: 360 },
      { n: 4, en: ["occipital lobe"], pl: "płat potyliczny", x: 530, y: 200, lx: 612, ly: 160 },
      { n: 5, en: ["central sulcus", "central fissure", "rolandic fissure", "fissure of rolando"], pl: "bruzda środkowa", x: 330, y: 60, lx: 340, ly: 18 },
      { n: 6, en: ["lateral sulcus", "lateral fissure", "sylvian fissure", "sylvian sulcus"], pl: "bruzda boczna (Sylwiusza)", x: 330, y: 230, lx: 150, ly: 330 },
      { n: 7, en: ["precentral gyrus", "primary motor cortex", "motor cortex"], pl: "zakręt przedśrodkowy (kora ruchowa)", x: 305, y: 85, lx: 230, ly: 24 },
      { n: 8, en: ["postcentral gyrus", "primary somatosensory cortex", "somatosensory cortex"], pl: "zakręt zaśrodkowy (kora czuciowa)", x: 352, y: 100, lx: 560, ly: 50 },
      { n: 9, en: ["broca's area", "broca area", "broca's region"], pl: "ośrodek Broki", x: 228, y: 230, lx: 60, ly: 230 },
      { n: 10, en: ["wernicke's area", "wernicke area", "wernicke's region"], pl: "ośrodek Wernickego", x: 430, y: 238, lx: 610, ly: 250 },
      { n: 11, en: ["cerebellum"], pl: "móżdżek", x: 500, y: 335, lx: 612, ly: 360 },
      { n: 12, en: ["pons"], pl: "most", x: 372, y: 320, lx: 300, ly: 405 },
      { n: 13, en: ["medulla oblongata", "medulla"], pl: "rdzeń przedłużony", x: 388, y: 372, lx: 470, ly: 400 },
      { n: 14, en: ["spinal cord"], pl: "rdzeń kręgowy", x: 390, y: 420, lx: 470, ly: 435 },
    ],
  },
  {
    id: "brain-sagittal",
    title: "Brain — midsagittal section",
    titlePl: "Mózg — przekrój pośrodkowy",
    viewBox: "0 0 640 450",
    svg: BRAIN_SAGITTAL_SVG,
    items: [
      { n: 1, en: ["corpus callosum"], pl: "ciało modzelowate", x: 330, y: 160, lx: 330, ly: 18 },
      { n: 2, en: ["cingulate gyrus", "cingulate cortex"], pl: "zakręt obręczy", x: 250, y: 120, lx: 150, ly: 40 },
      { n: 3, en: ["fornix"], pl: "sklepienie", x: 392, y: 222, lx: 600, ly: 180 },
      { n: 4, en: ["thalamus"], pl: "wzgórze", x: 348, y: 248, lx: 600, ly: 218 },
      { n: 5, en: ["hypothalamus"], pl: "podwzgórze", x: 294, y: 266, lx: 90, ly: 250 },
      { n: 6, en: ["pituitary gland", "pituitary", "hypophysis"], pl: "przysadka mózgowa", x: 281, y: 314, lx: 150, ly: 380 },
      { n: 7, en: ["pineal gland", "pineal body", "epiphysis"], pl: "szyszynka (nasada)", x: 396, y: 252, lx: 600, ly: 256 },
      { n: 8, en: ["optic chiasm", "optic chiasma"], pl: "skrzyżowanie wzrokowe", x: 252, y: 284, lx: 90, ly: 310 },
      { n: 9, en: ["midbrain", "mesencephalon"], pl: "śródmózgowie", x: 348, y: 282, lx: 240, ly: 420 },
      { n: 10, en: ["pons"], pl: "most", x: 345, y: 332, lx: 420, ly: 425 },
      { n: 11, en: ["medulla oblongata", "medulla"], pl: "rdzeń przedłużony", x: 356, y: 392, lx: 290, ly: 440 },
      { n: 12, en: ["cerebellum"], pl: "móżdżek", x: 500, y: 330, lx: 610, ly: 360 },
      { n: 13, en: ["fourth ventricle", "4th ventricle"], pl: "komora czwarta", x: 394, y: 324, lx: 520, ly: 425 },
    ],
  },
  {
    id: "neuron",
    title: "Neuron",
    titlePl: "Neuron (komórka nerwowa)",
    viewBox: "0 0 640 380",
    svg: NEURON_SVG,
    items: [
      { n: 1, en: ["dendrite", "dendrites"], pl: "dendryt", x: 80, y: 145, lx: 40, ly: 40 },
      { n: 2, en: ["cell body", "soma", "perikaryon"], pl: "ciało komórki (perykarion)", x: 126, y: 234, lx: 50, ly: 350 },
      { n: 3, en: ["nucleus"], pl: "jądro komórkowe", x: 156, y: 214, lx: 250, ly: 345 },
      { n: 4, en: ["axon hillock"], pl: "wzgórek aksonu", x: 202, y: 210, lx: 230, ly: 120 },
      { n: 5, en: ["axon"], pl: "akson (neuryt)", x: 202 + 62 * 4 + 58, y: 210, lx: 480, ly: 300 },
      { n: 6, en: ["myelin sheath", "myelin"], pl: "osłonka mielinowa", x: 350, y: 220, lx: 330, ly: 300 },
      { n: 7, en: ["node of ranvier", "nodes of ranvier", "ranvier node"], pl: "przewężenie Ranviera", x: 386, y: 210, lx: 410, ly: 110 },
      { n: 8, en: ["schwann cell", "schwann cells"], pl: "komórka Schwanna", x: 295, y: 198, lx: 300, ly: 110 },
      { n: 9, en: ["axon terminal", "axon terminals", "terminal branches", "telodendria"], pl: "zakończenia aksonu (telodendron)", x: 548, y: 214, lx: 610, ly: 120 },
      { n: 10, en: ["synaptic bouton", "terminal button", "terminal bouton", "synaptic knob", "synaptic terminal", "terminal buttons"], pl: "kolbka synaptyczna", x: 563, y: 270, lx: 610, ly: 330 },
    ],
  },
  {
    id: "synapse",
    title: "Chemical synapse",
    titlePl: "Synapsa chemiczna",
    viewBox: "0 0 640 430",
    svg: SYNAPSE_SVG,
    items: [
      { n: 1, en: ["synaptic vesicle", "synaptic vesicles", "vesicle"], pl: "pęcherzyk synaptyczny", x: 250, y: 130, lx: 80, ly: 100 },
      { n: 2, en: ["neurotransmitter", "neurotransmitters"], pl: "neuroprzekaźnik", x: 322, y: 238, lx: 600, ly: 250 },
      { n: 3, en: ["synaptic cleft", "synaptic gap"], pl: "szczelina synaptyczna", x: 420, y: 260, lx: 600, ly: 300 },
      { n: 4, en: ["receptor", "receptors", "postsynaptic receptor", "postsynaptic receptors"], pl: "receptor postsynaptyczny", x: 370, y: 276, lx: 450, ly: 360 },
      { n: 5, en: ["presynaptic membrane"], pl: "błona presynaptyczna", x: 250, y: 216, lx: 80, ly: 260 },
      { n: 6, en: ["postsynaptic membrane"], pl: "błona postsynaptyczna", x: 180, y: 295, lx: 80, ly: 360 },
      { n: 7, en: ["reuptake transporter", "reuptake pump", "transporter"], pl: "transporter wychwytu zwrotnego", x: 463, y: 208, lx: 600, ly: 190 },
      { n: 8, en: ["mitochondrion", "mitochondria"], pl: "mitochondrium", x: 440, y: 120, lx: 600, ly: 80 },
      { n: 9, en: ["voltage-gated calcium channel", "calcium channel", "voltage gated calcium channel", "voltage-gated ca channel"], pl: "kanał wapniowy bramkowany napięciem", x: 190, y: 210, lx: 60, ly: 180 },
      { n: 10, en: ["presynaptic terminal", "axon terminal", "presynaptic neuron", "synaptic bouton", "terminal button"], pl: "zakończenie presynaptyczne (kolbka)", x: 320, y: 50, lx: 320, ly: 14 },
      { n: 11, en: ["postsynaptic neuron", "postsynaptic cell", "dendrite"], pl: "neuron postsynaptyczny (dendryt)", x: 320, y: 360, lx: 320, ly: 415 },
    ],
  },
];

export function boardById(id) { return NEURO_BOARDS.find((b) => b.id === id) || null; }

/** Rysunek + znaczniki z numerami (klikalne: data-n). */
export function boardSvgMarkup(board) {
  const marks = board.items.map((it) =>
    `<g class="nb-mark" data-n="${it.n}">` +
      `<line class="nb-lead" x1="${it.lx}" y1="${it.ly}" x2="${it.x}" y2="${it.y}"/>` +
      `<circle class="nb-dot" cx="${it.x}" cy="${it.y}" r="3.5"/>` +
      `<circle class="nb-pin" cx="${it.lx}" cy="${it.ly}" r="13"/>` +
      `<text class="nb-num" x="${it.lx}" y="${it.ly}" text-anchor="middle" dominant-baseline="central">${it.n}</text>` +
    `</g>`).join("");
  return `<svg class="nb-svg" viewBox="${board.viewBox}" role="img" aria-label="${board.titlePl}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect class="nb-paper" x="0" y="0" width="100%" height="100%" rx="18"/>` +
    board.svg + `<g class="nb-marks">${marks}</g></svg>`;
}

// ── Sprawdzanie odpowiedzi ───────────────────────────────────────────────────
/** Wielkość liter, spacje, myślniki, apostrofy i polskie znaki nie mają znaczenia. */
export function normalizeAnswer(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´]/g, "")
    .replace(/[-_.,;:/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** "ok" | "typo" (drobna literówka — nie liczy się jako poprawna) | "bad" | "empty". */
export function gradeAnswer(input, item) {
  const v = normalizeAnswer(input);
  if (!v) return "empty";
  const accepted = item.en.map(normalizeAnswer);
  if (accepted.includes(v)) return "ok";
  const tol = (w) => (w.length >= 10 ? 2 : w.length >= 5 ? 1 : 0);
  if (accepted.some((a) => editDistance(v, a) <= tol(a))) return "typo";
  return "bad";
}
