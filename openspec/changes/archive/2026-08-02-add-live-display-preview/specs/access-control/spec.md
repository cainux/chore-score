## ADDED Requirements

### Requirement: The live preview is reachable only with an admin session

The live preview SHALL be served only to a request carrying a valid admin session. The display secret SHALL NOT open it, with or without the header being otherwise correct.

The live preview SHALL be part of the admin route family rather than the display one, so that this holds structurally and not by a rule written specifically for it. A route the display secret can reach is a route a misconfigured screenshot service can be pointed at, and the live preview is the one page in this system that must never be screenshotted onto the panel.

Serving the live preview to an admin session grants nothing new: it renders data the session already permits reading and editing in full.

#### Scenario: The display header does not open the live preview

- **WHEN** a request to the live preview presents the correct display header but no valid session
- **THEN** the request is treated as unauthenticated and no chart data is returned

#### Scenario: A signed-in parent opens the live preview

- **WHEN** an authenticated parent requests the live preview
- **THEN** the page is returned

#### Scenario: The preview is not confused with the display route

- **WHEN** the display secret is used to fetch the wall chart
- **THEN** the page served is the static display route, and no route reachable with that credential delivers a live-updating variant
