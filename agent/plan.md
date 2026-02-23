# Plan

## Scope (current requests)
- Show an Israel-focused map view with blue surroundings, without zoom lock.
- Make button and layout styling more consistent/predictable.
- On wrong answer, auto-fit map so both selected city and correct city are visible.
- Add click animations to city polygons for clearer game feedback.
- Restyle Leaflet zoom controls (`+` / `-`) to match app roundness/theme.

## Implementation Plan
1. Israel-only visual framing (no zoom lock)
- Keep pan/zoom free.
- Set initial view and soft bounds around Israel.
- Add a blue background layer and optional subtle mask outside Israel extent.
- Keep existing city polygons and interactions unchanged.

2. Design consistency refactor
- Introduce shared UI tokens in one place (radius, spacing, button heights, shadows, transitions).
- Standardize button variants/sizes (primary, secondary, destructive).
- Replace one-off class strings in panel controls with shared classes/components.

3. Wrong-answer camera behavior
- When answer is wrong, compute bounds from both polygon layers.
- Animate `fitBounds` with padding so both are clearly visible.
- Do not trigger on correct answers.

4. City click animations
- Option A (recommended): pulse + scale illusion via stroke weight/fill opacity animation on selected polygon.
- Option B: short glow ring effect around clicked polygon.
- Option C: brief bounce color transition for correct/incorrect states.
- Implement A first (lightweight, reliable in Leaflet).

5. Zoom control redesign
- Override Leaflet control CSS for rounded corners, spacing, hover states, shadows.
- Match light/dark themes and existing button language.
- Keep behavior/accessibility unchanged.

## Suggested Execution Order
1. Map framing + blue surroundings.
2. Wrong-answer auto-fit behavior.
3. City click animation.
4. Zoom control redesign.
5. UI consistency pass (tokens + button cleanup).

## Done Criteria
- Map feels Israel-focused with blue surroundings and still freely zoomable.
- Wrong answer always shows both right/wrong cities on screen.
- Click feedback is visibly animated.
- `+` / `-` controls match the app style.
- Buttons/layout look consistent across panels.

## Status
- Done: Israel-focused tile bounds + blue surroundings without zoom lock.
- Done: Wrong-answer auto-fit now brings both selected and correct cities into view.
- Done: Polygon click feedback animations for correct/wrong/target states.
- Done: Leaflet zoom controls restyled to rounded app-consistent design.
- Done: Button/layout consistency pass across setup and sidebar actions.
