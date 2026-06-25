const EQUIPMENT = [
  { key: "fullCarts", label: "FC800G Full Carts", source: "Full Carts", countLabel: "FC800G" },
  { key: "halfCarts", label: "HC801G Half Carts", source: "Half Carts", countLabel: "HC801G" },
  { key: "carrierBoxes", label: "CB806G Carrier Boxes", source: "Carrier Boxes", countLabel: "CB806G" },
  { key: "airbusCarts", label: "CA777 Airbus Full Carts", source: "Airbus Carts", countLabel: "CA777" },
  { key: "airbusCarriers", label: "CA767 Airbus Carriers", source: "Airbus Carriers", countLabel: "CA767" },
];

const DEFAULT_SCHEDULE_PATH = "./data/Volare-6_WebSchedule.csv";
const DEFAULT_SOURCE_NAME = "Volare-6 export";
const DATA_VERSION = "mainline-mapping-v3";
const REFERENCE_STORAGE_KEY = "equipmentDemandPlanner.referenceRows.v3";
const CYCLE_COUNT_STORAGE_KEY = "equipmentDemandPlanner.cycleCounts.v1";
const VIEW_MODE_STORAGE_KEY = "equipmentDemandPlanner.viewMode.v1";
const DEFAULT_CYCLE_COUNTS = {
  fullCarts: 1574,
  carrierBoxes: 3130,
  halfCarts: 965,
  airbusCarts: 504,
  airbusCarriers: 80,
};

const CHART_COLORS = {
  ink: "#253246",
  muted: "#627087",
  line: "#e1e6ee",
  axis: "#b9c3d1",
  demand: "#d92535",
  supply: "#214f8f",
  balance: "#7f1d2d",
  panel: "#ffffff",
};

const state = {
  schedule: [],
  reference: new Map(),
  referenceRows: [],
  station: "ORD",
  serviceDate: "",
  csc: "All",
  equipment: "fullCarts",
  cycleCounts: { ...DEFAULT_CYCLE_COUNTS },
  irrop: {
    arrivalStart: 9,
    arrivalEnd: 11,
    arrivalDelay: 1,
    departureStart: 9,
    departureEnd: 11,
    departureDelay: 0,
    groundStop: false,
  },
  viewMode: "desktop",
  activeView: "planner",
  sourceName: DEFAULT_SOURCE_NAME,
};

const els = {
  sourceLabel: document.querySelector("#sourceLabel"),
  desktopMode: document.querySelector("#desktopMode"),
  mobileMode: document.querySelector("#mobileMode"),
  plannerTab: document.querySelector("#plannerTab"),
  irropTab: document.querySelector("#irropTab"),
  equipmentTab: document.querySelector("#equipmentTab"),
  plannerView: document.querySelector("#plannerView"),
  irropView: document.querySelector("#irropView"),
  equipmentView: document.querySelector("#equipmentView"),
  scheduleFile: document.querySelector("#scheduleFile"),
  resetButton: document.querySelector("#resetButton"),
  stationFilter: document.querySelector("#stationFilter"),
  dateFilter: document.querySelector("#dateFilter"),
  cscFilter: document.querySelector("#cscFilter"),
  equipmentFilter: document.querySelector("#equipmentFilter"),
  outboundFlights: document.querySelector("#outboundFlights"),
  eligibleFlights: document.querySelector("#eligibleFlights"),
  excludedFlights: document.querySelector("#excludedFlights"),
  selectedDailyDemandLabel: document.querySelector("#selectedDailyDemandLabel"),
  selectedDailyDemand: document.querySelector("#selectedDailyDemand"),
  peakDemand: document.querySelector("#peakDemand"),
  maxShortfall: document.querySelector("#maxShortfall"),
  scheduleCount: document.querySelector("#scheduleCount"),
  scheduleBody: document.querySelector("#scheduleBody"),
  demandHead: document.querySelector("#demandHead"),
  demandBody: document.querySelector("#demandBody"),
  gapCount: document.querySelector("#gapCount"),
  gapList: document.querySelector("#gapList"),
  curveCanvas: document.querySelector("#curveCanvas"),
  downloadDemand: document.querySelector("#downloadDemand"),
  equipmentCount: document.querySelector("#equipmentCount"),
  referenceBody: document.querySelector("#referenceBody"),
  referenceSearch: document.querySelector("#referenceSearch"),
  addEquipmentRow: document.querySelector("#addEquipmentRow"),
  downloadReference: document.querySelector("#downloadReference"),
  resetReference: document.querySelector("#resetReference"),
  cycleInputs: document.querySelectorAll("[data-cycle-key]"),
  irropArrivalStart: document.querySelector("#irropArrivalStart"),
  irropArrivalEnd: document.querySelector("#irropArrivalEnd"),
  irropArrivalWindowValue: document.querySelector("#irropArrivalWindowValue"),
  irropArrivalDelay: document.querySelector("#irropArrivalDelay"),
  irropArrivalDelayValue: document.querySelector("#irropArrivalDelayValue"),
  irropDepartureStart: document.querySelector("#irropDepartureStart"),
  irropDepartureEnd: document.querySelector("#irropDepartureEnd"),
  irropDepartureWindowValue: document.querySelector("#irropDepartureWindowValue"),
  irropDepartureDelay: document.querySelector("#irropDepartureDelay"),
  irropDepartureDelayValue: document.querySelector("#irropDepartureDelayValue"),
  irropGroundStop: document.querySelector("#irropGroundStop"),
  resetIrrop: document.querySelector("#resetIrrop"),
  irropCanvas: document.querySelector("#irropCanvas"),
  irropDemandFlights: document.querySelector("#irropDemandFlights"),
  irropSupplyFlights: document.querySelector("#irropSupplyFlights"),
  irropDelayedArrivals: document.querySelector("#irropDelayedArrivals"),
  irropDelayedDepartures: document.querySelector("#irropDelayedDepartures"),
  irropGroundStopMoves: document.querySelector("#irropGroundStopMoves"),
  irropShortfall: document.querySelector("#irropShortfall"),
  irropHead: document.querySelector("#irropHead"),
  irropBody: document.querySelector("#irropBody"),
  downloadIrrop: document.querySelector("#downloadIrrop"),
};

async function boot() {
  const [referenceText, scheduleText] = await Promise.all([
    fetchText(versionedPath("./data/AircraftEquipmentReference.csv")),
    fetchText(DEFAULT_SCHEDULE_PATH),
  ]);
  state.referenceRows = loadStoredReferenceRows() || buildReferenceRows(parseCsv(referenceText));
  state.reference = buildReference(state.referenceRows);
  state.schedule = normalizeSchedule(parseCsv(scheduleText));
  state.cycleCounts = loadCycleCounts();
  state.viewMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY) || "desktop";
  bindEvents();
  applyViewMode();
  populateEquipmentFilter();
  populateStationFilter();
  populateDateFilter();
  populateCscFilter();
  populateCycleInputs();
  render();
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.text();
}

function versionedPath(path) {
  return `${path}${path.includes("?") ? "&" : "?"}v=${DATA_VERSION}`;
}

function bindEvents() {
  els.desktopMode.addEventListener("click", () => setViewMode("desktop"));
  els.mobileMode.addEventListener("click", () => setViewMode("mobile"));

  els.plannerTab.addEventListener("click", () => showTab("planner"));
  els.irropTab.addEventListener("click", () => showTab("irrop"));
  els.equipmentTab.addEventListener("click", () => showTab("equipment"));

  els.scheduleFile.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      state.schedule = normalizeSchedule(await parseScheduleFile(file));
      state.sourceName = file.name;
      state.station = "All";
      state.csc = "All";
      state.serviceDate = "";
      populateStationFilter();
      populateDateFilter();
      populateCscFilter();
      render();
    } catch (error) {
      console.error(error);
      els.sourceLabel.textContent = error.message || "Unable to load that schedule file.";
    } finally {
      event.target.value = "";
    }
  });

  els.resetButton.addEventListener("click", async () => {
    const text = await fetchText(DEFAULT_SCHEDULE_PATH);
    state.schedule = normalizeSchedule(parseCsv(text));
    state.sourceName = DEFAULT_SOURCE_NAME;
    state.station = "ORD";
    state.serviceDate = "";
    state.csc = "All";
    state.equipment = "fullCarts";
    state.cycleCounts = { ...DEFAULT_CYCLE_COUNTS };
    saveCycleCounts();
    populateCycleInputs();
    populateStationFilter();
    populateDateFilter();
    populateCscFilter();
    populateEquipmentFilter();
    render();
  });

  els.stationFilter.addEventListener("change", () => {
    state.station = els.stationFilter.value;
    populateDateFilter();
    populateCscFilter();
    if (![...els.cscFilter.options].some((option) => option.value === state.csc)) {
      state.csc = "All";
    }
    syncStationFilters();
    render();
  });

  els.dateFilter.addEventListener("change", () => {
    state.serviceDate = els.dateFilter.value;
    render();
  });

  els.cscFilter.addEventListener("change", () => {
    state.csc = els.cscFilter.value;
    syncCscFilters();
    render();
  });

  els.equipmentFilter.addEventListener("change", () => {
    state.equipment = els.equipmentFilter.value;
    syncEquipmentFilters();
    render();
  });

  els.downloadDemand.addEventListener("click", () => {
    const { hourlyRows } = calculate();
    downloadCsv(hourlyRows);
  });

  els.downloadIrrop.addEventListener("click", () => {
    downloadCsv(calculate({ scenario: state.irrop }).hourlyRows, "irrop-demand-by-hour.csv");
  });

  [
    ["irropArrivalStart", "arrivalStart"],
    ["irropArrivalEnd", "arrivalEnd"],
    ["irropArrivalDelay", "arrivalDelay"],
    ["irropDepartureStart", "departureStart"],
    ["irropDepartureEnd", "departureEnd"],
    ["irropDepartureDelay", "departureDelay"],
  ].forEach(([elementKey, stateKey]) => {
    els[elementKey].addEventListener("pointerdown", () => {
      activateRangeHandle(els[elementKey]);
    });
    els[elementKey].addEventListener("input", () => {
      activateRangeHandle(els[elementKey]);
      state.irrop[stateKey] = Number(els[elementKey].value);
      normalizeIrropWindows(stateKey);
      renderIrrop();
    });
  });

  els.irropGroundStop.addEventListener("change", () => {
    state.irrop.groundStop = els.irropGroundStop.checked;
    renderIrrop();
  });

  els.resetIrrop.addEventListener("click", () => {
    state.irrop = {
      arrivalStart: 9,
      arrivalEnd: 11,
      arrivalDelay: 1,
      departureStart: 9,
      departureEnd: 11,
      departureDelay: 0,
      groundStop: false,
    };
    syncIrropControls();
    renderIrrop();
  });

  els.cycleInputs.forEach((input) => {
    input.addEventListener("input", () => {
      state.cycleCounts[input.dataset.cycleKey] = Math.max(0, Number(input.value || 0));
      saveCycleCounts();
      renderPlannerOnly();
    });
  });

  els.referenceSearch.addEventListener("input", () => renderReferenceTable());

  els.addEquipmentRow.addEventListener("click", () => {
    state.referenceRows.unshift({
      aircraftType: "",
      fullCarts: 0,
      halfCarts: 0,
      carrierBoxes: 0,
      airbusCarts: 0,
      airbusCarriers: 0,
      notes: "Added in web app",
    });
    saveReferenceRows();
    rebuildReference();
    renderReferenceTable();
  });

  els.downloadReference.addEventListener("click", () => downloadReferenceCsv());

  els.resetReference.addEventListener("click", async () => {
    const text = await fetchText(versionedPath("./data/AircraftEquipmentReference.csv"));
    state.referenceRows = buildReferenceRows(parseCsv(text));
    localStorage.removeItem(REFERENCE_STORAGE_KEY);
    rebuildReference();
    render();
  });

  els.referenceBody.addEventListener("input", (event) => {
    const input = event.target;
    const index = Number(input.dataset.index);
    const field = input.dataset.field;
    if (!Number.isInteger(index) || !field) return;
    if (field === "aircraftType") {
      state.referenceRows[index][field] = normalizeAircraft(input.value);
    } else if (field === "notes") {
      state.referenceRows[index][field] = input.value;
    } else {
      state.referenceRows[index][field] = Math.max(0, Number(input.value || 0));
    }
    saveReferenceRows();
    rebuildReference();
    renderPlannerOnly();
  });

  els.referenceBody.addEventListener("change", (event) => {
    if (event.target.dataset.field === "aircraftType") {
      event.target.value = normalizeAircraft(event.target.value);
      renderReferenceTable();
    }
  });

  els.referenceBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-index]");
    if (!button) return;
    const index = Number(button.dataset.deleteIndex);
    state.referenceRows.splice(index, 1);
    saveReferenceRows();
    rebuildReference();
    render();
  });

  window.addEventListener("resize", () => {
    drawCurve(calculate().hourlyRows, els.curveCanvas);
    drawCurve(calculate({ scenario: state.irrop }).hourlyRows, els.irropCanvas);
  });
}

async function parseScheduleFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "csv") return parseCsv(await file.text());
  if (!["xlsx", "xls"].includes(extension)) {
    throw new Error("Use a CSV, XLSX, or XLS schedule file.");
  }
  if (!window.XLSX) {
    throw new Error("Excel support could not load. Check your internet connection and try again.");
  }

  const workbook = window.XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const arrayRows = window.XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    header: 1,
    raw: true,
  });
  const turnsRows = parseTurnsReport(arrayRows);
  if (turnsRows.length) return turnsRows;

  return window.XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });
}

function parseTurnsReport(rows) {
  const headerIndex = rows.findIndex((row) => {
    const labels = row.map(normalizeHeaderLabel);
    return labels.includes("ARRV DATE") && labels.includes("STATION") && labels.includes("DEPARTS");
  });
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map(normalizeHeaderLabel);
  const dateIndex = headers.indexOf("ARRV DATE");
  const fromIndex = headers.indexOf("FROM");
  const arrivesIndex = headers.indexOf("ARRIVES");
  const aircraftIndex = headers.indexOf("A/C");
  const stationIndex = headers.indexOf("STATION");
  const toIndex = headers.indexOf("TO");
  const departsIndex = headers.indexOf("DEPARTS");
  const inboundFlightIndex = headers.findIndex((label, index) => label === "FLIGHT" && index > dateIndex && index < fromIndex);
  const outboundFlightIndex = headers.findIndex((label, index) => label === "FLIGHT" && index > stationIndex && index < toIndex);

  if ([dateIndex, fromIndex, arrivesIndex, aircraftIndex, stationIndex, toIndex, departsIndex, outboundFlightIndex].some((index) => index < 0)) {
    return [];
  }

  return rows
    .slice(headerIndex + 1)
    .map((row, index) => {
      const serviceDate = row[dateIndex];
      const station = normalizeStation(row[stationIndex]);
      const aircraft = normalizeAircraft(row[aircraftIndex]);
      const departure = combineDateAndTime(serviceDate, row[departsIndex]);
      const arrival = combineDateAndTime(serviceDate, row[arrivesIndex]);
      if (departure && arrival && departure < arrival) departure.setDate(departure.getDate() + 1);

      return {
        "Flight Number": row[outboundFlightIndex] || `Turn ${index + 1}`,
        "Inbound Flight Number": inboundFlightIndex >= 0 ? row[inboundFlightIndex] : "",
        "Aircraft Type": aircraft,
        "Scheduled Departure": departure,
        "Actual Arrival or ETA": arrival,
        "Station Event Time": departure,
        Date: departure || arrival,
        Origin: station,
        Destination: normalizeStation(row[toIndex]),
        "Inbound Origin": normalizeStation(row[fromIndex]),
        CSC: "",
        "Flight Status": "Scheduled",
      };
    })
    .filter((row) => row["Aircraft Type"] && row.Origin && (row["Scheduled Departure"] || row["Actual Arrival or ETA"]));
}

function normalizeHeaderLabel(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeStation(value) {
  return String(value || "").trim().toUpperCase();
}

function combineDateAndTime(dateValue, timeValue) {
  const date = coerceDate(dateValue);
  if (!date) return null;
  const output = new Date(date);
  const time = coerceTime(timeValue);
  if (!time) return output;
  output.setHours(time.hours, time.minutes, 0, 0);
  return output;
}

function coerceTime(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { hours: value.getHours(), minutes: value.getMinutes() };
  }
  if (typeof value === "number") {
    const dayFraction = ((value % 1) + 1) % 1;
    const totalMinutes = Math.round(dayFraction * 24 * 60);
    return { hours: Math.floor(totalMinutes / 60) % 24, minutes: totalMinutes % 60 };
  }
  const timeParts = parseTimeParts(value);
  if (timeParts) return timeParts;
  const parsed = coerceDate(value);
  if (!parsed) return null;
  return { hours: parsed.getHours(), minutes: parsed.getMinutes() };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, (cells[index] || "").trim()])),
  );
}

function buildReferenceRows(rows) {
  return rows
    .map((row) => ({
      aircraftType: normalizeAircraft(row["Aircraft Type"]),
      fullCarts: cleanNumber(row["Full Carts"]),
      halfCarts: cleanNumber(row["Half Carts"]),
      carrierBoxes: cleanNumber(row["Carrier Boxes"]),
      airbusCarts: cleanNumber(row["Airbus Carts"]),
      airbusCarriers: cleanNumber(row["Airbus Carriers"] || row["Dog Houses"]),
      notes: row.Notes || "",
    }))
    .filter((row) => row.aircraftType);
}

function buildReference(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const type = normalizeAircraft(row.aircraftType);
    if (!type) return;
    const entry = {};
    EQUIPMENT.forEach((item) => {
      entry[item.key] = cleanNumber(row[item.key]);
    });
    map.set(type, entry);
  });
  return map;
}

function cleanNumber(value) {
  return Math.max(0, Number(value || 0));
}

function loadCycleCounts() {
  try {
    const raw = localStorage.getItem(CYCLE_COUNT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CYCLE_COUNTS };
    return { ...DEFAULT_CYCLE_COUNTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CYCLE_COUNTS };
  }
}

function saveCycleCounts() {
  localStorage.setItem(CYCLE_COUNT_STORAGE_KEY, JSON.stringify(state.cycleCounts));
}

function loadStoredReferenceRows() {
  try {
    const raw = localStorage.getItem(REFERENCE_STORAGE_KEY);
    if (!raw) return null;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return null;
    return rows.map((row) => ({
      aircraftType: normalizeAircraft(row.aircraftType),
      fullCarts: cleanNumber(row.fullCarts),
      halfCarts: cleanNumber(row.halfCarts),
      carrierBoxes: cleanNumber(row.carrierBoxes),
      airbusCarts: cleanNumber(row.airbusCarts),
      airbusCarriers: cleanNumber(row.airbusCarriers || row.dogHouses),
      notes: row.notes || "",
    }));
  } catch {
    return null;
  }
}

function saveReferenceRows() {
  localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(state.referenceRows));
}

function rebuildReference() {
  state.reference = buildReference(state.referenceRows);
}

function normalizeSchedule(rows) {
  return rows.map((row, index) => {
    const aircraft = normalizeAircraft(first(row, ["Aircraft Type", "AC"]));
    const departure = parseDateTime(first(row, ["Scheduled Departure"]), first(row, ["Date", "Departure"]), first(row, ["Depart ", "Depart"]));
    const arrival = parseDateTime(first(row, ["Scheduled Arrival", "Actual Arrival or ETA"]), first(row, ["Date", "Departure"]), first(row, ["Arrive", "Arrival"]));
    const status = first(row, ["Flight Status", "Status"]) || "Scheduled";
    const origin = first(row, ["Origin", "From"]) || "";
    const destination = first(row, ["Destination", "To"]) || "";
    const csc = first(row, ["CSC", "Handling", "Hdlng"]) || "";
    const stationTime = parseDateTime(first(row, ["Station Event Time"]), first(row, ["Date", "Departure"]), first(row, ["Depart ", "Depart"]));
    return {
      id: index,
      flight: first(row, ["Flight Number", "Board", "Serv"]) || `Row ${index + 1}`,
      aircraft,
      departure,
      arrival,
      stationTime,
      status,
      gate: first(row, ["Gate"]) || "",
      origin,
      destination,
      csc,
      raw: row,
    };
  });
}

function first(row, names) {
  for (const name of names) {
    if (row[name] != null && String(row[name]).trim() !== "") return row[name];
  }
  return "";
}

function normalizeAircraft(value) {
  return String(value || "").trim().toUpperCase();
}

function parseDateTime(value, dateValue, timeValue) {
  const direct = coerceDate(value);
  if (direct) return direct;

  if (!dateValue || !timeValue) return null;
  const combined = coerceDate(`${dateValue} ${timeValue}`);
  if (combined) return combined;

  const dateOnly = coerceDate(dateValue);
  if (!dateOnly) return null;
  const timeParts = parseTimeParts(timeValue);
  if (!timeParts) return null;
  dateOnly.setHours(timeParts.hours, timeParts.minutes, 0, 0);
  return dateOnly;
}

function coerceDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && value > 1) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimeParts(value) {
  const text = String(value || "").trim().toUpperCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  if (match[3] === "PM" && hours < 12) hours += 12;
  if (match[3] === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function calculate(options = {}) {
  const scenario = options.scenario || null;
  const baseRows = state.schedule.filter((row) => {
    const stationMatch = state.station === "All" || row.origin === state.station || row.destination === state.station;
    const cscMatch = state.csc === "All" || row.csc === state.csc;
    return stationMatch && cscMatch;
  });
  const operationalWindow = getOperationalWindow(baseRows);
  const rows = baseRows.filter((row) => isFlightInOperationalWindow(row, operationalWindow));
  const missing = new Map();
  const events = new Map();
  let inbound = 0;
  let excluded = 0;
  let outbound = 0;
  let dailyDemand = 0;
  let delayedArrivals = 0;
  let delayedDepartures = 0;
  let groundStopMoves = 0;

  rows.forEach((flight) => {
    const equipment = state.reference.get(flight.aircraft);
    const cancelled = /cancel/i.test(flight.status);
    const stationScoped = state.station !== "All";
    const outboundCandidate = stationScoped ? flight.origin === state.station : Boolean(flight.origin || flight.departure);
    const inboundCandidate = stationScoped ? flight.destination === state.station || (flight.origin === state.station && flight.arrival) : Boolean(flight.arrival);
    const originalDemandEventTime = flight.departure || flight.stationTime;
    const originalSupplyEventTime = flight.arrival || (originalDemandEventTime ? addHours(originalDemandEventTime, -8) : null);
    let demandEventTime = originalDemandEventTime;
    let supplyEventTime = originalSupplyEventTime;

    if (scenario && demandEventTime && scenario.departureDelay > 0 && isTimeInWindow(demandEventTime, scenario.departureStart, scenario.departureEnd)) {
      demandEventTime = addHours(demandEventTime, scenario.departureDelay);
      delayedDepartures += 1;
    }

    if (scenario && supplyEventTime) {
      if (scenario.groundStop && isTimeInWindow(supplyEventTime, scenario.arrivalStart, scenario.arrivalEnd)) {
        supplyEventTime = moveToWindowEnd(supplyEventTime, scenario.arrivalEnd);
        groundStopMoves += 1;
      }
      if (scenario.arrivalDelay > 0 && isTimeInWindow(supplyEventTime, scenario.arrivalStart, scenario.arrivalEnd)) {
        supplyEventTime = addHours(supplyEventTime, scenario.arrivalDelay);
        delayedArrivals += 1;
      }
    }

    const demandEligible = outboundCandidate && equipment && demandEventTime && !cancelled;
    const supplyEligible = inboundCandidate && equipment && supplyEventTime && !cancelled;

    if (outboundCandidate && !equipment && flight.aircraft) {
      missing.set(flight.aircraft, (missing.get(flight.aircraft) || 0) + 1);
    }

    if (demandEligible) {
      outbound += 1;
      dailyDemand += totalEquipment(equipment);
      const demandTime = addHours(demandEventTime, -2);
      if (isInOperationalWindow(demandTime, operationalWindow)) {
        addEvent(events, hourBucket(demandTime), "demand", equipment);
      }
    } else if (outboundCandidate) {
      outbound += 1;
      excluded += 1;
    }

    if (supplyEligible) {
      inbound += 1;
      const supplyTime = addHours(supplyEventTime, 2);
      if (isInOperationalWindow(supplyTime, operationalWindow)) {
        addEvent(events, hourBucket(supplyTime), "supply", equipment);
      }
    }
  });

  const hourlyRows = Array.from(events.values()).sort((a, b) => a.time - b.time);
  let inventory = selectedCycleCount();
  hourlyRows.forEach((row) => {
    const demand = totalEquipment(row.demand);
    const supply = totalEquipment(row.supply);
    inventory += supply - demand;
    row.totalDemand = demand;
    row.totalSupply = supply;
    row.inventory = inventory;
    row.shortfall = Math.max(0, -inventory);
  });

  return {
    hourlyRows,
    rows: filteredSchedule(),
    missing,
    inbound,
    excluded,
    outbound,
    starting: selectedCycleCount(),
    dailyDemand,
    delayedArrivals,
    delayedDepartures,
    groundStopMoves,
  };
}

function filteredSchedule() {
  const stationRows = state.schedule.filter((row) => {
    const stationMatch = state.station === "All" || row.origin === state.station || row.destination === state.station;
    const cscMatch = state.csc === "All" || row.csc === state.csc;
    return stationMatch && cscMatch;
  });
  const operationalWindow = getOperationalWindow(stationRows);
  return stationRows.filter((row) => isFlightInOperationalWindow(row, operationalWindow));
}

function isFlightInOperationalWindow(row, window) {
  return [row.departure, row.arrival, row.stationTime].some((date) => date && isInOperationalWindow(date, window));
}

function selectedCycleCount() {
  return selectedEquipment().reduce((sum, item) => sum + cleanNumber(state.cycleCounts[item.key]), 0);
}

function addEvent(events, time, direction, equipment) {
  if (!time) return;
  const key = time.toISOString();
  if (!events.has(key)) {
    events.set(key, {
      time,
      demand: blankEquipment(),
      supply: blankEquipment(),
      totalDemand: 0,
      totalSupply: 0,
      inventory: 0,
      shortfall: 0,
    });
  }

  const target = events.get(key)[direction];
  selectedEquipment().forEach((item) => {
    target[item.key] += Number(equipment[item.key] || 0);
  });
}

function selectedEquipment() {
  if (state.equipment === "all") return EQUIPMENT;
  return EQUIPMENT.filter((item) => item.key === state.equipment);
}

function blankEquipment() {
  return Object.fromEntries(EQUIPMENT.map((item) => [item.key, 0]));
}

function totalEquipment(values) {
  return selectedEquipment().reduce((sum, item) => sum + Number(values[item.key] || 0), 0);
}

function hourBucket(date) {
  if (!date) return null;
  const output = new Date(date);
  output.setMinutes(0, 0, 0);
  return output;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function getOperationalWindow(rows) {
  if (state.serviceDate) {
    const [year, month, day] = state.serviceDate.split("-").map(Number);
    if (year && month && day) {
      const start = new Date(year, month - 1, day, 2, 0, 0, 0);
      return { start, end: addHours(start, 24) };
    }
  }

  const outboundDates = rows
    .filter((row) => state.station === "All" || row.origin === state.station)
    .map((row) => row.departure || row.stationTime)
    .filter(Boolean);
  const counts = new Map();
  outboundDates.forEach((date) => {
    const key = dateKey(date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const selectedKey = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || dateKey(new Date());
  const [year, month, day] = selectedKey.split("-").map(Number);
  const start = new Date(year, month - 1, day, 2, 0, 0, 0);
  return { start, end: addHours(start, 24) };
}

function isInOperationalWindow(date, window) {
  return date >= window.start && date < window.end;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function operationalDateKey(date) {
  if (!date) return "";
  return dateKey(addHours(date, -2));
}

function formatDateLabel(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

function isTimeInWindow(date, startHour, endHour) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (startHour === endHour) return false;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

function moveToWindowEnd(date, endHour) {
  const output = new Date(date);
  output.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
  if (output < date) output.setDate(output.getDate() + 1);
  return output;
}

function render() {
  renderPlannerOnly();
  renderIrrop();
  renderReferenceTable();
}

function renderPlannerOnly() {
  const result = calculate();
  renderSourceLabel();
  renderSummary(result);
  renderSchedule(result.rows);
  renderDemandTable(result.hourlyRows);
  renderGaps(result.missing);
  drawCurve(result.hourlyRows);
}

function renderSourceLabel() {
  const hubNote = state.station === "All" ? "All hubs" : `${state.station} hub`;
  const dateNote = state.serviceDate ? formatDateLabel(state.serviceDate) : "Auto date";
  els.sourceLabel.textContent = `${state.sourceName} • ${hubNote} • ${dateNote} • ${state.reference.size} aircraft mappings loaded`;
}

function renderIrrop() {
  syncIrropControls();
  const result = calculate({ scenario: state.irrop });
  els.irropDemandFlights.textContent = formatNumber(result.outbound);
  els.irropSupplyFlights.textContent = formatNumber(result.inbound);
  els.irropDelayedArrivals.textContent = formatNumber(result.delayedArrivals);
  els.irropDelayedDepartures.textContent = formatNumber(result.delayedDepartures);
  els.irropGroundStopMoves.textContent = formatNumber(result.groundStopMoves);
  els.irropShortfall.textContent = formatNumber(Math.max(0, ...result.hourlyRows.map((row) => row.shortfall)));
  renderScenarioTable(result.hourlyRows);
  drawCurve(result.hourlyRows, els.irropCanvas);
}

function showTab(tabName) {
  state.activeView = tabName;
  const equipmentActive = tabName === "equipment";
  const irropActive = tabName === "irrop";
  els.equipmentView.classList.toggle("hidden", !equipmentActive);
  els.irropView.classList.toggle("hidden", !irropActive);
  els.plannerView.classList.toggle("hidden", equipmentActive || irropActive);
  els.equipmentTab.classList.toggle("active", equipmentActive);
  els.irropTab.classList.toggle("active", irropActive);
  els.plannerTab.classList.toggle("active", !equipmentActive && !irropActive);
  if (equipmentActive) renderReferenceTable();
  else if (irropActive) renderIrrop();
  else drawCurve(calculate().hourlyRows, els.curveCanvas);
}

function setViewMode(mode) {
  state.viewMode = mode;
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  applyViewMode();
  setTimeout(() => {
    drawCurve(calculate().hourlyRows, els.curveCanvas);
    drawCurve(calculate({ scenario: state.irrop }).hourlyRows, els.irropCanvas);
  }, 50);
}

function applyViewMode() {
  document.body.classList.toggle("mobile-mode", state.viewMode === "mobile");
  document.body.classList.toggle("desktop-mode", state.viewMode !== "mobile");
  els.desktopMode.classList.toggle("active", state.viewMode !== "mobile");
  els.mobileMode.classList.toggle("active", state.viewMode === "mobile");
}

function renderSummary({ hourlyRows, inbound, starting, outbound, dailyDemand }) {
  const peakDemand = Math.max(0, ...hourlyRows.map((row) => row.totalDemand));
  const maxShortfall = Math.max(0, ...hourlyRows.map((row) => row.shortfall));
  const selectedLabel = state.equipment === "all" ? "All equipment" : selectedEquipment()[0].countLabel;
  els.outboundFlights.textContent = formatNumber(outbound);
  els.eligibleFlights.textContent = formatNumber(inbound);
  els.excludedFlights.textContent = formatNumber(starting);
  els.selectedDailyDemandLabel.textContent = `${selectedLabel} daily demand`;
  els.selectedDailyDemand.textContent = formatNumber(dailyDemand);
  els.peakDemand.textContent = formatNumber(peakDemand);
  els.maxShortfall.textContent = formatNumber(maxShortfall);
}

function renderSchedule(rows) {
  els.scheduleCount.textContent = `${formatNumber(rows.length)} rows`;
  els.scheduleBody.innerHTML = rows
    .slice(0, 350)
    .map((row) => {
      const mapped = state.reference.has(row.aircraft);
      const statusClass = mapped && row.departure ? "status-ok" : "status-warn";
      return `<tr>
        <td>${escapeHtml(row.flight)}</td>
        <td>${escapeHtml(row.aircraft || "-")}</td>
        <td>${escapeHtml(row.origin || "-")}</td>
        <td>${escapeHtml(row.destination || "-")}</td>
        <td>${escapeHtml(row.csc || "-")}</td>
        <td>${formatTime(row.stationTime || row.departure || row.arrival)}</td>
        <td class="${statusClass}">${mapped ? escapeHtml(row.status) : "Unmapped"}</td>
      </tr>`;
    })
    .join("");
}

function renderDemandTable(rows) {
  const equipmentColumns = selectedEquipment();
  els.demandHead.innerHTML = `<tr>
    <th>Hour</th>
    <th>Demand</th>
    <th>Supply</th>
    <th>Inventory</th>
    <th>Shortfall</th>
    ${equipmentColumns.map((item) => `<th>${escapeHtml(item.label)}</th>`).join("")}
  </tr>`;

  els.demandBody.innerHTML = rows
    .map((row) => `<tr>
      <td>${formatHour(row.time)}</td>
      <td>${formatNumber(row.totalDemand)}</td>
      <td>${formatNumber(row.totalSupply)}</td>
      <td>${formatNumber(row.inventory)}</td>
      <td>${formatNumber(row.shortfall)}</td>
      ${equipmentColumns.map((item) => `<td>${formatNumber(row.demand[item.key])}</td>`).join("")}
    </tr>`)
    .join("");
}

function renderScenarioTable(rows) {
  const equipmentColumns = selectedEquipment();
  els.irropHead.innerHTML = `<tr>
    <th>Hour</th>
    <th>Demand</th>
    <th>Supply</th>
    <th>Inventory</th>
    <th>Shortfall</th>
    ${equipmentColumns.map((item) => `<th>${escapeHtml(item.label)}</th>`).join("")}
  </tr>`;

  els.irropBody.innerHTML = rows
    .map((row) => `<tr>
      <td>${formatHour(row.time)}</td>
      <td>${formatNumber(row.totalDemand)}</td>
      <td>${formatNumber(row.totalSupply)}</td>
      <td>${formatNumber(row.inventory)}</td>
      <td>${formatNumber(row.shortfall)}</td>
      ${equipmentColumns.map((item) => `<td>${formatNumber(row.demand[item.key])}</td>`).join("")}
    </tr>`)
    .join("");
}

function renderGaps(missing) {
  const gaps = Array.from(missing.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  els.gapCount.textContent = `${formatNumber(gaps.length)} types`;
  if (!gaps.length) {
    els.gapList.innerHTML = `<div class="empty">No unmapped aircraft in the current schedule.</div>`;
    return;
  }
  els.gapList.innerHTML = gaps
    .map(([type, count]) => `<div class="gap"><strong>${escapeHtml(type)}</strong><span>${formatNumber(count)} flights</span></div>`)
    .join("");
}

function renderReferenceTable() {
  const search = normalizeAircraft(els.referenceSearch.value);
  const rows = state.referenceRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !search || row.aircraftType.includes(search) || (row.notes || "").toUpperCase().includes(search));
  els.equipmentCount.textContent = `${formatNumber(state.reference.size)} mappings`;
  els.referenceBody.innerHTML = rows
    .map(({ row, index }) => `<tr>
      <td><input data-index="${index}" data-field="aircraftType" type="text" value="${escapeHtml(row.aircraftType)}" /></td>
      <td><input data-index="${index}" data-field="fullCarts" type="number" min="0" step="1" value="${row.fullCarts}" /></td>
      <td><input data-index="${index}" data-field="halfCarts" type="number" min="0" step="1" value="${row.halfCarts}" /></td>
      <td><input data-index="${index}" data-field="carrierBoxes" type="number" min="0" step="1" value="${row.carrierBoxes}" /></td>
      <td><input data-index="${index}" data-field="airbusCarts" type="number" min="0" step="1" value="${row.airbusCarts}" /></td>
      <td><input data-index="${index}" data-field="airbusCarriers" type="number" min="0" step="1" value="${row.airbusCarriers}" /></td>
      <td><input class="reference-note" data-index="${index}" data-field="notes" type="text" value="${escapeHtml(row.notes)}" /></td>
      <td><button class="delete-row" data-delete-index="${index}" type="button" title="Remove aircraft">X</button></td>
    </tr>`)
    .join("");
}

function populateStationFilter() {
  const stations = new Set(["All"]);
  state.schedule.forEach((row) => {
    if (row.origin) stations.add(row.origin);
    if (row.destination) stations.add(row.destination);
  });
  if (!stations.has(state.station)) state.station = stations.has("ORD") ? "ORD" : "All";
  els.stationFilter.innerHTML = Array.from(stations)
    .sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)))
    .map((station) => `<option value="${escapeHtml(station)}">${escapeHtml(station)}</option>`)
    .join("");
  els.stationFilter.value = state.station;
}

function populateDateFilter() {
  const dates = Array.from(availableOperationalDates());
  if (!dates.length) {
    state.serviceDate = "";
    els.dateFilter.value = "";
    els.dateFilter.removeAttribute("min");
    els.dateFilter.removeAttribute("max");
    return;
  }

  dates.sort();
  if (!state.serviceDate || !dates.includes(state.serviceDate)) {
    state.serviceDate = busiestOperationalDate(dates);
  }
  els.dateFilter.min = dates[0];
  els.dateFilter.max = dates[dates.length - 1];
  els.dateFilter.value = state.serviceDate;
}

function availableOperationalDates() {
  const dates = new Set();
  state.schedule.forEach((row) => {
    const stationMatch = state.station === "All" || row.origin === state.station || row.destination === state.station;
    if (!stationMatch) return;
    [row.departure, row.arrival, row.stationTime].forEach((date) => {
      if (!date) return;
      dates.add(operationalDateKey(date));
    });
  });
  return dates;
}

function busiestOperationalDate(dates) {
  const allowed = new Set(dates);
  const counts = new Map();
  state.schedule.forEach((row) => {
    const stationMatch = state.station === "All" || row.origin === state.station || row.destination === state.station;
    if (!stationMatch) return;
    const key = operationalDateKey(row.departure || row.stationTime || row.arrival);
    if (!allowed.has(key)) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || dates[0];
}

function populateCscFilter() {
  const cscs = new Set(["All"]);
  state.schedule.forEach((row) => {
    if (state.station !== "All" && row.origin !== state.station) return;
    if (row.csc) cscs.add(row.csc);
  });
  els.cscFilter.innerHTML = Array.from(cscs)
    .sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)))
    .map((csc) => `<option value="${escapeHtml(csc)}">${escapeHtml(csc)}</option>`)
    .join("");
  els.cscFilter.value = cscs.has(state.csc) ? state.csc : "All";
  state.csc = els.cscFilter.value;
}

function populateEquipmentFilter() {
  els.equipmentFilter.innerHTML = [
    `<option value="all">All Equipment</option>`,
    ...EQUIPMENT.map((item) => `<option value="${item.key}">${escapeHtml(item.label)}</option>`),
  ].join("");
  els.equipmentFilter.value = state.equipment;
}

function syncStationFilters() {
  els.stationFilter.value = state.station;
}

function syncCscFilters() {
  els.cscFilter.value = state.csc;
}

function syncEquipmentFilters() {
  els.equipmentFilter.value = state.equipment;
}

function populateCycleInputs() {
  els.cycleInputs.forEach((input) => {
    input.value = cleanNumber(state.cycleCounts[input.dataset.cycleKey]);
  });
}

function syncIrropControls() {
  normalizeIrropWindows();
  els.irropArrivalStart.value = state.irrop.arrivalStart;
  els.irropArrivalEnd.value = state.irrop.arrivalEnd;
  els.irropArrivalDelay.value = state.irrop.arrivalDelay;
  els.irropDepartureStart.value = state.irrop.departureStart;
  els.irropDepartureEnd.value = state.irrop.departureEnd;
  els.irropDepartureDelay.value = state.irrop.departureDelay;
  els.irropGroundStop.checked = state.irrop.groundStop;
  els.irropArrivalWindowValue.textContent = formatWindowLabel(state.irrop.arrivalStart, state.irrop.arrivalEnd);
  els.irropArrivalDelayValue.textContent = `${formatHourAmount(state.irrop.arrivalDelay)} hr`;
  els.irropDepartureWindowValue.textContent = formatWindowLabel(state.irrop.departureStart, state.irrop.departureEnd);
  els.irropDepartureDelayValue.textContent = `${formatHourAmount(state.irrop.departureDelay)} hr`;
  syncRangePair(els.irropArrivalStart, els.irropArrivalEnd);
  syncRangePair(els.irropDepartureStart, els.irropDepartureEnd);
  syncRangeFill(els.irropArrivalDelay);
  syncRangeFill(els.irropDepartureDelay);
}

function normalizeIrropWindows(changedKey = "") {
  enforceWindowOrder("arrivalStart", "arrivalEnd", changedKey);
  enforceWindowOrder("departureStart", "departureEnd", changedKey);
}

function enforceWindowOrder(startKey, endKey, changedKey) {
  const start = Number(state.irrop[startKey]);
  const end = Number(state.irrop[endKey]);
  if (start <= end) return;
  if (changedKey === endKey) {
    state.irrop[startKey] = end;
  } else {
    state.irrop[endKey] = start;
  }
}

function syncRangePair(startInput, endInput) {
  const wrapper = startInput.closest(".range-pair");
  if (!wrapper) return;
  const min = Number(startInput.min);
  const max = Number(startInput.max);
  const span = max - min || 1;
  const startPercent = ((Number(startInput.value) - min) / span) * 100;
  const endPercent = ((Number(endInput.value) - min) / span) * 100;
  wrapper.style.setProperty("--start", `${startPercent}%`);
  wrapper.style.setProperty("--end", `${endPercent}%`);
}

function activateRangeHandle(input) {
  const wrapper = input.closest(".range-pair");
  const scope = wrapper || input.closest(".control") || document;
  scope.querySelectorAll('input[type="range"]').forEach((item) => item.classList.remove("active"));
  input.classList.add("active");
}

function syncRangeFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const span = max - min || 1;
  const percent = ((Number(input.value) - min) / span) * 100;
  input.style.setProperty("--value", `${percent}%`);
}

function formatWindowLabel(start, end) {
  return `${formatHourOfDay(start)} - ${formatHourOfDay(end)}`;
}

function drawCurve(rows, canvas = els.curveCanvas) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(700, Math.floor(rect.width * ratio));
  canvas.height = Math.max(300, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 24, right: 28, bottom: 52, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxY = Math.max(10, ...rows.flatMap((row) => [row.totalDemand, row.totalSupply, Math.abs(row.inventory)]));

  ctx.fillStyle = CHART_COLORS.panel;
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, pad, plotW, plotH, maxY);

  if (!rows.length) {
    ctx.fillStyle = CHART_COLORS.muted;
    ctx.font = "14px Inter, system-ui, sans-serif";
    ctx.fillText("No eligible hourly events for the current filters.", pad.left, pad.top + 32);
    return;
  }

  const x = (index) => pad.left + (rows.length === 1 ? plotW / 2 : (index / (rows.length - 1)) * plotW);
  const y = (value) => pad.top + plotH - (value / maxY) * plotH;
  const ySigned = (value) => y(Math.max(0, value));

  drawGroupedBars(ctx, rows, pad, plotW, plotH, maxY);
  drawLine(ctx, rows.map((row, index) => [x(index), ySigned(row.inventory)]), CHART_COLORS.balance, 2);

  ctx.fillStyle = CHART_COLORS.ink;
  ctx.font = "12px Inter, system-ui, sans-serif";
  const tickStep = Math.max(1, Math.ceil(rows.length / 8));
  rows.forEach((row, index) => {
    if (index % tickStep !== 0 && index !== rows.length - 1) return;
    const label = formatShortHour(row.time);
    ctx.save();
    ctx.translate(x(index), height - 16);
    ctx.rotate(-Math.PI / 8);
    ctx.textAlign = "right";
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });
}

function drawGroupedBars(ctx, rows, pad, plotW, plotH, maxY) {
  const groupW = rows.length <= 1 ? Math.min(52, plotW / 3) : Math.max(8, Math.min(34, (plotW / rows.length) * 0.72));
  const barW = Math.max(3, groupW / 2 - 2);
  const zeroY = pad.top + plotH;

  rows.forEach((row, index) => {
    const centerX = pad.left + (rows.length === 1 ? plotW / 2 : (index / (rows.length - 1)) * plotW);
    const demandH = (row.totalDemand / maxY) * plotH;
    const supplyH = (row.totalSupply / maxY) * plotH;

    ctx.fillStyle = CHART_COLORS.demand;
    ctx.fillRect(centerX - barW - 1, zeroY - demandH, barW, demandH);

    ctx.fillStyle = CHART_COLORS.supply;
    ctx.fillRect(centerX + 1, zeroY - supplyH, barW, supplyH);
  });
}

function drawGrid(ctx, pad, plotW, plotH, maxY) {
  ctx.strokeStyle = CHART_COLORS.line;
  ctx.lineWidth = 1;
  ctx.fillStyle = CHART_COLORS.muted;
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + plotH - (i / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(formatNumber(Math.round((maxY * i) / 4)), pad.left - 10, y);
  }

  ctx.strokeStyle = CHART_COLORS.axis;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();
}

function drawLine(ctx, points, color, width) {
  if (!points.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function downloadCsv(rows, filename = "equipment-demand-by-hour.csv") {
  const selected = selectedEquipment();
  const headers = ["Hour", "Demand", "Supply", "Projected Inventory", "Shortfall", ...selected.map((item) => `${item.label} Demand`)];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        formatHour(row.time),
        row.totalDemand,
        row.totalSupply,
        row.inventory,
        row.shortfall,
        ...selected.map((item) => row.demand[item.key]),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadReferenceCsv() {
  const headers = ["Aircraft Type", ...EQUIPMENT.map((item) => item.source), "Notes"];
  const lines = [
    headers.map(csvValue).join(","),
    ...state.referenceRows
      .filter((row) => row.aircraftType)
      .map((row) =>
        [
          row.aircraftType,
          row.fullCarts,
          row.halfCarts,
          row.carrierBoxes,
          row.airbusCarts,
          row.airbusCarriers,
          row.notes || "",
        ]
          .map(csvValue)
          .join(","),
      ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "AircraftEquipmentReference_Edited.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatTime(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatHour(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
  }).format(date);
}

function formatShortHour(date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(date);
}

function formatHourOfDay(hour) {
  const date = new Date(2026, 0, 1, Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(date);
}

function formatHourAmount(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot().catch((error) => {
  console.error(error);
  els.sourceLabel.textContent = "Unable to load local data files. Open this app through a local web server.";
});
