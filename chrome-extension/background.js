const API_BASE = "https://game-day-new-england.vercel.app";

/**
 * Section 67: surface ticket links when the user lands on a supported school's own athletics
 * site. This service worker's only job is the badge (a lightweight, always-current visual
 * signal) - the popup does its own fresh detection when opened (see popup.js) rather than
 * reading anything this file writes, so there's no storage/message-passing to keep in sync
 * between the two. Everything here runs from a single "tabs" permission (no per-school
 * host_permissions needed) - reading a tab's url doesn't require host access to that site, only
 * "tabs" (confirmed against Chrome's own extension docs before building this).
 *
 * Privacy note, mirrored in /privacy's Chrome extension section: the hostname check happens
 * entirely on-device against a list of known school domains. A visited URL is never sent
 * anywhere. Only on a real match does this fetch that one school's own public event data -
 * the same data already public on the site - never anything else about the tab or the user's
 * browsing.
 */

let schoolsByHostname = null; // Map<hostname, {id, name}> | null until first load
let schoolsLoadedAt = 0;
const SCHOOLS_TTL_MS = 5 * 60 * 1000; // matches getPublicSchools()'s own 5-minute revalidate

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function loadSchoolsByHostname() {
  if (schoolsByHostname && Date.now() - schoolsLoadedAt < SCHOOLS_TTL_MS) return schoolsByHostname;

  const res = await fetch(`${API_BASE}/api/v1/schools`);
  if (!res.ok) throw new Error(`schools API returned ${res.status}`);
  const schools = await res.json();

  const map = new Map();
  for (const school of schools) {
    const hostname = hostnameOf(school.websiteUrl);
    if (hostname) map.set(hostname, { id: school.id, name: school.name });
  }
  schoolsByHostname = map;
  schoolsLoadedAt = Date.now();
  return map;
}

async function countUpcomingTickets(schoolId) {
  const res = await fetch(`${API_BASE}/api/v1/events?school=${schoolId}&range=season`);
  if (!res.ok) return 0;
  const events = await res.json();
  return events.filter((e) => e.ticketUrl).length;
}

async function evaluateTab(tabId, url) {
  if (!url || !url.startsWith("http")) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  try {
    const map = await loadSchoolsByHostname();
    const school = map.get(hostnameOf(url));
    if (!school) {
      chrome.action.setBadgeText({ tabId, text: "" });
      return;
    }

    const count = await countUpcomingTickets(school.id);
    if (count > 0) {
      chrome.action.setBadgeText({ tabId, text: String(count) });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#EA580C" }); // matches the site's orange-600
    } else {
      chrome.action.setBadgeText({ tabId, text: "" });
    }
  } catch (err) {
    // A failed detection should never surface as an error to the user - just no badge.
    chrome.action.setBadgeText({ tabId, text: "" });
    console.error("Game Day New England background:", err);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") evaluateTab(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url) evaluateTab(tabId, tab.url);
  });
});
