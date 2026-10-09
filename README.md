# Speed Anything

A Chrome extension that changes the playback speed of any video or audio player on any website. Use the **+** and **−** keys on the page or the toolbar popup to go anywhere from 0.1× up to the maximum speed your browser allows.

Many sites have no speed control at all, or one that stops at 2×. Speed Anything works directly on the page's media elements, so it doesn't depend on the site's own player.

## Features

- **Works on any site.** It finds every `<video>` and `<audio>` element on the page, including ones inside embedded frames and open shadow DOM. Also works on YouTube, bypassing the YouTube Premium limitation.
- **Keyboard control.** Press **+** or **−** (the main keys or the numpad) to step the speed up or down.
- **Toolbar popup** with a large speed readout you can type into, − and + buttons, a slider, and one-click presets.
- **Wide range.** The controls accept 0.1× to 100× (see [Good to know](#good-to-know) for the browser's own limit).
- **Speed sticks.** Many sites reset the speed when a new video loads or when you use their controls. Once you've set a speed, the extension puts it back.
- **Pitch stays natural.** Audio pitch is preserved, so fast speech doesn't turn into chipmunk squeaks.
- **On-video speed badge** in the top-left corner of each video, so you can always see what speed you're on.
- **Light and dark popup** that follows your system theme.

## Requirements

Google Chrome 123 or newer. The popup's stylesheet uses the CSS `light-dark()` function, which Chrome supports from version 123. Other Chromium-based browsers with Manifest V3 support may work, but this project isn't tested on them.

## Installation

The extension isn't distributed through the Chrome Web Store, so you load it as an unpacked extension.

1. Unzip the project to a folder you'll keep. Chrome reads the extension from that folder, so don't delete or move it afterwards.
2. Open `chrome://extensions` and switch on **Developer mode** (top right).
3. Click **Load unpacked** and select the `speed-anything` folder, the one that contains `manifest.json`.
4. Click the puzzle-piece icon in the toolbar and pin **Speed Anything**.
5. Optional: to use it in Incognito windows, open the extension's **Details** page on `chrome://extensions` and turn on **Allow in Incognito**.

Pages that were already open when you installed the extension need a reload before it can control them.

## Using it

### Keyboard

On a page with a video or audio player:

| Key | Action |
|---|---|
| **+** or **=** (or numpad **+**) | Next speed up |
| **−** or **_** (or numpad **−**) | Next speed down |

Each press moves to the next value on this ladder:

`0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100`

The shortcut is ignored while you're typing in a text field and when Ctrl, Alt or Cmd is held, so it doesn't get in the way of normal typing or browser shortcuts. It only acts on pages that contain a video or audio element. On those pages the key press is consumed by the extension, so the site's own handler for **+** and **−** won't also fire. If that clashes with a site's shortcuts, untick **Use + and − keys on the page** in the popup.

### The popup

Click the toolbar icon to open it.

- **− and +** step through the same ladder as the keyboard.
- **The number** is editable. Type any value from 0.1 to 100 and press Enter (values are rounded to two decimals).
- **The slider** covers the whole range on a logarithmic scale, so the everyday speeds between 1× and 16× aren't squashed into a sliver.
- **Presets:** 0.5×, 1×, 1.5×, 2×, 3×, 4×, 8×, 16×, 50× and 100×. The active one is highlighted.
- **Use + and − keys on the page** turns the keyboard shortcut on or off.
- **Show speed on the video** turns the on-video badge on or off.

Both checkboxes are remembered between sessions.

### The on-video badge

Each video gets a small badge in its top-left corner showing the current speed, for example `1.5×`. It stays subtle while the speed is anything other than 1×, lights up for a moment whenever you change the speed, and is hidden at 1× (apart from that brief flash after a change). It follows the video into full screen, and it's skipped for tiny or off-screen videos and for audio-only players. If the browser refuses the speed you asked for, the badge adds `(max)`.

## Good to know

- **Chrome's speed limit.** The controls go up to 100×, but Chrome only plays media at up to 16×. If you ask for more, the extension plays at 16×, shows `(max)` on the badge, and the popup tells you the browser is limiting the speed on that video.
- **Speed isn't remembered.** The speed applies to the page you set it on and starts again at normal speed after a reload or on a new page. Only the two popup checkboxes are saved.
- **Nothing happens until you change the speed.** The extension doesn't change a page's media until you set a speed.
- **Everything on the page changes together.** The speed applies to every video and audio element on the page.
- **Some pages can't be reached.** Chrome doesn't allow extensions on pages such as `chrome://` pages and the Chrome Web Store. The popup says so if it can't connect.
- **Not every player is a media element.** Players that draw to a canvas or generate audio themselves (for example with the Web Audio API), and media inside closed shadow DOM, can't be controlled.
- **Players in embedded frames:** if a video is inside an embedded player, click the player once so keyboard focus is inside it, or use the popup, which works either way.
- **Very high speeds depend on your connection and device.** Streams can stall while they buffer.

## How it works

A content script runs on every page and in every frame, and it handles everything that happens on the page:

1. It finds media elements, including those in open shadow roots, and sets their `playbackRate`.
2. It listens for rate changes and for media loading or playing, and re-applies your speed when a site resets it. A mutation observer picks up players added to the page later.
3. If the browser rejects a rate, it falls back to 16× and records that the speed was capped.
4. It draws the speed badges, and handles the keyboard shortcut.

The popup talks to the content script of the active tab to read and change the speed, and only the frame that actually contains media replies.

## Permissions and privacy

| Permission | Why it's needed |
|---|---|
| Content script on all sites | To find and control audio and video wherever you play it |
| `storage` | To remember the two popup checkboxes |
| `activeTab` | Access to the tab you're using when you open the popup |

The extension makes no network requests, collects no data and has no analytics. It only looks for audio and video elements on the page and changes their playback speed.

## Project layout

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3) |
| `content.js` | Content script: finds media, applies speed, keyboard shortcut and on-video badge |
| `popup.html`, `popup.js` | Toolbar popup |
| `style.css` | Styles for the popup |
| `popup.css` | Not used. `popup.html` loads `style.css` instead, so this file can be deleted. |
| `icons/` | Extension icons in 16, 48 and 128 px |