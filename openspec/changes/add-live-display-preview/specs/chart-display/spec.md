## MODIFIED Requirements

### Requirement: The display page is read-only and self-contained

The display page SHALL present information only. It SHALL contain no interactive controls, no links intended to be followed, and no client-side behaviour required to produce its final appearance. The page SHALL be fully rendered by the server so that a screenshot taken immediately after the response is complete captures the finished chart.

The display page SHALL ship no client-side runtime at all. It is not enough that its appearance does not depend on one: the route SHALL NOT hydrate, SHALL NOT hold an open connection, and SHALL NOT schedule work of any kind after the response completes.

This is stronger than it needs to be for correctness of the rendering, and deliberately so. The panel is screenshotted by a headless browser whose capture is commonly timed against the network falling idle, which a page holding a connection never does. The failure that would cause is the worst one available here: the panel keeps its last good image with no power, so a capture that never fires is indistinguishable from a working chart until somebody reads the render stamp. Any feature wanting live behaviour over this data SHALL therefore be built on a separate route rather than added to this one.

#### Scenario: Screenshot captures a complete page

- **WHEN** the display page is requested and screenshotted as soon as the HTML response finishes loading
- **THEN** the captured image shows the complete chart with all task text, stickers and headings present

#### Scenario: No interactive controls are rendered

- **WHEN** the display page is rendered
- **THEN** it contains no buttons, form fields, or toggles

#### Scenario: No script is delivered

- **WHEN** the display page is served
- **THEN** the response references no client-side application code, so nothing runs in the page after it has loaded

#### Scenario: The page goes idle

- **WHEN** the display page has finished loading
- **THEN** it holds no open connection and issues no further requests, so a capture waiting for network idle is not delayed

#### Scenario: Live behaviour lives elsewhere

- **WHEN** a live-updating view of the same chart is provided
- **THEN** it is served from a different route, and the display route is unchanged by its existence
