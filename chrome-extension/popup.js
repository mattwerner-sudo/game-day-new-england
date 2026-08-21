const API_BASE = "https://game-day-new-england.vercel.app";
const SITE_BASE = "https://game-day-new-england.vercel.app";

const contentEl = document.getElementById("content");
const schoolSelect = document.getElementById("school-select");
const rangeTabs = document.getElementById("range-tabs");
const ticketsAlertEl = document.getElementById("tickets-alert");

let state = { range: "weekend", school: "" };
let allSchools = []; // populated by loadSchools(), reused by detectCurrentTabTickets()

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function formatDay(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatSport(sport) {
  return sport.replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventTitle(event) {
  if (event.type === "special_event") return event.eventName ?? "Meet";
  return `${event.awaySchoolName ?? "TBD"} at ${event.homeSchoolName ?? "TBD"}`;
}

function renderEvents(events) {
  if (events.length === 0) {
    contentEl.innerHTML = `<p class="status">No games match. Try a wider range or the full site.</p>`;
    return;
  }

  const groups = new Map();
  for (const event of events) {
    const key = formatDay(event.startDatetime);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  const html = [...groups.entries()]
    .map(
      ([day, dayEvents]) => `
        <div class="day-heading">${day}</div>
        ${dayEvents
          .map(
            (event) => `
              <a class="event-card" data-event-id="${event.id}" href="#">
                <span class="event-time">${formatTime(event.startDatetime)}</span>
                <div class="event-sport">${event.gender === "womens" ? "Women's" : event.gender === "mens" ? "Men's" : ""} ${formatSport(event.sport)}</div>
                <div class="event-matchup">${eventTitle(event)}</div>
                <div class="event-location">${event.venueName ?? ""}${event.venueState ? `, ${event.venueState}` : ""}</div>
              </a>
            `
          )
          .join("")}
      `
    )
    .join("");

  contentEl.innerHTML = html;

  contentEl.querySelectorAll(".event-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `${SITE_BASE}/events/${card.dataset.eventId}` });
    });
  });
}

async function loadEvents() {
  contentEl.innerHTML = `<p class="status">Loading…</p>`;
  const params = new URLSearchParams({ range: state.range });
  if (state.school) params.set("school", state.school);

  try {
    const res = await fetch(`${API_BASE}/api/v1/events?${params}`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    renderEvents(await res.json());
  } catch (err) {
    contentEl.innerHTML = `<p class="status">Couldn't load games. Try the full site instead.</p>`;
    console.error("Game Day New England popup:", err);
  }
}

async function loadSchools() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/schools`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const schools = await res.json();
    allSchools = schools;
    for (const school of schools) {
      const option = document.createElement("option");
      option.value = school.id;
      option.textContent = school.name;
      schoolSelect.appendChild(option);
    }

    const saved = await chrome.storage.local.get("schoolId");
    if (saved.schoolId && schools.some((s) => s.id === saved.schoolId)) {
      schoolSelect.value = saved.schoolId;
      state.school = saved.schoolId;
    }
  } catch (err) {
    console.error("Game Day New England popup: couldn't load schools", err);
  }
}

/**
 * Section 67: if the tab this popup was opened from is a supported school's own athletics
 * site, show that school's real upcoming ticketed games at the top, above the normal
 * weekend-schedule browsing UI below. Runs after allSchools is populated (loadSchools) so the
 * hostname match has something to check against. A miss (no match, or not a school site) just
 * leaves the section empty - the rest of the popup works exactly as before.
 */
async function detectCurrentTabTickets() {
  if (!ticketsAlertEl || allSchools.length === 0) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = tab && hostnameOf(tab.url);
  if (!hostname) return;

  const school = allSchools.find((s) => s.websiteUrl && hostnameOf(s.websiteUrl) === hostname);
  if (!school) return;

  try {
    const res = await fetch(`${API_BASE}/api/v1/events?school=${school.id}&range=season`);
    if (!res.ok) return;
    const events = (await res.json()).filter((e) => e.ticketUrl);
    if (events.length === 0) return;

    const listHtml = events
      .slice(0, 3)
      .map(
        (event) => `
          <a class="ticket-alert-link" data-event-id="${event.id}" href="#">
            <span>${formatDay(event.startDatetime)} — ${eventTitle(event)}</span>
            <span class="ticket-alert-buy">Buy Tickets →</span>
          </a>
        `
      )
      .join("");

    ticketsAlertEl.innerHTML = `
      <div class="ticket-alert-heading">🎟️ Tickets available for ${school.name}</div>
      ${listHtml}
    `;
    ticketsAlertEl.hidden = false;

    ticketsAlertEl.querySelectorAll(".ticket-alert-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: `${API_BASE}/api/events/${link.dataset.eventId}/ticket-click` });
      });
    });
  } catch (err) {
    console.error("Game Day New England popup: ticket detection failed", err);
  }
}

rangeTabs.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-range]");
  if (!button) return;
  rangeTabs.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");
  state.range = button.dataset.range;
  loadEvents();
});

schoolSelect.addEventListener("change", () => {
  state.school = schoolSelect.value;
  chrome.storage.local.set({ schoolId: state.school });
  loadEvents();
});

loadSchools().then(() => {
  loadEvents();
  detectCurrentTabTickets();
});
