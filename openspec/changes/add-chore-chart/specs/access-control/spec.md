## Purpose

Keeps the admin page to the two parents while letting an e-ink device that cannot log in fetch the display page. Two different mechanisms, because the two pages have two different kinds of client.

## ADDED Requirements

### Requirement: The admin area requires a shared password

The system SHALL protect every admin route with a single shared password known to both parents. There SHALL be no per-user accounts, registration, or password reset flow. An unauthenticated request to an admin route SHALL NOT reveal any chart data.

#### Scenario: Unauthenticated request to admin

- **WHEN** a request is made to an admin route with no valid session
- **THEN** the response is a password prompt and contains no day marks or task text

#### Scenario: Correct password grants access

- **WHEN** the shared password is submitted correctly
- **THEN** a session is established and admin routes become accessible

#### Scenario: Incorrect password is rejected

- **WHEN** an incorrect password is submitted
- **THEN** no session is established and the response does not indicate whether any part of the input was correct

### Requirement: The admin session persists across visits

Once authenticated, the system SHALL keep the parent signed in across browser restarts for an extended period, so that the password is not re-entered during routine daily use. The session SHALL be carried by a cookie that is not readable by client-side script and is only sent over a secure connection.

#### Scenario: Returning the next day

- **WHEN** a parent who authenticated yesterday opens the admin page
- **THEN** they are still signed in and are not prompted for the password

#### Scenario: Session cookie is protected

- **WHEN** the session cookie is issued
- **THEN** it is marked so that client-side script cannot read it and it is only transmitted over a secure connection

### Requirement: The session cannot be forged

The session credential SHALL be tamper-evident, such that a value not issued by the application is rejected. Guessing or editing a session value SHALL NOT grant access.

#### Scenario: Tampered session value

- **WHEN** a request presents a session cookie whose value was modified
- **THEN** the request is treated as unauthenticated

### Requirement: The display route is gated by a secret header

The system SHALL require a secret header on requests to the display route and SHALL reject requests that do not present the expected value. This allows the e-ink device, which cannot authenticate interactively, to fetch the page while keeping it off the open web.

#### Scenario: Device request with the header

- **WHEN** a request to the display route presents the correct secret header value
- **THEN** the display page is returned

#### Scenario: Request without the header

- **WHEN** a request to the display route presents no secret header and carries no valid admin session
- **THEN** the request is rejected and no chart data is returned

### Requirement: An admin session also opens the display route

The system SHALL serve the display route to a request carrying a valid admin session, with or without the secret header, so that a parent can preview the wall chart from a phone rather than walking to the panel.

This grants no additional access: the display route is a read-only rendering of data the session already permits reading and editing in full.

The converse SHALL NOT hold — see below.

#### Scenario: A parent previews the display from a phone

- **WHEN** an authenticated parent requests the display route without the secret header
- **THEN** the display page is returned

#### Scenario: The preview is still not cached

- **WHEN** the display route is served to an admin session rather than to the device
- **THEN** the response is still marked not to be cached

### Requirement: The display secret grants no write access

The display header SHALL NOT grant access to any admin route or mutation, regardless of what else the request carries.

The display secret is configured into a third-party screenshot service and transmitted on every poll, making it the most widely exposed credential in the system. It SHALL therefore confer nothing beyond permission to read the chart.

#### Scenario: The display header does not open the admin page

- **WHEN** a request to an admin route presents the correct display header but no valid session
- **THEN** the request is treated as unauthenticated

#### Scenario: The display header does not authenticate a sign-in

- **WHEN** a sign-in is attempted with an incorrect password and a correct display header
- **THEN** no session is established

### Requirement: Secrets are supplied by configuration

The shared password and the display header value SHALL be supplied as deployment configuration and SHALL NOT be committed to the repository or embedded in any client-delivered asset. The application SHALL fail clearly at startup or on first request if either secret is missing, rather than defaulting to an insecure value.

#### Scenario: Missing secret

- **WHEN** the application is deployed without one of the required secrets configured
- **THEN** the affected routes fail closed with a clear error rather than granting access

#### Scenario: Secrets are not exposed to the browser

- **WHEN** any page is rendered
- **THEN** neither secret appears in the returned HTML or in any bundled client asset

### Requirement: Credential comparison resists timing analysis

Comparison of a submitted password or header value against the configured secret SHALL be performed in a way that does not leak the correct value through response timing.

#### Scenario: Comparing a near-correct value

- **WHEN** a submitted secret matches the configured value in its leading characters but not overall
- **THEN** the rejection is not measurably faster or slower than for a value that differs from the first character
