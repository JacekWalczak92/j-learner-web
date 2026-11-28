// ============================================================================
//  percep.js (moduł ES) — „Intro to psychology → Zajęcia 2: Sensation &
//  perception". Materiał z drugich ćwiczeń (słowniczek 12 pojęć + arkusz
//  „Worksheet: Sensation & Perception”): treść po angielsku jak w źródle.
//
//  • PERCEP_DECKS — talie fiszek (przód = pojęcie, tył = definicja, notatka = PL),
//  • PERCEP_FILL  — zdania z lukami w formacie FILL_SETS z neuro.js,
//  • PERCEP_TOPICS — ćwiczenia z wyjaśnieniem KAŻDEJ odpowiedzi; generator jak
//    w stats-sense.js ({ id, topic, title, make(used) } → { q, fig?, choices,
//    correct, explain, hint, why }), więc działa na silniku startStats z app.js,
//  • PERCEP_LABS — eksperymenty jak w stats-lab.js ({ id, title, sub, icon, mount(host) }).
//
//  Logo z arkusza opisujemy słowami — nie kopiujemy cudzych znaków towarowych.
//  Kolory rysunków z CSS (klasy pc-*), więc działają w obu motywach.
// ============================================================================

// ── Losowanie ────────────────────────────────────────────────────────────────
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

// ════════════════════════════════════════════════════════════════════════════
//  POJĘCIA (słowniczek z zajęć + pojęcia z arkusza)
// ════════════════════════════════════════════════════════════════════════════
/** [pojęcie, definicja, polski odpowiednik] — słowniczek „perception” 1–12, słowo w słowo. */
const GLOSSARY = [
  ["absolute threshold", "The minimum amount of physical energy needed to notice a stimulus.", "próg absolutny"],
  ["receptor", "Specialized cells which transform energy in the environment into neural impulses that can be interpreted by the brain.", "receptor"],
  ["difference threshold", "The lowest level of stimulation required to sense that a change in stimulation has occurred.", "próg różnicy (JND)"],
  ["sensory adaptation", "Tendency of sensory systems to respond less to stimuli that continue without change.", "adaptacja sensoryczna"],
  ["perception", "The organization of sensations in a meaningful shape or pattern.", "percepcja, spostrzeganie"],
  ["vestibular sense", "It provides information on the position of the body in space by sensing gravity and movement.", "zmysł przedsionkowy (równowagi)"],
  ["vision", "Sense sensitive to electromagnetic spectrum.", "wzrok"],
  ["hearing", "Sense sensitive to air vibrations (sound waves).", "słuch"],
  ["smell", "Sense sensitive to molecules of gas emitted by substances and suspended in the air.", "węch"],
  ["taste", "It occurs as receptors in taste buds on the tongue and throughout the mouth transform chemical information into neural information, which is integrated with olfactory information in the brain.", "smak"],
  ["touch", "It involves sensing pressure, temperature and pain.", "dotyk"],
  ["kinesthesia", "It provides information about the movement and position of the limbs and other parts of the body relative to one another.", "kinestezja (czucie ułożenia i ruchu)"],
];

/** Pojęcia z arkusza i z omówienia ćwiczeń. */
const CONCEPTS = [
  ["sensation", "The process by which sense organs gather information about the environment and transmit it to the brain for initial processing.", "wrażenie, odbiór zmysłowy"],
  ["sensation vs perception", "Sensation = collecting information through the senses and sending it to the brain. Perception = organizing and interpreting those sensations into a meaningful mental representation of the world.", "wrażenie a spostrzeżenie"],
  ["transduction", "Converting physical energy (light, sound waves, chemicals, pressure) into neural impulses — the job of receptors.", "transdukcja"],
  ["three basic principles of sensation", "Absolute threshold, difference threshold and sensory adaptation.", "trzy podstawowe zasady odbioru wrażeń"],
  ["just noticeable difference (JND)", "Another name for the difference threshold: the smallest change in a stimulus that a person can detect.", "najmniejsza dostrzegalna różnica"],
  ["Weber’s law", "The difference threshold is a constant proportion of the original stimulus: the stronger the stimulus, the bigger the change needed to notice it.", "prawo Webera"],
  ["painful neuropathy", "A condition in which damaged or dysfunctional nerves generate pain signals, sometimes even without an external painful stimulus.", "neuropatia bólowa"],
  ["bottom-up processing", "Perception that starts from the sensory data and builds up to a whole (from features to meaning).", "przetwarzanie oddolne"],
  ["top-down processing", "Perception guided by what we already have in mind: context, expectations, experience, knowledge, emotions and perceptual set.", "przetwarzanie odgórne"],
  ["perceptual set", "A readiness to perceive something in a particular way, shaped by expectations, context and past experience.", "nastawienie percepcyjne"],
  ["selective attention", "Focusing on some stimuli while ignoring others (e.g. counting the passes of the white team).", "uwaga selektywna"],
  ["inattentional blindness", "Failing to notice a clearly visible object because attention is focused elsewhere (e.g. the gorilla in the basketball video).", "ślepota z nieuwagi"],
  ["McGurk effect", "What we see (lip movements) changes what we hear: the sound “ba” with lips saying “ga” is heard as “da”. The brain integrates information from different senses.", "efekt McGurka"],
  ["optical illusion", "A stimulus that is consistently perceived differently from what it physically is — it shows that perception is an active construction of the brain.", "złudzenie optyczne"],
];

/** Zasady Gestalt — [nazwa, definicja, PL, przykład]. */
const GESTALT = [
  ["figure-ground", "We separate what we see into a figure (the object we focus on) and the ground (the background). The same image can switch which part is the figure.", "figura i tło", "Rubin’s vase (a vase or two faces); the arrow hidden between “E” and “x” in the FedEx logo; the bear hidden in the mountain of the Toblerone logo."],
  ["closure", "We fill in missing parts and perceive incomplete shapes as complete, whole objects.", "domknięcie", "The IBM logo: letters made only of stripes are still read as solid letters."],
  ["proximity", "Elements that are close to each other are perceived as one group.", "bliskość", "Dots in pairs of columns are seen as pairs, not as single dots."],
  ["similarity", "Elements that look alike (shape, colour, size) are perceived as belonging together.", "podobieństwo", "Rows of circles and rows of squares are seen as rows."],
  ["continuity", "We prefer to see smooth, continuous lines and patterns rather than abrupt changes of direction.", "ciągłość (dobra kontynuacja)", "Two crossing lines are seen as two lines, not as four pieces meeting in the middle."],
  ["symmetry", "Symmetrical elements are perceived as belonging together and forming a single, balanced whole.", "symetria", "[ ] { } [ ] is seen as three pairs of brackets."],
];
const GESTALT_NAMES = GESTALT.map((g) => g[0]);
const gestaltDef = (name) => GESTALT.find((g) => g[0] === name)[1];

// ── Fiszki ───────────────────────────────────────────────────────────────────
const card = ([front, back, pl], extra) => ({ front, back, note: ["PL: " + pl, extra].filter(Boolean).join(" · ") });
const DECK_TERMS = GLOSSARY.map((g) => card(g));
const DECK_CONCEPTS = CONCEPTS.map((c) => card(c));
const DECK_GESTALT = GESTALT.map((g) => card(g, "Example: " + g[3]));
export const PERCEP_DECKS = [
  { id: "all", title: "Wszystkie pojęcia", sub: "Słowniczek + arkusz + zasady Gestalt", cards: [...DECK_TERMS, ...DECK_CONCEPTS, ...DECK_GESTALT] },
  { id: "terms", title: "Key terms", sub: "Słowniczek z zajęć: progi, adaptacja, zmysły", cards: DECK_TERMS },
  { id: "concepts", title: "Sensation & perception", sub: "Pojęcia z arkusza: top-down, uwaga, McGurk", cards: DECK_CONCEPTS },
  { id: "gestalt", title: "Gestalt principles", sub: "Figura–tło, domknięcie, bliskość, podobieństwo…", cards: DECK_GESTALT },
];

// ── Zdania z lukami ──────────────────────────────────────────────────────────
export const PERCEP_FILL = [
  {
    id: "pc-terms",
    title: "Key terms — definitions",
    sub: "Słowniczek z zajęć: 12 pojęć",
    bank: GLOSSARY.map((g) => g[0]),
    sentences: [
      "The {absolute threshold} is the minimum amount of physical energy needed to notice a stimulus. The {difference threshold|just noticeable difference|JND} is the lowest level of stimulation required to sense that a change in stimulation has occurred.",
      "{Receptors|receptor} are specialized cells which transform energy in the environment into neural impulses that can be interpreted by the brain. {Sensory adaptation} is the tendency of sensory systems to respond less to stimuli that continue without change.",
      "{Perception} is the organization of sensations in a meaningful shape or pattern.",
      "The {vestibular sense|vestibular} provides information on the position of the body in space by sensing gravity and movement, while {kinesthesia} provides information about the movement and position of the limbs and other parts of the body relative to one another.",
      "{Vision} is the sense sensitive to electromagnetic spectrum, {hearing} is sensitive to air vibrations (sound waves) and {smell} is sensitive to molecules of gas emitted by substances and suspended in the air.",
      "{Taste} occurs as receptors in taste buds on the tongue and throughout the mouth transform chemical information into neural information, which is integrated with olfactory information in the brain. {Touch} involves sensing pressure, temperature and pain.",
    ],
  },
  {
    id: "pc-worksheet",
    title: "Worksheet — key ideas",
    sub: "Zasady odbioru wrażeń, top-down, Gestalt, uwaga",
    bank: ["absolute threshold", "difference threshold", "sensory adaptation", "painful neuropathy", "sensation", "perception",
      "context", "knowledge", "emotions", "figure-ground", "closure", "inattentional blindness", "selective attention", "McGurk effect"],
    sentences: [
      "{Sensation} is collecting information through the senses and sending it to the brain; {perception} is organizing and interpreting sensations into a mental representation of the world.",
      "The three basic principles of sensation are {@p:absolute threshold}, {@p:difference threshold} and {@p:sensory adaptation}.",
      "{Painful neuropathy|neuropathy} is a condition in which damaged or dysfunctional nerves generate pain signals, sometimes even without an external painful stimulus.",
      "We can read “Th_ br_in us_s cont_xt” because the brain uses {context} and prior experience to fill in the missing letters. A doctor sees more on an X-ray than you do because of medical {knowledge} and experience. Two students interpret the same whispering differently because of their {emotions}, previous experiences and expectations.",
      "The arrow hidden between “E” and “x” in the FedEx logo is an example of {figure-ground}. Letters made only of stripes in the IBM logo are seen as whole letters thanks to {closure}.",
      "Many viewers do not see the gorilla because of {selective attention} to the passes — this failure to notice something visible is called {inattentional blindness}. In the {McGurk effect|McGurk} the lip movements we see change the sound we hear.",
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════════
//  ĆWICZENIA — każda odpowiedź ma wyjaśnienie
// ════════════════════════════════════════════════════════════════════════════
const G = (id, topic, title, make) => ({ id, topic, title, make });
/** Pytanie z odpowiedzi [[tekst, wyjaśnienie], …] — pierwsza jest poprawna; kolejność losowana. */
function mcq(q, a, hint, why, fig) {
  const order = shuffle(a.map((_, i) => i));
  return { q, fig, choices: order.map((i) => a[i][0]), explain: order.map((i) => a[i][1]), correct: order.indexOf(0), hint, why };
}
/** Generator z banku pytań: w jednej sesji pytania się nie powtarzają (dopóki starczy banku). */
function bankGen(id, topic, title, bank) {
  return G(id, topic, title, (used) => {
    const key = "pc-bank:" + topic;
    const fresh = bank.filter((_, i) => !(used && used.has(key + "#" + i)));
    const idx = bank.indexOf(fresh.length ? pick(fresh) : pick(bank));
    if (used) used.add(key + "#" + idx);
    const b = typeof bank[idx] === "function" ? bank[idx]() : bank[idx];
    return mcq(b.q, b.a, b.hint, b.why, b.fig);
  });
}
const em = (t) => `<b>${t}</b>`;

// ── 1. Pojęcia: definicja ↔ nazwa ────────────────────────────────────────────
function termQuestion(used, key, reverse) {
  const fresh = GLOSSARY.filter((g) => !(used && used.has(key + g[0])));
  const t = pick(fresh.length ? fresh : GLOSSARY);
  if (used) used.add(key + t[0]);
  const others = shuffle(GLOSSARY.filter((g) => g !== t)).slice(0, 3);
  const why = `${em(t[0])} (PL: ${t[2]}) — ${t[1]}`;
  if (!reverse) {
    return mcq(`Which term matches this definition?<br><i>“${t[1]}”</i>`,
      [[t[0], `Yes — this is the definition of the ${t[0]}.`], ...others.map((o) => [o[0], `No — ${em(o[0])} means: ${o[1]}`])],
      "Look for the key words: minimum energy? change? position of the body? a chemical sense?", why);
  }
  return mcq(`What is the ${em(t[0])}?`,
    [[t[1], `Yes — this is the ${t[0]}.`], ...others.map((o) => [o[1], `No — this is the definition of the ${em(o[0])}.`])],
    `PL: ${t[2]}.`, why);
}
const termDef = G("p-term-def", "terms", "Definition → term", (used) => termQuestion(used, "pc-td:", false));
const termName = G("p-term-name", "terms", "Term → definition", (used) => termQuestion(used, "pc-tn:", true));
const termDef2 = G("p-term-def2", "terms", "Definition → term", (used) => termQuestion(used, "pc-td:", false));

// ── 2. Który zmysł? ──────────────────────────────────────────────────────────
const SENSES = ["vision", "hearing", "smell", "taste", "touch", "vestibular sense", "kinesthesia"];
const senseDef = (s) => GLOSSARY.find((g) => g[0] === s)[1];
const SENSE_CASES = [
  ["With your eyes closed you can still touch the tip of your nose with your finger.", "kinesthesia", "You know where your arm and finger are relative to the rest of your body — that is kinesthesia, not touch (nothing touches you until the very end)."],
  ["A dancer knows that their arm is fully stretched without looking at it.", "kinesthesia", "Position of a limb relative to the body comes from receptors in muscles and joints — kinesthesia."],
  ["Receptors in your muscles and joints tell you how much your knee is bent.", "kinesthesia", "Bending of a joint = position of a body part relative to another part — kinesthesia."],
  ["After spinning on an office chair, the room seems to keep turning and you feel dizzy.", "vestibular sense", "Rotation and balance are sensed in the inner ear — the vestibular sense (position of the body in space, gravity, movement)."],
  ["In a lift that suddenly starts going down, you feel your whole body “drop”, even with your eyes closed.", "vestibular sense", "The vestibular sense registers acceleration and gravity — the position and movement of the whole body in space."],
  ["You keep your balance on one leg on a moving tram.", "vestibular sense", "Balance = sensing gravity and movement of the body in space — the vestibular sense."],
  ["You notice a cup of tea is too hot as soon as your fingers touch it.", "touch", "Touch involves sensing pressure, temperature and pain — here temperature."],
  ["A pin-prick on your finger feels sharp and painful.", "touch", "Pain sensed in the skin belongs to touch (pressure, temperature, pain)."],
  ["You recognise a friend’s voice behind you in a noisy corridor.", "hearing", "Hearing is sensitive to air vibrations (sound waves)."],
  ["You hear the bass from a neighbour’s party through the wall.", "hearing", "Vibrations carried as sound waves are detected by hearing."],
  ["With a blocked nose, an apple and a raw potato taste almost the same. Which sense is mostly missing?", "smell", "Flavour = taste integrated with olfactory information. Without smell, taste alone (sweet, sour…) cannot tell them apart."],
  ["You smell smoke before you see any fire.", "smell", "Smell detects molecules of gas emitted by substances and suspended in the air."],
  ["You can tell that coffee is bitter and lemonade is sour.", "taste", "Bitter and sour are detected by receptors in taste buds — taste."],
  ["You see all the colours of a rainbow.", "vision", "Colours are different wavelengths of light — vision is sensitive to the electromagnetic spectrum."],
];
function senseTask(used) {
  const fresh = SENSE_CASES.filter((_, i) => !(used && used.has("pc-sense#" + i)));
  const c = pick(fresh.length ? fresh : SENSE_CASES);
  if (used) used.add("pc-sense#" + SENSE_CASES.indexOf(c));
  const pool = c[1] === "kinesthesia" || c[1] === "vestibular sense" ? ["kinesthesia", "vestibular sense", "touch"] : SENSES;
  const near = shuffle(pool.filter((s) => s !== c[1])).slice(0, 2);
  const wrong = near.concat(shuffle(SENSES.filter((s) => s !== c[1] && !near.includes(s)))).slice(0, 3);
  return mcq(c[0].endsWith("?") ? c[0] : `${c[0]}<br>Which sense is it?`,
    [[c[1], c[2]], ...wrong.map((s) => [s, `${em(s)}: ${senseDef(s)} That is not what this situation is about.`])],
    "Vestibular = the whole body in space (balance, gravity). Kinesthesia = limbs relative to each other. Touch = pressure, temperature, pain.",
    `${em(c[1])} — ${senseDef(c[1])}`);
}
const sense1 = G("p-sense", "senses", "Which sense?", senseTask);

// ── 3. Progi i adaptacja ─────────────────────────────────────────────────────
const PRINC = {
  abs: ["Absolute threshold", "The absolute threshold is the minimum energy needed to notice a stimulus at all (yes / no — do I notice it?)."],
  diff: ["Difference threshold", "The difference threshold is the smallest change in a stimulus that we can notice (is it different from before?)."],
  adapt: ["Sensory adaptation", "Sensory adaptation = we respond less and less to a stimulus that continues without change."],
  top: ["Top-down processing", "Top-down processing = interpretation driven by context, expectations, knowledge or emotions — not a basic principle of sensation."],
};
const PR_CASES = [
  ["In a perfectly quiet room you can just barely hear a watch ticking 6 metres away.", "abs", "“Just barely hear” = the weakest stimulus you can detect at all."],
  ["If a leaf falls on your arm you don’t notice it, but if an acorn falls on you, you feel it.", "abs", "The leaf is below the threshold of detection, the acorn above it — the question is whether you notice the stimulus at all."],
  ["On a dark, clear night you look for the faintest star you can still see.", "abs", "The faintest visible light = the minimum energy needed to notice a stimulus."],
  ["You don’t notice one extra grain of sugar in your tea, but you do notice a whole extra spoonful.", "diff", "There already is sweetness; the question is how big the change must be to notice it."],
  ["You don’t feel a gentle acceleration on the scooter, but you do feel speeding up from 10 to 25 km/h.", "diff", "You are already moving; you notice the change only when it is big enough."],
  ["Holding 1 kg you notice when 100 g is added, but holding 10 kg you don’t notice the same 100 g.", "diff", "The change needed to notice depends on the starting stimulus (Weber’s law) — difference threshold."],
  ["After a few minutes you no longer smell your own perfume.", "adapt", "The smell did not disappear — your sensory system responds less to an unchanging stimulus."],
  ["Hot tea burns your lips at the first sip, but the next sips feel less hot.", "adapt", "Receptors respond less to a stimulus that continues without change."],
  ["Soon after putting on a watch you stop feeling it on your wrist.", "adapt", "Constant pressure → the receptors respond less → sensory adaptation."],
  ["Jumping into a cold lake is a shock, but after a minute the water feels okay.", "adapt", "The water temperature is the same; the response of your senses got weaker."],
  ["You read “Th_ br_in us_s cont_xt” and understand it without effort.", "top", "Nothing about the stimulus changed — your knowledge of words fills in the gaps. That is top-down processing."],
  ["A radiologist sees a small fracture on an X-ray that you can’t see at all.", "top", "Same image, same eyes — the difference comes from knowledge and experience (top-down)."],
];
function principleTask(used) {
  const fresh = PR_CASES.filter((_, i) => !(used && used.has("pc-pr#" + i)));
  const c = pick(fresh.length ? fresh : PR_CASES);
  if (used) used.add("pc-pr#" + PR_CASES.indexOf(c));
  const keys = ["abs", "diff", "adapt", "top"];
  return mcq(`${c[0]}<br>Which principle does this show best?`,
    [[PRINC[c[1]][0], c[2] + " " + PRINC[c[1]][1]], ...keys.filter((k) => k !== c[1]).map((k) => [PRINC[k][0], "Not here. " + PRINC[k][1]])],
    "Ask: is it about noticing at all? noticing a change? a stimulus that lasts? or about interpretation?",
    `${em(PRINC[c[1]][0])}. ${PRINC[c[1]][1]}`);
}
const princ1 = G("p-princ", "principles", "Threshold or adaptation?", principleTask);

// ── 4. Wrażenie czy spostrzeżenie? ───────────────────────────────────────────
const SP = {
  s: ["Sensation", "Sensation = receptors detect energy and send information to the brain (no interpretation yet)."],
  p: ["Perception", "Perception = the brain organizes and interprets sensations into something meaningful."],
};
const SP_CASES = [
  ["Rods and cones in the retina respond to light.", "s", "Receptors reacting to light energy — this is sensation (transduction)."],
  ["Hair cells in the inner ear turn sound vibrations into neural impulses.", "s", "Turning energy into neural impulses is the job of receptors — sensation."],
  ["Taste buds on your tongue react to sugar molecules.", "s", "Receptors detecting chemicals — sensation."],
  ["Pressure receptors in your skin fire when someone taps your shoulder.", "s", "Detection of pressure by receptors — sensation."],
  ["You recognise a cloud as a rabbit.", "p", "Giving a shape a meaning is organizing and interpreting — perception."],
  ["Among many sounds in a café you hear your own name.", "p", "Recognising a pattern of sounds as a meaningful word — perception."],
  ["You see a vase in a picture, and a moment later two faces.", "p", "The sensations stay the same; the organization changes (figure-ground) — perception."],
  ["You judge that a car is far away because it looks small.", "p", "Interpreting size as distance is perception."],
  ["You notice an arrow hidden in the white space of a logo.", "p", "Organizing the image into figure and ground — perception."],
];
function spTask(used) {
  const fresh = SP_CASES.filter((_, i) => !(used && used.has("pc-sp#" + i)));
  const c = pick(fresh.length ? fresh : SP_CASES);
  if (used) used.add("pc-sp#" + SP_CASES.indexOf(c));
  const other = c[1] === "s" ? "p" : "s";
  return mcq(`${c[0]}<br>Is this sensation or perception?`,
    [[SP[c[1]][0], c[2]], [SP[other][0], "Not here. " + SP[other][1]],
      ["Sensory adaptation", "Adaptation is a weaker response to an unchanging stimulus — nothing here lasts without change."]],
    "Receptors and energy → sensation. Meaning, shape, recognition → perception.",
    `${SP.s[1]} ${SP.p[1]}`);
}
const sp1 = G("p-sp", "sensper", "Sensation or perception?", spTask);

// ── 5. Zasady Gestalt (rysunki) ──────────────────────────────────────────────
const svgWrap = (w, h, inner, label) => `<svg class="st-svg pc-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inner}</svg>`;
const FIGS = {
  proximity() {
    const groups = ri(3, 4), per = 2, rows = 5;
    let s = "", x = 20;
    for (let g = 0; g < groups; g++) {
      for (let c = 0; c < per; c++) {
        for (let r = 0; r < rows; r++) s += `<circle class="pc-dot" cx="${x}" cy="${20 + r * 22}" r="7"/>`;
        x += 22;
      }
      x += 34;
    }
    return svgWrap(x, 130, s, "Dots arranged in columns");
  },
  similarity() {
    let s = "";
    const sq = Math.random() < 0.5;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) {
      const x = 20 + c * 30, y = 20 + r * 28;
      s += (r % 2 === (sq ? 0 : 1)) ? `<rect class="pc-dot pc-alt" x="${x - 8}" y="${y - 8}" width="16" height="16"/>` : `<circle class="pc-dot" cx="${x}" cy="${y}" r="8"/>`;
    }
    return svgWrap(250, 150, s, "Grid of circles and squares");
  },
  closure() {
    const arc = (cx, cy, r) => `<circle class="pc-line" cx="${cx}" cy="${cy}" r="${r}" pathLength="100" stroke-dasharray="18 7"/>`;
    const tri = `<path class="pc-line" d="M190 30 L230 100 M240 118 L250 130 L130 130 L140 118 M150 100 L190 30" />`;
    return svgWrap(280, 150, arc(70, 75, 50) + tri, "Incomplete circle and triangle");
  },
  continuity() {
    const y = 75;
    let s = `<path class="pc-line" d="M10 ${y} C 70 -10, 110 160, 170 ${y} S 270 -10, 300 ${y}"/>`;
    s += `<path class="pc-line pc-line-2" d="M10 130 L300 20"/>`;
    return svgWrap(310, 150, s, "A curve and a straight line crossing");
  },
  symmetry() {
    const sq = (x) => `<path class="pc-line" d="M${x + 14} 20 H${x} V130 H${x + 14}"/><path class="pc-line" d="M${x + 46} 20 H${x + 60} V130 H${x + 46}"/>`;
    const br = (x) => `<path class="pc-line" d="M${x + 16} 20 Q${x} 20 ${x + 4} 50 Q${x + 6} 72 ${x - 4} 75 Q${x + 6} 78 ${x + 4} 100 Q${x} 130 ${x + 16} 130"/>` +
      `<path class="pc-line" d="M${x + 44} 20 Q${x + 60} 20 ${x + 56} 50 Q${x + 54} 72 ${x + 64} 75 Q${x + 54} 78 ${x + 56} 100 Q${x + 60} 130 ${x + 44} 130"/>`;
    return svgWrap(300, 150, sq(15) + br(120) + sq(225), "Brackets: square, curly, square");
  },
  figureGround() {
    // Waza Rubina: tło w kolorze tuszu, waza w kolorze powierzchni → po bokach dwa profile twarzy.
    const v = "M60 15 H140 C140 30 128 38 122 48 C114 62 112 70 116 82 C122 96 134 104 134 122 C134 140 118 150 112 160 C108 168 118 174 128 178 V195 H72 V178 C82 174 92 168 88 160 C82 150 66 140 66 122 C66 104 78 96 84 82 C88 70 86 62 78 48 C72 38 60 30 60 15 Z";
    return svgWrap(200, 210, `<rect class="pc-ink" x="0" y="0" width="200" height="210" rx="10"/><path class="pc-paper" d="${v}"/>`, "A white vase on a dark background");
  },
};
const FIG_Q = {
  proximity: ["proximity", "The dots are identical; only the distances differ. Close columns are seen as pairs — proximity."],
  similarity: ["similarity", "The spacing is equal everywhere, yet you see rows — because elements in a row have the same shape. That is similarity."],
  closure: ["closure", "The outlines have gaps, but you see a complete circle and triangle — the brain fills in the missing parts (closure)."],
  continuity: ["continuity", "You see one smooth curve and one straight line crossing, not four pieces meeting in the middle — continuity."],
  symmetry: ["symmetry", "Mirror-image brackets are grouped into pairs: [ ], { }, [ ] — symmetry."],
  figureGround: ["figure-ground", "Look at the white part — a vase; look at the dark sides — two faces in profile. The image flips between figure and ground."],
};
const FIG_PROMPT = {
  proximity: "How many groups do you see — and why?",
  similarity: "Do you see rows or columns? Which principle makes you group them this way?",
  closure: "The lines have gaps. What do you still see, and which principle explains it?",
  continuity: "How many lines do you see?",
  symmetry: "How do the brackets group together?",
  figureGround: "What do you see? Look at the white shape, then at the dark sides.",
};
function gestaltFigTask(used) {
  const keys = Object.keys(FIGS);
  const fresh = keys.filter((k) => !(used && used.has("pc-gf:" + k)));
  const k = pick(fresh.length ? fresh : keys);
  if (used) used.add("pc-gf:" + k);
  const [name, expl] = FIG_Q[k];
  const wrong = shuffle(GESTALT_NAMES.filter((n) => n !== name)).slice(0, 3);
  return mcq(`${FIG_PROMPT[k]}<br>Which Gestalt principle is shown?`,
    [[name, expl], ...wrong.map((n) => [n, `${em(n)}: ${gestaltDef(n)} That is not what makes this picture work.`])],
    "Is it about distance? looking alike? gaps? smooth lines? mirror images? object vs background?",
    `${em(name)} — ${gestaltDef(name)}`, FIGS[k]());
}
const gest1 = G("p-gest-fig", "gestalt", "Gestalt in pictures", gestaltFigTask);
const gestFig2 = G("p-gest-fig2", "gestalt", "Gestalt in pictures", gestaltFigTask);
const gestLogo = bankGen("p-gest-logo", "gestalt-logo", "Gestalt in logos", [
  { q: "Logo: a golden mountain above a brand name. When you look longer, you notice the outline of a <b>bear</b> hidden in the white space of the mountain. Which principle is the main one?",
    a: [["Figure-ground", "The bear exists only in the background (negative space) — you switch from seeing the mountain to seeing the bear."],
      ["Proximity", "Nothing is grouped by distance here."],
      ["Similarity", "The bear is not built from elements that look alike."],
      ["Continuity", "It is not about following a smooth line."]],
    hint: "Where exactly is the bear — in the drawing or in the empty space?", why: "Figure-ground: the hidden bear appears when the white space becomes the figure. (Worksheet note: the word is “closure”, not “closer”.)" },
  { q: "Logo: three blue letters built only from horizontal stripes with gaps between them. You still read solid letters. Which principle?",
    a: [["Closure", "The letters are incomplete — the brain fills in the gaps and sees whole letters."],
      ["Figure-ground", "There is no second, hidden image in the background."],
      ["Symmetry", "Not all letters are symmetrical; the effect comes from filling in gaps."],
      ["Proximity", "Stripes are close, but the key effect is seeing complete letters despite the missing parts."]],
    hint: "What does your brain do with the gaps?", why: "Closure: incomplete shapes are perceived as complete." },
  { q: "Logo: the word “FedEx”. Between the letters “E” and “x” the white space forms an <b>arrow</b> pointing right. Which principle?",
    a: [["Figure-ground", "The arrow is in the background between the letters — it appears when the white space becomes the figure."],
      ["Closure", "Nothing is missing that the brain has to complete."],
      ["Similarity", "The arrow is not formed by similar elements."],
      ["Continuity", "It is not about a smooth line."]],
    hint: "Is the arrow drawn, or is it made of empty space?", why: "Figure-ground: the arrow is negative space — a symbol of speed and forward movement." },
  { q: "Logo: a football made of separate curved red shapes. There is no outline of the ball, but you clearly see a ball. Which principle?",
    a: [["Closure", "The ball has no outline; the brain completes the shape from the separate pieces."],
      ["Continuity", "You do not follow one smooth line; you complete a whole shape."],
      ["Figure-ground", "There is no second, hidden image in the background."],
      ["Similarity", "The shapes are similar, but the key effect is seeing the complete ball that is not drawn."]],
    hint: "Is the ball actually drawn?", why: "Closure: the ball is implied by its parts. The logo is also symmetrical, which makes it look balanced." },
  { q: "Logo: two letters made of dozens of tiny sports icons (balls, rackets, shoes) packed closely together, in one colour. Why do you see letters instead of a pile of icons?",
    a: [["Proximity and similarity", "The icons are close to each other (proximity) and have the same colour (similarity), so they are grouped into one shape — a letter."],
      ["Sensory adaptation", "Adaptation is a weaker response to an unchanging stimulus — it does not create shapes."],
      ["Continuity", "There is no smooth line to follow; the icons form a whole because they are close and alike."],
      ["Absolute threshold", "The icons are clearly visible — thresholds are not the issue."]],
    hint: "What do the icons have in common, and how far apart are they?", why: "Proximity + similarity: close and alike elements are grouped into one whole." },
]);

// ── 6. Przetwarzanie odgórne ─────────────────────────────────────────────────
const topDown = bankGen("p-topdown", "topdown", "Top-down processing", [
  { q: "A student reads “Th_ br_in us_s cont_xt to und_rst_nd w_rds” and understands it. What helps most?",
    a: [["Context and knowledge of words (top-down)", "Surrounding letters and words plus your knowledge of the language let the brain reconstruct the missing letters."],
      ["Sensory adaptation", "Adaptation is about weaker responses to an unchanging stimulus — not filling in letters."],
      ["A low absolute threshold", "The letters are missing, not too faint — no threshold can make you see a letter that is not there."],
      ["Bottom-up processing only", "Bottom-up would build the words from the visible letters only — and the letters are missing."]],
    hint: "Where does the missing information come from?", why: "Top-down: context, experience and knowledge reconstruct missing information." },
  { q: "Can the same X-ray look different to a doctor and to you?",
    a: [["Yes — the doctor’s knowledge and experience guide what they see", "Same image, same sensation; the doctor’s expertise changes the interpretation (top-down)."],
      ["No — the image is identical, so perception must be identical", "Sensation can be the same while perception differs — perception is an interpretation."],
      ["Yes — doctors have more sensitive receptors", "Their eyes are ordinary; the difference is in knowledge, not in receptors."],
      ["Yes — but only because of sensory adaptation", "Adaptation does not explain recognising a fracture."]],
    hint: "Is the difference in the eyes or in the head?", why: "Knowledge and experience are top-down factors." },
  { q: "Two classmates whisper and laugh. One student thinks they are making fun of them; another thinks they are sharing a joke. Why the difference?",
    a: [["Emotions, previous experiences and expectations shape the interpretation", "The situation is the same; what each student brings (insecurity, past experiences) changes the perception."],
      ["Their difference thresholds for sound are different", "Thresholds are about detecting stimuli, not about guessing intentions."],
      ["One of them has sensory adaptation to laughter", "Adaptation would weaken the response, not change its meaning."],
      ["Bottom-up processing", "The sensory data are the same for both, so they cannot explain different interpretations."]],
    hint: "The same input, two meanings — what differs between the two students?", why: "Top-down: emotions, expectations and experience colour perception." },
  { q: "The same symbol is read as the letter “B” in “A B C”, but as the number “13” in “12 13 14”. Why?",
    a: [["Context", "The neighbouring symbols create a context that decides how the ambiguous shape is read."],
      ["Closure", "Nothing is missing that has to be completed."],
      ["Difference threshold", "The symbol is physically identical in both rows."],
      ["Emotions", "No emotional factor is involved here."]],
    hint: "What changes between the two rows?", why: "Context is one of the main top-down factors." },
  { q: "Before seeing an ambiguous drawing you are told: “This is a young woman.” You see the young woman, while your friend — told “This is an old woman” — sees the old woman. What is this?",
    a: [["Perceptual set (expectations)", "What you were told created a readiness to perceive the picture in one particular way."],
      ["Sensory adaptation", "Nobody looked long enough to adapt — and adaptation does not choose meanings."],
      ["Absolute threshold", "Both of you see the drawing clearly."],
      ["Bottom-up processing", "The drawing is identical; the difference comes from expectations, i.e. top-down."]],
    hint: "What was different before you even looked?", why: "Perceptual set = expectations make us perceive something in a particular way." },
  { q: "A nervous hiker sees a curved stick on a forest path and jumps back — “a snake!”. Which factor is the strongest here?",
    a: [["Emotions (fear) and expectations", "Anxiety prepares the brain to detect danger, so an ambiguous shape is perceived as a snake."],
      ["Kinesthesia", "Kinesthesia is about the position of your own limbs."],
      ["Difference threshold", "It is not about noticing a change in a stimulus."],
      ["Closure", "The stick is complete; the problem is its interpretation."]],
    hint: "How does the hiker feel?", why: "Emotions are a top-down factor that can change what we perceive." },
  { q: "You look at an abstract pattern you have never seen before and slowly build it up from lines, edges and colours. What kind of processing is this mainly?",
    a: [["Bottom-up processing", "With no knowledge or expectations to use, perception starts from the sensory features and builds up to a whole."],
      ["Top-down processing", "Top-down needs context, knowledge or expectations — and this pattern is completely new to you."],
      ["Sensory adaptation", "Adaptation is a weaker response to a lasting stimulus."],
      ["Perceptual set", "You have no expectation about what the pattern is."]],
    hint: "Do you have any knowledge to use here?", why: "Bottom-up = from the data up; top-down = from knowledge and expectations down." },
]);

// ── 7. Uwaga i złudzenia ─────────────────────────────────────────────────────
const attn = bankGen("p-attn", "attention", "Attention & illusions", [
  { q: "In the basketball video, about half of viewers who count the passes of the white team do not notice a person in a gorilla suit walking through. Why?",
    a: [["Selective attention causes inattentional blindness", "Attention is focused on counting passes, so a clearly visible but unexpected object is not perceived."],
      ["The gorilla is below the absolute threshold", "The gorilla is large and clearly visible — it is not too weak to sense."],
      ["Sensory adaptation to the colour black", "The gorilla is on screen only for a few seconds — there is no time to adapt."],
      ["The eyes do not receive the image of the gorilla", "The eyes do register it (sensation); it is perception that misses it."]],
    hint: "What were the viewers doing?", why: "Selective attention + inattentional blindness: we perceive only part of what reaches our senses." },
  { q: "A worksheet answer says: “The gorilla video is an example of active perception — we choose what to notice.” Which terms describe it more precisely?",
    a: [["Selective attention and inattentional blindness", "These are the exact terms: focusing on some stimuli (passes) and failing to notice an unexpected one (gorilla)."],
      ["Difference threshold and Weber’s law", "These describe noticing a change in stimulus intensity."],
      ["Kinesthesia and the vestibular sense", "These are body senses, not attention."],
      ["Figure-ground and closure", "Gestalt principles describe how we organize shapes, not what we fail to notice."]],
    hint: "There is a special name for not seeing something obvious.", why: "The answer is not wrong, but the key terms are selective attention and inattentional blindness." },
  { q: "In the McGurk effect, the audio says “ba” while the video shows lips saying “ga”. Most people hear “da”. What does this show?",
    a: [["The brain integrates vision and hearing — what we see changes what we hear", "Perception combines information from different senses into one experience."],
      ["The ears are adapting to the sound “ba”", "Adaptation would make the sound weaker, not change it into a different syllable."],
      ["The sound is below the absolute threshold", "The sound is clearly audible."],
      ["Hearing is more important than vision", "It is the opposite here: vision overrides part of what is heard."]],
    hint: "Two senses, one syllable.", why: "McGurk effect: multisensory integration — perception is not just a copy of one sense." },
  { q: "You watch the McGurk video again, but this time with your eyes closed. What will you most likely hear?",
    a: [["“ba” — the real sound", "Without the conflicting lip movements, only the auditory information is left."],
      ["“da” — the illusion stays", "The illusion needs the visual information; with eyes closed it disappears."],
      ["“ga”", "“ga” was only in the lip movements."],
      ["Nothing — the sound is below the threshold", "The sound is clearly audible."]],
    hint: "Which sense creates the illusion?", why: "The illusion depends on the visual input — remove it and you hear the real sound." },
  { q: "Two lines are exactly the same length, but the one with outward-pointing fins (>—<) looks longer than the one with arrowheads (<—>). Even after measuring them, it still looks longer. What does this tell us?",
    a: [["Perception is an active construction; knowing the truth does not switch the illusion off", "The brain interprets the fins as depth cues. The interpretation is automatic, so knowledge does not cancel it."],
      ["The eyes measure length incorrectly", "The retina receives the correct image; the error comes from interpretation."],
      ["It is an example of sensory adaptation", "You do not need to look for long — the illusion is immediate."],
      ["It is a difference threshold effect", "The difference in perceived length is far larger than any threshold."]],
    hint: "Does knowing help?", why: "Optical illusions show that perception = interpretation of sensations, not a copy of them." },
  { q: "At a noisy party you are talking to one person and ignoring other voices — until someone across the room says your name, and you hear it at once. What does this show?",
    a: [["Selective attention still monitors unattended stimuli for important ones", "Ignored voices are still processed a little; personally important words (your name) can grab attention."],
      ["Your absolute threshold for your name is lower than for other words", "The sound energy is the same; the difference is in attention and meaning."],
      ["Sensory adaptation to the music", "Adaptation does not explain why one word suddenly stands out."],
      ["Kinesthesia", "Kinesthesia is about your limbs."]],
    hint: "Why exactly your name?", why: "Selective attention (cocktail party effect): we focus on one source, but meaningful stimuli can break through." },
]);

// ── 8. Sprawdź odpowiedź z arkusza ───────────────────────────────────────────
const check = bankGen("p-check", "check", "Check the answer", [
  { q: "Question: <i>What is the difference between sensation and perception?</i><br>Answer: “Sensation is collecting information and sending it to the brain. Perception is organizing and interpreting <b>perception</b> into a mental representation of the world.” Is it correct?",
    a: [["Almost — perception organizes and interprets sensations, not “perception”", "The idea is right, but the definition is circular. Perception organizes and interprets SENSATIONS."],
      ["Correct as it is", "Perception cannot interpret “perception” — that is circular."],
      ["Wrong — sensation and perception are the same thing", "They are two stages: receiving information vs interpreting it."],
      ["Wrong — perception happens in the receptors", "Receptors are responsible for sensation; perception happens in the brain."]],
    hint: "Read the last sentence carefully.", why: "Sensation = collecting information; perception = organizing and interpreting sensations." },
  { q: "Question: <i>What are the three basic principles of sensation?</i><br>Answer: “Absolute threshold, difference threshold, sensory adaptation.” Is it correct?",
    a: [["Correct", "These are exactly the three basic principles of sensation."],
      ["Wrong — perception should replace sensory adaptation", "Perception is not a principle of sensation."],
      ["Wrong — the vestibular sense is one of them", "The vestibular sense is a sense, not a principle."],
      ["Wrong — receptor should replace difference threshold", "A receptor is a cell, not a principle."]],
    hint: "Compare with the glossary.", why: "Three basic principles: absolute threshold, difference threshold, sensory adaptation." },
  { q: "Question: <i>What is painful neuropathy?</i><br>Answer: “Pain caused by a very strong external stimulus, such as a burn.” Is it correct?",
    a: [["Wrong — damaged nerves generate pain signals, sometimes with no external stimulus", "Painful neuropathy is a problem of the nerves themselves, not of a strong stimulus."],
      ["Correct", "A burn is normal pain from a stimulus — neuropathy is pain from damaged nerves."],
      ["Wrong — it is a total loss of the sense of touch", "Neuropathy can include numbness, but painful neuropathy is about pain signals."],
      ["Wrong — it is a type of sensory adaptation", "Adaptation means a weaker response, not pain without a stimulus."]],
    hint: "Where does the pain signal come from?", why: "Painful neuropathy: damaged or dysfunctional nerves generate pain signals, sometimes without an external painful stimulus." },
  { q: "Task: <i>give an example of the absolute threshold.</i><br>Answer: “Hot tea burns my lips more at the beginning than later.” Is it correct?",
    a: [["Wrong — this is sensory adaptation", "The tea is a lasting stimulus and the response gets weaker — that is adaptation, not the minimum stimulus you can notice."],
      ["Correct", "The absolute threshold is about the weakest stimulus you can notice at all."],
      ["Wrong — this is the difference threshold", "It is not about noticing a change in the stimulus, but about a weaker response to the same stimulus."],
      ["Wrong — this is kinesthesia", "Kinesthesia is about limb position."]],
    hint: "Is it about noticing something at all, or about getting used to it?", why: "Example of the absolute threshold: a leaf falling on you is unnoticed, an acorn is felt." },
  { q: "Task: <i>give an example of the difference threshold.</i><br>Answer: “I don’t feel a gentle acceleration on the scooter, but I do feel speeding up from 10 to 25 km/h.” Is it correct?",
    a: [["Correct", "You are already moving; only a big enough change is noticed — that is the difference threshold."],
      ["Wrong — this is the absolute threshold", "The question is not whether you feel the movement at all, but whether you notice the change."],
      ["Wrong — this is sensory adaptation", "Adaptation is a weaker response to an unchanging stimulus; here the stimulus changes."],
      ["Wrong — this is the vestibular sense, not a threshold", "Acceleration is sensed by the vestibular sense, but the example illustrates the difference threshold."]],
    hint: "Is it about a change?", why: "Difference threshold = the smallest noticeable change in stimulation." },
  { q: "Answer: “Sensory adaptation means that our senses respond <b>more and more</b> to a stimulus that continues without change.” Is it correct?",
    a: [["Wrong — they respond less", "Sensory adaptation = a weaker response to a stimulus that continues without change."],
      ["Correct", "It is the opposite: you stop smelling your own perfume, you do not smell it more."],
      ["Wrong — adaptation only happens in vision", "It happens in all senses: smell, touch, temperature…"],
      ["Wrong — adaptation is about noticing changes", "Noticing changes is the difference threshold."]],
    hint: "Think of your watch on your wrist.", why: "Sensory adaptation: tendency of sensory systems to respond less to stimuli that continue without change." },
  { q: "Answer: “A doctor sees more on an X-ray than I do because their receptors are more sensitive.” Is it correct?",
    a: [["Wrong — the difference is knowledge and experience (top-down), not receptors", "Both receive the same sensation; the doctor interprets it with expert knowledge."],
      ["Correct", "Medical training does not change the retina."],
      ["Wrong — the doctor has a lower absolute threshold for light", "The image is clearly visible to both people."],
      ["Wrong — the doctor is using bottom-up processing only", "It is exactly the opposite — knowledge guides perception from the top down."]],
    hint: "Did medical school change the doctor’s eyes?", why: "Top-down processing: knowledge and experience change perception of the same image." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  ZAGADNIENIA
// ════════════════════════════════════════════════════════════════════════════
export const PERCEP_TOPICS = [
  { id: "p-terms", title: "Key terms", sub: "definicja ↔ pojęcie (słowniczek)", icon: "Aa", gens: [termDef, termName, termDef2] },
  { id: "p-senses", title: "Which sense?", sub: "wzrok, słuch, węch, smak, dotyk, zmysł przedsionkowy, kinestezja", icon: "◎", gens: [sense1, sense1, sense1] },
  { id: "p-principles", title: "Thresholds & adaptation", sub: "próg absolutny, próg różnicy, adaptacja", icon: "↕", gens: [princ1, princ1, princ1] },
  { id: "p-sensper", title: "Sensation or perception?", sub: "receptory czy interpretacja", icon: "⇄", gens: [sp1, sp1, sp1] },
  { id: "p-gestalt", title: "Gestalt principles", sub: "rysunki + logo z arkusza", icon: "◐", gens: [gest1, gestLogo, gestFig2] },
  { id: "p-topdown", title: "Top-down processing", sub: "kontekst, wiedza, emocje, oczekiwania", icon: "⤵", gens: [topDown, topDown, topDown] },
  { id: "p-attention", title: "Attention & illusions", sub: "goryl, efekt McGurka, Müller-Lyer", icon: "⊙", gens: [attn, attn, attn] },
  { id: "p-check", title: "Check the answer", sub: "czy odpowiedź z arkusza jest dobra?", icon: "✓", gens: [check, check, check] },
];
const ALL_PERCEP = [...new Map(PERCEP_TOPICS.flatMap((t) => t.gens).map((g) => [g.id, g])).values()];
export function percepGenById(id) { return ALL_PERCEP.find((g) => g.id === id) || null; }
export const PERCEP_MIX_SIZE = 12;
/** Sprawdzian mieszany: po 1–2 zadania z każdego zagadnienia. */
export function percepMixGens() {
  return shuffle(PERCEP_TOPICS.flatMap((t) => shuffle(t.gens).slice(0, 2))).slice(0, PERCEP_MIX_SIZE);
}

// ════════════════════════════════════════════════════════════════════════════
//  EKSPERYMENTY (laboratorium)
// ════════════════════════════════════════════════════════════════════════════
function h(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function btn(label, onClick, cls = "btn btn-secondary btn-sm") {
  const b = h("button", cls, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}
const SVGNS = "http://www.w3.org/2000/svg";
function svgEl(w, hgt, label) {
  const s = document.createElementNS(SVGNS, "svg");
  s.setAttribute("viewBox", `0 0 ${w} ${hgt}`);
  s.setAttribute("class", "st-svg lab-svg");
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", label);
  return s;
}
function sv(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
const gray = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };

// ── 1. Próg różnicy: która plama jest jaśniejsza? (metoda schodkowa) ─────────
const labJnd = {
  id: "p-jnd", title: "Your difference threshold", sub: "Która plama jest jaśniejsza? Zmierz swój próg różnicy (JND)", icon: "◑",
  mount(host) {
    host.appendChild(h("div", "lab-box lab-info",
      "<p><b>Difference threshold (JND)</b> — the smallest change you can notice. Click the patch that is <b>lighter</b>. " +
      "After a correct answer the difference gets smaller, after a mistake it grows (a “staircase” used in real experiments). " +
      "After 8 turns of the staircase you get your threshold.</p><p class=\"lab-small\">Then try the bright background — according to Weber’s law you will need a bigger difference there.</p>"));
    let base = 70, diff, step, trials, reversals, lastDir, streak, hist, done;
    const top = h("div", "lab-row");
    const chipsWrap = h("div", "nb-dir lab-chips");
    [["Dark", 70], ["Bright", 190]].forEach(([label, v]) => {
      const c = h("button", "nb-chip" + (v === base ? " is-sel" : ""), label + " background");
      c.type = "button";
      c.addEventListener("click", () => { chipsWrap.querySelectorAll(".nb-chip").forEach((x) => x.classList.toggle("is-sel", x === c)); base = v; reset(); });
      chipsWrap.appendChild(c);
    });
    top.appendChild(chipsWrap);
    host.appendChild(top);
    const svg = svgEl(320, 170, "Two grey patches");
    svg.classList.add("pc-jnd");
    const bg = sv("rect", { x: 0, y: 0, width: 320, height: 170, rx: 12 });
    const pa = sv("rect", { x: 30, y: 25, width: 120, height: 120, rx: 10, class: "pc-patch" });
    const pb = sv("rect", { x: 170, y: 25, width: 120, height: 120, rx: 10, class: "pc-patch" });
    svg.append(bg, pa, pb);
    host.appendChild(svg);
    const status = h("p", "lab-verdict");
    host.appendChild(status);
    const result = h("div", "lab-box lab-goal hidden");
    host.appendChild(result);
    let lighter = 0;
    function show() {
      lighter = Math.random() < 0.5 ? 0 : 1;
      // Tło wyraźnie inne niż obie plamy — inaczej ciemniejsza plama zlewa się z tłem.
      bg.setAttribute("fill", gray(base - 40));
      pa.setAttribute("fill", gray(base + (lighter === 0 ? diff : 0)));
      pb.setAttribute("fill", gray(base + (lighter === 1 ? diff : 0)));
      status.textContent = `Trial ${trials + 1} · difference now: ${diff} levels · turns: ${reversals.length}/8`;
    }
    function answer(i) {
      if (done) return;
      const ok = i === lighter;
      trials++;
      hist.push(ok);
      // 2 dobre z rzędu → mniejsza różnica, 1 błąd → większa (szuka ~70% trafień).
      let dir = 0;
      if (ok) { streak++; if (streak >= 2) { streak = 0; dir = -1; } } else { streak = 0; dir = 1; }
      if (dir) {
        if (lastDir && dir !== lastDir) { reversals.push(diff); if (reversals.length >= 3) step = 1; }
        lastDir = dir;
        diff = Math.max(1, Math.min(60, diff + dir * step));
      }
      if (reversals.length >= 8 || trials >= 60) return finish();
      show();
    }
    function finish() {
      done = true;
      const last = reversals.slice(-6);
      const jnd = last.length ? last.reduce((s, x) => s + x, 0) / last.length : diff;
      const pct = (jnd / base) * 100;
      status.textContent = `Done after ${trials} trials.`;
      result.classList.remove("hidden");
      result.innerHTML = `<span class="lab-goal-label">Your result</span><p>Difference threshold ≈ <b>${jnd.toFixed(1)}</b> brightness levels on a background of ${base} ` +
        `(≈ <b>${pct.toFixed(1)}%</b> of the background).</p><p class="lab-small">Smaller differences were below your difference threshold — the patches looked the same, although they were not. ` +
        `Try the other background and compare the % — Weber’s law says the noticeable change grows with the strength of the stimulus. (Screens are not lab equipment, so treat it as a demo.)</p>`;
      result.appendChild(btn("Jeszcze raz", reset));
    }
    function reset() {
      diff = 24; step = 4; trials = 0; reversals = []; lastDir = 0; streak = 0; hist = []; done = false;
      result.classList.add("hidden");
      show();
    }
    pa.addEventListener("click", () => answer(0));
    pb.addEventListener("click", () => answer(1));
    const keys = h("div", "lab-row");
    keys.append(btn("← Left is lighter", () => answer(0)), btn("Right is lighter →", () => answer(1)));
    host.appendChild(keys);
    reset();
  },
};

// ── 2. Powidok: adaptacja sensoryczna kolorów ────────────────────────────────
const labAfter = {
  id: "p-after", title: "Afterimage", sub: "Adaptacja sensoryczna na własne oczy: patrz 20 s w kropkę", icon: "◉",
  mount(host) {
    host.appendChild(h("div", "lab-box lab-info",
      "<p><b>Sensory adaptation</b> — receptors respond less to a stimulus that continues without change. Stare at the black dot in the middle " +
      "for 20 seconds without moving your eyes. When the picture disappears, keep looking at the dot.</p>"));
    const svg = svgEl(320, 200, "Coloured shapes with a dot in the middle");
    svg.classList.add("pc-after");
    const bg = sv("rect", { x: 0, y: 0, width: 320, height: 200, rx: 12, fill: "#ffffff" });
    const shapes = sv("g", {});
    shapes.append(
      sv("path", { d: "M90 60 C 90 35, 130 35, 130 60 C 130 35, 170 35, 170 60 C 170 90, 130 110, 130 125 C 130 110, 90 90, 90 60 Z", fill: "#00b3b3", transform: "translate(-40,15)" }),
      sv("rect", { x: 185, y: 45, width: 90, height: 90, rx: 8, fill: "#ffd400" }),
      sv("circle", { cx: 160, cy: 168, r: 22, fill: "#1f6fff" }),
    );
    const dot = sv("circle", { cx: 160, cy: 100, r: 4, fill: "#000000" });
    svg.append(bg, shapes, dot);
    host.appendChild(svg);
    const status = h("p", "lab-verdict", "Ready? Click Start and look only at the dot.");
    host.appendChild(status);
    const explain = h("div", "lab-box lab-goal hidden",
      "<span class=\"lab-goal-label\">What happened?</span><p>You probably saw the shapes again in <b>opposite colours</b>: a red heart, a blue square and a yellow-orange circle. " +
      "The colour receptors (cones) that were stimulated without change for 20 s <b>adapted</b> — they responded less. On white, the other receptors “won”, so you saw the complementary colours.</p>" +
      "<p class=\"lab-small\">It is the same principle as no longer smelling your own perfume or not feeling your watch.</p>");
    host.appendChild(explain);
    let timer = 0;
    const start = btn("Start (20 s)", () => {
      clearInterval(timer);
      explain.classList.add("hidden");
      shapes.style.visibility = "visible";
      let left = 20;
      status.textContent = `Look at the dot… ${left}`;
      start.disabled = true;
      timer = setInterval(() => {
        if (!host.isConnected) return clearInterval(timer);
        left--;
        if (left > 0) { status.textContent = `Look at the dot… ${left}`; return; }
        clearInterval(timer);
        shapes.style.visibility = "hidden";
        status.textContent = "Keep looking at the dot! What do you see?";
        setTimeout(() => { explain.classList.remove("hidden"); start.disabled = false; start.textContent = "Again (20 s)"; }, 4000);
      }, 1000);
    }, "btn btn-primary");
    const row = h("div", "lab-row");
    row.appendChild(start);
    host.appendChild(row);
  },
};

// ── 3. Złudzenie Müller-Lyera: ustaw równe odcinki ───────────────────────────
const labMl = {
  id: "p-ml", title: "Müller-Lyer illusion", sub: "Ustaw dwa odcinki na równą długość — i sprawdź, o ile oszukuje Cię mózg", icon: "↔",
  mount(host) {
    host.appendChild(h("div", "lab-box lab-info",
      "<p>Move the slider until the <b>bottom line</b> looks exactly as long as the top one. Then click “Check”. " +
      "Perception is not a copy of the image on the retina — it is an interpretation.</p>"));
    const REF = 160, CX = 170;
    const svg = svgEl(340, 190, "Two lines with fins");
    const top = sv("g", {}), bot = sv("g", {});
    svg.append(top, bot);
    host.appendChild(svg);
    let len = ri(105, 215), fins = true, checked = false;
    // Górny: płetwy na zewnątrz (>—<) — wydaje się dłuższy; dolny: groty (<—>) — wydaje się krótszy.
    function line(g, y, L, outward) {
      g.replaceChildren();
      const x1 = CX - L / 2, x2 = CX + L / 2, f = 18, s = outward ? -1 : 1;
      g.appendChild(sv("line", { x1, y1: y, x2, y2: y, class: "pc-ml" }));
      if (!fins) return;
      for (const [x, d] of [[x1, 1], [x2, -1]]) {
        g.appendChild(sv("line", { x1: x, y1: y, x2: x + d * s * f, y2: y - f, class: "pc-ml" }));
        g.appendChild(sv("line", { x1: x, y1: y, x2: x + d * s * f, y2: y + f, class: "pc-ml" }));
      }
    }
    const draw = () => { line(top, 55, REF, true); line(bot, 140, len, false); };
    const wrap = h("label", "lab-slider");
    const lt = h("span", "lab-slider-top", "<span>Bottom line length</span>");
    const input = h("input");
    Object.assign(input, { type: "range", min: 100, max: 230, step: 1, value: len });
    input.addEventListener("input", () => { len = Number(input.value); if (!checked) draw(); });
    wrap.append(lt, input);
    host.appendChild(wrap);
    const out = h("div", "lab-box lab-goal hidden");
    const check = btn("Check", () => {
      checked = true;
      fins = false; draw();
      const d = len - REF, pct = (d / REF) * 100;
      out.classList.remove("hidden");
      out.innerHTML = `<span class="lab-goal-label">Result</span><p>Without the fins you can see the truth: the bottom line is <b>${Math.abs(d)} px ${d >= 0 ? "longer" : "shorter"}</b> ` +
        `than the top one (${d >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(0)}%).</p><p class="lab-small">${d > 4 ? "To make them look equal you had to make the bottom line longer — the arrowheads (&lt;—&gt;) make a line look shorter, and the fins (&gt;—&lt;) make it look longer. " : d < -4 ? "Hmm, you made it even shorter — move the slider until the lines really look equal and try again. " : "Hardly any illusion for you — rare! "}` +
        "The brain reads the fins as depth cues (like corners of a room or of a building) and corrects the size. Knowing this does not switch the illusion off — that is why it is a perceptual illusion, not a mistake in the eye.</p>";
    }, "btn btn-primary");
    const again = btn("Pokaż płetwy / od nowa", () => {
      checked = false; fins = true; len = ri(105, 215); input.value = len; out.classList.add("hidden"); draw();
    });
    const row = h("div", "lab-row");
    row.append(check, again);
    host.append(row, out);
    draw();
  },
};

export const PERCEP_LABS = [labJnd, labAfter, labMl];
