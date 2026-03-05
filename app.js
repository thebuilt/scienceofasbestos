const CONFIG = {
  worldTopoUrl: "./data/world/countries-110m.json",
  indiaGeoJsonUrl: "./data/india-states-simplified.geojson",
  countryDataUrl: "./data/country-data.json",
  ownerReviewGithubRepo: "", // Example: "your-org/asbestos-map-updates"
  ownerReviewLabels: ["country-update", "owner-review"]
};

const STORAGE_KEY = "asbestos_map_pending_suggestions_v1";

const svg = d3.select("#map");
const tooltip = document.getElementById("tooltip");
const selectedCountryEl = document.getElementById("selected-country");
const detailStatusEl = document.getElementById("detail-status");
const detailOrgsEl = document.getElementById("detail-orgs");
const detailRecordsEl = document.getElementById("detail-records");
const detailRemarksEl = document.getElementById("detail-remarks");
const detailSourceEl = document.getElementById("detail-source");
const form = document.getElementById("suggestion-form");
const statusMsg = document.getElementById("form-status-msg");
const downloadPendingBtn = document.getElementById("download-pending");

let lockedCountry = null;
let countryData = null;
let recordsByNormName = new Map();
let aliases = new Map();

function normalizeName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function statusToClass(status) {
  if (status === "Banned") return "banned";
  if (status === "Controlled") return "controlled";
  if (status === "Still in Use") return "inuse";
  return "unknown";
}

function defaultRecord(countryName) {
  return {
    status: "Still in Use",
    organisations: "Not yet populated",
    recordKeeping: "Not yet populated",
    remarks: "No verified country-specific entry yet. Use the update form to submit reviewed information.",
    source: "Default placeholder"
  };
}

function getRecordByCountry(countryName) {
  const normalized = normalizeName(countryName);
  const aliasResolved = aliases.get(normalized) || normalized;
  return recordsByNormName.get(aliasResolved) || defaultRecord(countryName);
}

function setSelectedCountry(countryName) {
  const record = getRecordByCountry(countryName);
  selectedCountryEl.textContent = countryName;
  detailStatusEl.textContent = record.status;
  detailOrgsEl.textContent = record.organisations;
  detailRecordsEl.textContent = record.recordKeeping;
  detailRemarksEl.textContent = record.remarks;
  detailSourceEl.textContent = `Source: ${record.source || "Not specified"}`;

  document.getElementById("form-country").value = countryName;
  document.getElementById("form-status").value = record.status === "Not yet populated" ? "Still in Use" : record.status;
  document.getElementById("form-orgs").value = record.organisations === "Not yet populated" ? "" : record.organisations;
  document.getElementById("form-records").value = record.recordKeeping === "Not yet populated" ? "" : record.recordKeeping;
  document.getElementById("form-remarks").value = record.remarks.includes("No verified") ? "" : record.remarks;
}

function tooltipHtml(countryName, record) {
  return `
    <h3>${countryName}</h3>
    <div><span class="k">Status of Asbestos Use:</span> ${record.status}</div>
    <div><span class="k">Major organisations:</span> ${record.organisations}</div>
    <div><span class="k">Mesothelioma Record Keeping:</span> ${record.recordKeeping}</div>
    <div><span class="k">Major remarks:</span> ${record.remarks}</div>
  `;
}

function showTooltip(evt, countryName) {
  const record = getRecordByCountry(countryName);
  tooltip.innerHTML = tooltipHtml(countryName, record);
  tooltip.classList.add("visible");

  const box = svg.node().getBoundingClientRect();
  const x = evt.clientX - box.left + 12;
  const y = evt.clientY - box.top + 14;

  const maxLeft = box.width - tooltip.offsetWidth - 8;
  const maxTop = box.height - tooltip.offsetHeight - 8;

  tooltip.style.left = `${Math.max(8, Math.min(maxLeft, x))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(maxTop, y))}px`;
}

function hideTooltip() {
  tooltip.classList.remove("visible");
}

function clearHoverStates() {
  d3.selectAll(".country").classed("hovered", false).classed("locked", false);
  if (lockedCountry) {
    d3.selectAll(`.country[data-country="${lockedCountry.replace(/"/g, '\\"')}"]`).classed("locked", true);
  }
}

function buildIssueUrl(suggestion) {
  if (!CONFIG.ownerReviewGithubRepo) return "";
  const title = `Country data update: ${suggestion.country}`;
  const body = [
    `Proposed update for **${suggestion.country}**`,
    "",
    `- Status of Asbestos Use: ${suggestion.status}`,
    `- Major organisations working in the area: ${suggestion.organisations || "(none provided)"}`,
    `- Mesothelioma Record Keeping: ${suggestion.recordKeeping || "(none provided)"}`,
    `- Any major remarks: ${suggestion.remarks || "(none provided)"}`,
    `- Submitter email: ${suggestion.email || "(not provided)"}`,
    `- Submitted at: ${suggestion.submittedAt}`,
    "",
    "```json",
    JSON.stringify(suggestion, null, 2),
    "```"
  ].join("\n");

  const labels = encodeURIComponent(CONFIG.ownerReviewLabels.join(","));
  return `https://github.com/${CONFIG.ownerReviewGithubRepo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${labels}`;
}

function loadPending() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePending(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function initFormHandlers() {
  form.addEventListener("submit", (evt) => {
    evt.preventDefault();

    const suggestion = {
      country: document.getElementById("form-country").value.trim(),
      status: document.getElementById("form-status").value,
      organisations: document.getElementById("form-orgs").value.trim(),
      recordKeeping: document.getElementById("form-records").value.trim(),
      remarks: document.getElementById("form-remarks").value.trim(),
      email: document.getElementById("form-email").value.trim(),
      submittedAt: new Date().toISOString()
    };

    if (!suggestion.country) {
      statusMsg.textContent = "Please provide a country name.";
      return;
    }

    const pending = loadPending();
    pending.push(suggestion);
    savePending(pending);

    const issueUrl = buildIssueUrl(suggestion);
    if (issueUrl) {
      window.open(issueUrl, "_blank", "noopener");
      statusMsg.textContent = "Suggestion queued locally and GitHub issue draft opened for owner review.";
    } else {
      statusMsg.textContent = "Suggestion queued locally. Configure ownerReviewGithubRepo in app.js to route submissions to owner review via GitHub Issues.";
    }
  });

  downloadPendingBtn.addEventListener("click", () => {
    const pending = loadPending();
    if (!pending.length) {
      statusMsg.textContent = "No pending suggestions in this browser yet.";
      return;
    }
    downloadJson("asbestos-map-pending-suggestions.json", pending);
    statusMsg.textContent = `Downloaded ${pending.length} pending suggestion(s).`;
  });
}

function buildDataIndexes(rawData) {
  recordsByNormName = new Map();
  aliases = new Map();

  Object.entries(rawData.countryAliases || {}).forEach(([alias, canonical]) => {
    aliases.set(normalizeName(alias), normalizeName(canonical));
  });

  Object.entries(rawData.countries || {}).forEach(([country, record]) => {
    recordsByNormName.set(normalizeName(country), record);
  });
}

function renderMap(worldTopo, indiaGeo) {
  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);

  const worldFeatures = topojson.feature(worldTopo, worldTopo.objects.countries).features;
  worldFeatures.forEach((f) => {
    f.properties = f.properties || {};
    f.properties.name = f.properties.name || "Unknown";
  });

  const worldWithoutIndia = worldFeatures.filter((f) => normalizeName(f.properties.name) !== "india");

  projection.fitExtent(
    [[12, 12], [1068, 548]],
    { type: "FeatureCollection", features: [...worldWithoutIndia, ...indiaGeo.features] }
  );

  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("fill", "#eaf2ff")
    .attr("d", path);

  const worldLayer = svg.append("g").attr("id", "world-countries");
  worldLayer.selectAll("path")
    .data(worldWithoutIndia)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("data-country", (d) => d.properties.name)
    .attr("fill", (d) => {
      const rec = getRecordByCountry(d.properties.name);
      return `var(--${statusToClass(rec.status)})`;
    })
    .attr("d", path)
    .on("mouseenter", function (evt, d) {
      if (!lockedCountry) {
        d3.selectAll(`.country[data-country="${d.properties.name.replace(/"/g, '\\"')}"]`).classed("hovered", true);
      }
      showTooltip(evt, d.properties.name);
    })
    .on("mousemove", function (evt, d) {
      showTooltip(evt, d.properties.name);
    })
    .on("mouseleave", function () {
      if (!lockedCountry) {
        d3.select(this).classed("hovered", false);
      }
      if (!lockedCountry) hideTooltip();
    })
    .on("click", function (evt, d) {
      evt.stopPropagation();
      lockedCountry = d.properties.name;
      clearHoverStates();
      showTooltip(evt, d.properties.name);
      setSelectedCountry(d.properties.name);
    });

  const indiaLayer = svg.append("g").attr("id", "india-official");
  indiaLayer.selectAll("path")
    .data(indiaGeo.features)
    .enter()
    .append("path")
    .attr("class", "country india-part")
    .attr("data-country", "India")
    .attr("fill", () => {
      const rec = getRecordByCountry("India");
      return `var(--${statusToClass(rec.status)})`;
    })
    .attr("d", path)
    .on("mouseenter", function (evt) {
      if (!lockedCountry) {
        d3.selectAll('.country[data-country="India"]').classed("hovered", true);
      }
      showTooltip(evt, "India");
    })
    .on("mousemove", function (evt) {
      showTooltip(evt, "India");
    })
    .on("mouseleave", function () {
      if (!lockedCountry) {
        d3.selectAll('.country[data-country="India"]').classed("hovered", false);
      }
      if (!lockedCountry) hideTooltip();
    })
    .on("click", function (evt) {
      evt.stopPropagation();
      lockedCountry = "India";
      clearHoverStates();
      showTooltip(evt, "India");
      setSelectedCountry("India");
    });

  svg.on("click", () => {
    lockedCountry = null;
    clearHoverStates();
    hideTooltip();
  });
}

async function init() {
  const [worldTopo, indiaGeo, rawData] = await Promise.all([
    d3.json(CONFIG.worldTopoUrl),
    d3.json(CONFIG.indiaGeoJsonUrl),
    d3.json(CONFIG.countryDataUrl)
  ]);

  countryData = rawData;
  buildDataIndexes(rawData);
  initFormHandlers();
  renderMap(worldTopo, indiaGeo);

  setSelectedCountry("India");
}

init().catch((err) => {
  console.error(err);
  const localFileHint = window.location.protocol === "file:"
    ? " Open this project via a local server or deploy to GitHub Pages (not file://)."
    : "";
  statusMsg.textContent = `Failed to load map data: ${err.message}.${localFileHint}`;
});
