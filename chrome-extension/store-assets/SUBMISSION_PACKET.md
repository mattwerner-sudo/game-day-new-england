# Chrome Web Store submission packet — Game Day New England

Everything below is ready to copy-paste into the Chrome Web Store Developer Dashboard
(https://chrome.google.com/webstore/devconsole). Steps that need *you* specifically are marked.

## 0. Prerequisites (yours to do)

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want to publish under
3. Pay the one-time $5 developer registration fee (first time only)
4. Click "New Item" and upload `gdne-extension-v1.1.0.zip` (in this same folder)

## 1. Store listing

**Name**
Game Day New England

**Summary** (short description, shown in search results — ≤132 characters)
This weekend's New England college sports schedule — right in your browser.

**Detailed description**
See what New England college sports games are happening today, this weekend, or in the next 7
days — without leaving your current tab.

Game Day New England tracks the full varsity schedule for 100+ New England colleges and
universities, every sport, updated daily. This extension gives you a quick look at what's on,
filterable by school, right from your browser toolbar.

• Today / This Weekend / Next 7 Days at a glance
• Filter to your school — your pick is remembered next time you open it
• Click any game for full details, tickets, and streaming links on the free full site
• Lands on a supported school's own athletics website? The toolbar badge lights up if there are
  upcoming ticketed games, with direct "Buy Tickets" links right in the popup

No account required. No ads. No tracking beyond what's needed to show you the schedule and
surface ticket links on supported school sites.

Free, from gamedaynewengland.com — built for New England college sports fans.

**Category**
Sports (pick the closest match in the dashboard's dropdown if "Sports" isn't offered exactly)

**Language**
English (United States)

## 2. Images

- `icons/icon128.png` — extension icon (already in the package, auto-used)
- `store-assets/screenshot_1280x800.png` — main store screenshot (real popup, real live data)
- `store-assets/promo_tile_440x280.png` — small promotional tile (optional but recommended)

## 3. Privacy practices tab

**Single purpose description**
Displays the New England college sports schedule from gamedaynewengland.com in a popup, with an
optional school filter, and surfaces ticket links when the user visits a supported school's own
athletics website.

**Permission justifications**

| Permission | Justification |
|---|---|
| `storage` | Used solely to remember the user's selected school filter locally on their device between popup opens. No data is transmitted anywhere except a school ID sent as a query parameter to gamedaynewengland.com's own public API, purely to filter which games are displayed. |
| `tabs` | Used to check the current tab's URL against a local list of ~100 known New England college athletics website addresses, entirely on-device, so the extension can show a badge and surface ticket links when the user is on a supported school's own site. The URLs visited are never transmitted anywhere. Only on a match does the extension request that one school's own public upcoming-games data from gamedaynewengland.com's API - the same data already shown on the site. |
| `host_permissions` (game-day-new-england.vercel.app) | Needed to fetch the public schedule/ticket API and to open a game's detail page when the user clicks a listed game or a ticket link. |

**Data usage disclosure** (the CWS form will ask you to check boxes — answers below)
- Does not collect personally identifiable information
- Does not collect health information
- Does not collect financial/payment information
- Does not collect authentication information
- Does not collect personal communications
- Does not collect location
- **Does collect web browsing history** - specifically, the URLs of visited tabs are checked
  on-device against a local list of ~100 known school athletics domains, to power the
  ticket-surfacing feature. No URL is ever transmitted off the device; only a school id is sent
  to our own API, and only after a real match.
- Does not collect user activity
- Does not sell or transfer data to third parties
- Does not use data for purposes unrelated to the extension's single purpose

**Privacy policy URL**
https://game-day-new-england.vercel.app/privacy
(already updated with a "Chrome extension" section describing exactly what the extension does)

## 4. After submitting

Review typically takes a few hours to a few days for a first submission. You'll get an email
when it's approved (or if something needs fixing). Nothing else on this end is time-sensitive —
this packet and the ZIP will still be valid whenever you get to it.
