# Current checks

Cleanup verification on 2026-10-14: all four current studies passed the shared behavioral suite across both judgment orders and both spatial layouts (16 combinations). The suite covers warmup validation and child auto-advance, the unchanged Yes/No gate and main confirmation, mouse/touch/pen pointer-event fixtures, cookie returns, case summaries, adult numeric feedback, child-only media-clock demonstrations, and buffering/error handling. Narration tracing passed all eight child order/side conditions.

All 16 editable decks, 150 slide images per audience, and 116 unique AAC mono 48 kHz recordings at 223 destinations were checked. PowerPoints retain the fixed 1120×96 caption frame and Arial Bold 30 pt. Every retained media file and shared runtime/library was compared with its pre-cleanup SHA-256; no bytes changed. No unreferenced media remain in the active studies.

Both Lookit builders compile without historical exports or old Git commits; final audio is complete and review controls are absent. Collaborator packaging produces four browser-openable pages with panels expanded, child narration on, and the current PowerPoints. Full reports are generated locally under ignored code/tools/generated/. Historical audits remain in the external archive.

Browser smoke checks cover all four relocated previews, panel jumps, outcome images and mouse dragging. Child previews were opened with real audio enabled; introductory demos stayed idle and adult numeric/child number-free feedback remained intact.

These local checks do not certify live Lookit recording/storage, real enrollment, or physical touchscreen input. Nothing was pushed or deployed.

Participant child entries: both `children/index.html` files open the normal Welcome immediately, with review/mute off and no researcher or launch screen. Browser tests verified real narration and automatic progression into cookie practice. Eight startup fixtures cover both experiments with autoplay allowed/blocked and storage available/unavailable. Blocked audio waits without a timeout or skipped clip and resumes the same recording after Enable sound. All existing adult/child order/side and synchronization checks still pass. Direct `file://` browser testing was unavailable because the browser tool permits only HTTP/HTTPS; native local script/media paths and storage-unavailable behavior were checked separately.
