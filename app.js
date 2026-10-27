const REFRESH_MS = 60 * 1000;
const FRESH_MS = 40 * 60 * 1000;
const BERLIN = "Europe/Berlin";

let current = null;
let lastRaw = "";
let seq = 0;

function num(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatNum(value, digits) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatEur(value, signed) {
  if (value == null) return "—";
  const body = formatNum(Math.abs(value), 2);
  if (signed && value > 0) return `+${body} €`;
  if (value < 0) return `−${body} €`;
  return `${body} €`;
}

function formatPctRatio(ratio) {
  if (ratio == null) return "—";
  const value = ratio * 100;
  const body = formatNum(Math.abs(value), 2);
  if (value > 0) return `+${body} %`;
  if (value < 0) return `−${body} %`;
  return `${body} %`;
}

function formatPlainPct(value) {
  if (value == null) return "—";
  const digits = Math.abs(value - Math.round(value)) < 0.05 ? 0 : 1;
  const rounded = digits === 0 ? Math.round(value) : value;
  return `${formatNum(Math.abs(rounded), digits)} %`;
}

function formatPrice(value) {
  if (value == null) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 10 ? 3 : 5;
  return formatNum(value, digits);
}

function formatLot(value) {
  if (value == null) return "—";
  return `${formatNum(value, 2)} Lot`;
}

function tone(value) {
  if (value == null) return "flat";
  if (value > 0) return "pos";
  if (value < 0) return "neg";
  return "flat";
}

function setTone(node, value) {
  node.classList.remove("pos", "neg", "flat");
  node.classList.add(tone(value));
}

function directionLabel(value) {
  const key = String(value ?? "").trim().toLowerCase();
  if (key === "short" || key === "sell" || key === "s" || key === "verkauf") return "Short";
  if (key === "long" || key === "buy" || key === "b" || key === "kauf") return "Long";
  return value == null || value === "" ? "" : String(value);
}

function parseTime(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function formatStamp(iso, withYear) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso ?? "—");
  const options = {
    timeZone: BERLIN,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (withYear) options.year = "numeric";
  return new Intl.DateTimeFormat("de-DE", options).format(date);
}

function dayOnly(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function ageText(ms) {
  const elapsed = Math.max(0, ms);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "vor weniger als 1 Min";
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? "vor 1 Std" : `vor ${hours} Std`;
  return `vor ${hours} Std ${rest} Min`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function svgEl(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function sortByTime(items, field, direction) {
  return items
    .map((item, index) => ({ item, index, time: parseTime(item[field]) }))
    .sort((a, b) => {
      if (a.time == null && b.time == null) return (a.index - b.index) * direction;
      if (a.time == null) return 1;
      if (b.time == null) return -1;
      return (a.time - b.time) * direction || (a.index - b.index) * direction;
    })
    .map((entry) => entry.item);
}

function appendPriceBar(parent, spec) {
  const sl = num(spec.sl);
  const entry = num(spec.entry);
  const tp = num(spec.tp);
  const current = num(spec.current);
  const items = [];
  if (sl != null) items.push({ role: "SL", value: sl, kind: "sl" });
  if (entry != null) items.push({ role: spec.entryLabel || "Einstieg", value: entry, kind: "entry" });
  if (tp != null) items.push({ role: "TP", value: tp, kind: "tp" });
  if (items.length < 2) return;

  const scale = items.map((item) => item.value);
  if (current != null) scale.push(current);
  const min = Math.min(...scale);
  const max = Math.max(...scale);
  const span = max - min || 1;
  const pos = (value) => 6 + ((value - min) / span) * 88;

  const wrap = el("div", "range");
  const track = el("div", "range-track");
  for (const item of items) {
    const mark = el("span", `range-mark ${item.kind}`);
    mark.style.left = `${pos(item.value)}%`;
    mark.title = `${item.role} ${formatPrice(item.value)}`;
    track.append(mark);
  }
  if (current != null) {
    const liveTone = tone(spec.pnl);
    const live = el("span", `range-mark live ${liveTone}`);
    live.style.left = `${pos(current)}%`;
    live.title = `Kurs ${formatPrice(current)}`;
    track.append(live);
  }
  wrap.append(track);

  const legend = el("div", "legend");
  const ordered = [...items].sort((a, b) => a.value - b.value);
  for (const item of ordered) {
    const cell = el("span");
    cell.append(el("small", null, item.role), el("b", null, formatPrice(item.value)));
    legend.append(cell);
  }
  wrap.append(legend);
  if (current != null) wrap.append(el("p", "kurs", `Kurs ${formatPrice(current)}`));
  parent.append(wrap);
}

function updateFreshness(data) {
  const dot = document.getElementById("fresh-dot");
  const label = document.getElementById("fresh-label");
  const line = document.getElementById("fresh-line");
  const live = document.getElementById("live");
  const stamp = data && data.stand ? new Date(data.stand) : null;
  const valid = stamp && !Number.isNaN(stamp.getTime());
  const age = valid ? Date.now() - stamp.getTime() : Infinity;
  const fresh = age < FRESH_MS;
  dot.classList.toggle("is-stale", !fresh);
  live.classList.toggle("is-stale", !fresh);
  label.textContent = fresh ? "aktuell" : "veraltet";
  if (!valid) {
    line.textContent = "Stand: —";
    return;
  }
  line.textContent = `Stand: ${formatStamp(data.stand, true)} · aktualisiert ${ageText(age)}`;
}

function renderHero(data) {
  const equity = num(data.equity);
  const balance = num(data.balance);
  const margin = num(data.margin);
  const start = num(data.startKonto);
  const tagesstart = num(data.tagesstart);
  const heute = num(data.heuteErgebnis);
  const zielPct = num(data.tageszielProzent);
  const stoppPct = num(data.tagesstoppProzent);
  const profit = equity != null && start != null ? equity - start : null;
  const profitRatio = profit != null && start ? profit / start : null;

  const profitEur = document.getElementById("profit-eur");
  const profitPct = document.getElementById("profit-pct");
  profitEur.textContent = formatEur(profit, true);
  profitPct.textContent = formatPctRatio(profitRatio);
  setTone(profitEur, profit);
  setTone(profitPct, profit);
  document.getElementById("basis").textContent = `Start ${formatEur(start)}`;
  document.getElementById("equity").textContent = formatEur(equity);
  document.getElementById("balance").textContent = formatEur(balance);
  document.getElementById("margin").textContent = formatEur(margin);

  const todayEur = document.getElementById("today-eur");
  todayEur.textContent = formatEur(heute, true);
  setTone(todayEur, heute);

  const zielEur = tagesstart != null && zielPct != null ? (tagesstart * zielPct) / 100 : null;
  const stoppEur = tagesstart != null && stoppPct != null ? (tagesstart * stoppPct) / 100 : null;
  const ratio = zielEur != null && zielEur > 0 && heute != null ? heute / zielEur : 0;
  const clamped = Math.max(0, Math.min(1, ratio));
  document.getElementById("today-bar").style.width = `${(clamped * 100).toFixed(1)}%`;
  const meter = document.getElementById("today-meter");
  meter.setAttribute("aria-valuenow", String(Math.round(clamped * 100)));
  meter.setAttribute(
    "aria-valuetext",
    heute == null || zielEur == null
      ? "kein Tagesergebnis"
      : `${formatEur(heute, true)} von ${formatEur(zielEur)}`
  );

  document.getElementById("today-target").textContent =
    zielEur == null ? "Ziel —" : `Ziel ${formatEur(zielEur, true)} · +${formatPlainPct(zielPct)}`;
  document.getElementById("today-progress").textContent =
    ratio >= 1 && zielEur != null ? "Ziel erreicht" : `${formatPlainPct(Math.max(0, ratio * 100))}`;
  document.getElementById("today-stop").textContent =
    stoppEur == null ? "Stopp —" : `Stopp −${formatNum(stoppEur, 2)} €`;

  const history = asArray(data.historie);
  const wins = history.filter((trade) => (num(trade.ergebnisEur) ?? 0) > 0).length;
  const tradeWord = history.length === 1 ? "1 Trade" : `${history.length} Trades`;
  const winText = history.length === 0 ? "keine Trefferquote" : `${formatPlainPct((wins / history.length) * 100)} Treffer`;
  document.getElementById("trade-line").textContent = `${tradeWord} · ${winText}`;

  const rule = document.getElementById("rule-stop");
  if (stoppPct != null) {
    const digits = Math.abs(stoppPct - Math.round(stoppPct)) < 0.001 ? 0 : 2;
    rule.textContent = `−${formatNum(stoppPct, digits)} % Tagesstopp`;
  }
  updateFreshness(data);
  document.getElementById("hero").hidden = false;
}

function renderOpen(list) {
  const section = document.getElementById("sec-open");
  const box = document.getElementById("open-list");
  box.replaceChildren();
  section.hidden = list.length === 0;
  document.getElementById("open-count").textContent = list.length ? String(list.length) : "";
  for (const position of list) {
    const pnl = num(position.ergebnisEur);
    const base = num(position.kontoBeiEinstieg);
    const ratio = pnl != null && base ? pnl / base : null;
    const card = el("article", `pos ${tone(pnl)}`);
    const top = el("div", "pos-top");
    const title = el("div");
    title.append(el("p", "sym", position.symbol || "—"));
    const metaParts = [directionLabel(position.richtung), formatLot(num(position.lot))].filter((part) => part && part !== "—");
    title.append(el("p", "meta", metaParts.join(" · ") || "Position"));
    const pnlBox = el("div", "pnl");
    const pct = el("p", `pnl-pct ${tone(ratio)}`, formatPctRatio(ratio));
    const eur = el("p", `pnl-eur ${tone(pnl)}`, formatEur(pnl, true));
    pnlBox.append(pct, eur);
    top.append(title, pnlBox);
    card.append(top);
    appendPriceBar(card, {
      sl: position.sl,
      entry: position.einstieg,
      tp: position.tp,
      current: position.aktuell,
      entryLabel: "Einstieg",
      pnl,
    });
    if (position.eroeffnet) card.append(el("p", "since", `seit ${formatStamp(position.eroeffnet)}`));
    box.append(card);
  }
}

function renderPending(list) {
  const section = document.getElementById("sec-pending");
  const box = document.getElementById("pending-list");
  box.replaceChildren();
  section.hidden = list.length === 0;
  document.getElementById("pending-count").textContent = list.length ? String(list.length) : "";
  for (const order of list) {
    const card = el("article", "wait");
    const top = el("div", "wait-top");
    top.append(el("span", "flag", "Order wartet"), el("span", "sym", order.symbol || "—"));
    card.append(top);
    const metaParts = [order.typ || "Order", formatLot(num(order.lot))].filter(Boolean);
    card.append(el("p", "meta", metaParts.join(" · ")));
    appendPriceBar(card, {
      sl: order.sl,
      entry: order.preis,
      tp: order.tp,
      entryLabel: "Limit",
    });
    const facts = el("p", "facts");
    facts.append(el("span", null, `Risiko ${formatEur(num(order.risikoEur))}`));
    if (order.gueltigBis) facts.append(el("span", null, `gültig bis ${formatStamp(order.gueltigBis)}`));
    card.append(facts);
    if (order.ticket != null && order.ticket !== "") {
      card.append(el("p", "ticket", `Ticket ${order.ticket}`));
    }
    box.append(card);
  }
}

function renderHistory(list) {
  const section = document.getElementById("sec-history");
  const box = document.getElementById("history-list");
  box.replaceChildren();
  section.hidden = list.length === 0;
  document.getElementById("history-count").textContent = list.length === 1 ? "1 Abschluss" : list.length ? `${list.length} Abschlüsse` : "";
  const ordered = sortByTime(list, "datum", -1);
  for (const trade of ordered) {
    const pnl = num(trade.ergebnisEur);
    const base = num(trade.kontoBeiEinstieg);
    const ratio = pnl != null && base ? pnl / base : null;
    const tile = el("article", `tile ${tone(pnl)}`);
    const copy = el("div", "tile-copy");
    copy.append(el("p", "sym", trade.symbol || "—"));
    const meta = [directionLabel(trade.richtung), formatLot(num(trade.lot)), trade.datum ? dayOnly(trade.datum) : ""]
      .filter((part) => part && part !== "—");
    copy.append(el("p", "meta", meta.join(" · ")));
    const pnlBox = el("div", "tile-pnl");
    pnlBox.append(el("p", `pct ${tone(ratio)}`, formatPctRatio(ratio)));
    pnlBox.append(el("p", `eur ${tone(pnl)}`, formatEur(pnl, true)));
    tile.append(copy, pnlBox);
    const entry = num(trade.einstieg);
    const exit = num(trade.ausstieg);
    if (entry != null || exit != null) {
      tile.append(el("p", "path", `${formatPrice(entry)} → ${formatPrice(exit)}`));
    }
    box.append(tile);
  }
}

function renderEquity(list, data) {
  const section = document.getElementById("sec-equity");
  const box = document.getElementById("spark");
  box.replaceChildren();
  const points = sortByTime(
    list
      .map((point) => ({ zeit: point.zeit, equity: num(point.equity) }))
      .filter((point) => point.equity != null),
    "zeit",
    1
  );
  section.hidden = points.length === 0;
  if (points.length === 0) return;

  const values = points.map((point) => point.equity);
  const delta = values[values.length - 1] - values[0];
  const deltaNode = document.getElementById("equity-delta");
  deltaNode.textContent = formatEur(delta, true);
  deltaNode.className = `count ${tone(delta)}`;
  box.append(buildSpark(points, num(data.startKonto)));

  const axis = el("div", "axis");
  axis.append(el("span", null, formatEur(values[0])));
  const minValue = Math.min(...values);
  const mid = el("span");
  if (minValue < values[0] - 0.005 && minValue < values[values.length - 1] - 0.005) {
    mid.textContent = `Tief ${formatEur(minValue)}`;
  }
  axis.append(mid, el("span", null, formatEur(values[values.length - 1])));
  const times = el("div", "axis times");
  times.append(
    el("span", null, points[0].zeit ? formatStamp(points[0].zeit) : ""),
    el("span"),
    el("span", null, points[points.length - 1].zeit ? formatStamp(points[points.length - 1].zeit) : "")
  );
  box.append(axis, times);
}

function buildSpark(points, startKonto) {
  const width = 360;
  const height = 112;
  const padX = 8;
  const padY = 14;
  const values = points.map((point) => point.equity);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;
  const yMin = minValue - span * 0.22;
  const yMax = maxValue + span * 0.22;
  const ySpan = yMax - yMin || 1;
  const xAt = (index) => (points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2));
  const yAt = (value) => padY + (1 - (value - yMin) / ySpan) * (height - padY * 2);
  const coords = values.map((value, index) => [xAt(index), yAt(value)]);
  const line = coords.map((coord, index) => `${index ? "L" : "M"}${coord[0].toFixed(2)} ${coord[1].toFixed(2)}`).join(" ");
  const rising = values[values.length - 1] >= (startKonto ?? values[0]);
  const color = rising ? "#0f7a3d" : "#c43232";

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": `Equity-Verlauf von ${formatEur(values[0])} auf ${formatEur(values[values.length - 1])}`,
  });
  const defs = svgEl("defs", {});
  const gradient = svgEl("linearGradient", { id: "eqFill", x1: "0", y1: "0", x2: "0", y2: "1" });
  gradient.append(svgEl("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.28" }));
  gradient.append(svgEl("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" }));
  defs.append(gradient);
  svg.append(defs);

  if (startKonto != null && startKonto >= yMin && startKonto <= yMax) {
    const y = yAt(startKonto);
    svg.append(svgEl("line", {
      x1: padX,
      x2: width - padX,
      y1: y.toFixed(2),
      y2: y.toFixed(2),
      stroke: "#c3b7a6",
      "stroke-width": "1",
      "stroke-dasharray": "3 4",
    }));
    const label = svgEl("text", {
      x: width - padX,
      y: Math.max(11, y - 5).toFixed(2),
      "text-anchor": "end",
      fill: "#9a8d7c",
      "font-size": "10",
      "font-family": "Outfit, sans-serif",
    });
    label.textContent = "Start";
    svg.append(label);
  }

  if (coords.length > 1) {
    const area = `${line} L${coords[coords.length - 1][0].toFixed(2)} ${height} L${coords[0][0].toFixed(2)} ${height} Z`;
    svg.append(svgEl("path", { d: area, fill: "url(#eqFill)" }));
    svg.append(svgEl("path", {
      d: line,
      fill: "none",
      stroke: color,
      "stroke-width": "2.25",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));
  }

  const last = coords[coords.length - 1];
  svg.append(svgEl("circle", {
    cx: last[0].toFixed(2),
    cy: last[1].toFixed(2),
    r: "3.6",
    fill: color,
    stroke: "#fffdf9",
    "stroke-width": "1.5",
  }));
  return svg;
}

function renderFeed(list) {
  const section = document.getElementById("sec-feed");
  const box = document.getElementById("feed-list");
  box.replaceChildren();
  const items = list.filter((entry) => entry && entry.text != null && String(entry.text).trim() !== "");
  section.hidden = items.length === 0;
  const ordered = sortByTime(items, "zeit", -1).slice(0, 8);
  document.getElementById("feed-count").textContent = items.length > 8 ? "letzte 8" : "";
  for (const entry of ordered) {
    const item = el("li");
    const time = el("time", null, entry.zeit ? formatStamp(entry.zeit) : "—");
    if (entry.zeit) time.dateTime = entry.zeit;
    item.append(time, el("p", null, String(entry.text)));
    box.append(item);
  }
}

function render(data) {
  renderHero(data);
  renderOpen(asArray(data.offenePositionen));
  renderPending(asArray(data.pendingOrders));
  renderHistory(asArray(data.historie));
  renderEquity(asArray(data.equityKurve), data);
  renderFeed(asArray(data.feed));
}

function clearError() {
  document.getElementById("status").hidden = true;
  const error = document.getElementById("error");
  error.hidden = true;
  error.textContent = "";
}

function showError(err) {
  document.getElementById("status").hidden = true;
  const error = document.getElementById("error");
  const reason = err && err.message ? err.message : "unbekannter Fehler";
  error.hidden = false;
  error.textContent = current
    ? `Aktualisierung fehlgeschlagen (${reason}). Der letzte Stand bleibt sichtbar.`
    : `Daten konnten nicht geladen werden (${reason}).`;
}

async function loadData() {
  const request = ++seq;
  try {
    const response = await fetch(`data.json?t=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (request !== seq) return;
    const raw = JSON.stringify(data);
    current = data;
    if (raw !== lastRaw) {
      lastRaw = raw;
      render(data);
    } else {
      updateFreshness(data);
    }
    clearError();
  } catch (err) {
    if (request !== seq) return;
    showError(err);
  }
}

function boot() {
  loadData();
  setInterval(loadData, REFRESH_MS);
  setInterval(() => {
    if (current) updateFreshness(current);
  }, 15000);
}

boot();
