# Connect YouTube feed repair — October 23, 2026

The production function returned an empty list because YouTube returned 404 for the channel RSS endpoint. The channel ID was verified against the public @FitnessWorldPro page and is correct.

## Changes
- Keep RSS as the primary source. If it fails or is empty, read the public channel Shorts tab in its default newest-first order.
- Parse only the selected channel tab, validate video IDs, deduplicate, and use plain text titles. Do not invent publication dates for Shorts.
- Render the pinned eight-minute guide and two verified recent Shorts in HTML. Replace only the two recent cards after a complete valid refresh; retain them on errors, partial results, or disabled JavaScript.
- Identify the checked snapshot when the live feed fails. Update Connect's YouTube links to the verified @FitnessWorldPro channel.
- Keep the original pinned guide first and prevent duplicate cards.

## Verification
- Real channel Shorts HTML fetched successfully via the channel ID URL; parsed breakfast, walking versus lifting, and fiber videos in channel order.
- Function checks passed for RSS decoding, failed RSS with successful Shorts fallback, both sources failing, and unsupported HTTP methods.
- Chromium at 390 and 1280 pixels: exactly three unique cards with the pinned guide first for live, failed, duplicate, and JavaScript-disabled cases; no horizontal overflow; no false 1970 publication dates.
- JavaScript syntax checks, git diff whitespace check, and repository function audit passed. The function audit retains existing manual-review notices for unrelated paypal-config and track-event functions.

The snapshot is a checked fallback, not a guarantee that the public feed is reachable. Future uploads refresh through the function; if YouTube changes its page schema or both sources fail, the verified cards remain visible.
