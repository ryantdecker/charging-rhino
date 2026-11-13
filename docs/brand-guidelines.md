# Charging Rhino — Brand guidelines

Draft. These values override the exploratory palette in the current app.

**Brand line:** Make progress. Build momentum.

Charging Rhino is a personal way to track goals and the tasks that move them. The brand should feel like forward motion with a clear target: determined, geometric, and easy to live with every day. The rhino is the mascot for a climb, not a fight.

## Color

Use the named colors below. Do not invent nearby hex values.

| Name | Hex | Role |
| --- | --- | --- |
| Charcoal | `#23334D` | Text, dark navigation, icon strokes, hero backgrounds |
| Orange | `#FF8A00` | Primary actions, milestones, progress, the wordmark, motion lines |
| Blue | `#008CFF` | Navigation accent, links, selected states, charts |
| Sky | `#54C8FF` | Secondary charts, sky planes in illustration, soft highlights |
| Green | `#7CC142` | Completed work, positive progress, landscape midtones |
| Lime | `#C9EE45` | Highlights, map contours, small celebratory marks |
| Stone | `#EDE6DA` | Page background, quiet cards, warm neutrals |

### How to apply color

- Product screens are light. Stone or white is the surface. Charcoal is the text.
- Blue marks where you are: navigation, the active tab, links.
- Orange marks what to do: the primary button, a milestone, a progress fill, the one task in focus.
- Green means done or on track. Lime is a spark, not a second green for body text.
- Sky is for charts and illustration, not for buttons.
- Charcoal can fill a hero, a sidebar, or an app icon. On charcoal, type is white and the only accent is orange or sky.
- Body text stays charcoal. Do not set paragraphs in orange, blue, or green.

Suggested UI tokens:

```css
--rhino-charcoal: #23334D;
--rhino-orange: #FF8A00;
--rhino-blue: #008CFF;
--rhino-sky: #54C8FF;
--rhino-green: #7CC142;
--rhino-lime: #C9EE45;
--rhino-stone: #EDE6DA;
--rhino-surface: #ffffff;
--rhino-ink: var(--rhino-charcoal);
```

Orange on white and blue on white are the button pair. Charcoal on stone is the reading pair. Lime and sky need charcoal or white text behind them if they are ever used as a fill; they are not text colors.

## Typography

**Montserrat**, or another geometric sans with a similar skeleton (even strokes, open apertures, little contrast). One family does both jobs. Weight carries the difference.

| Use | Weight | Case |
| --- | --- | --- |
| Brand headlines, wordmark, hero lines | Bold (700) or ExtraBold (800) | Brand lockup is all caps. Headlines may be sentence case. |
| Section titles and key numbers | Semibold (600) | Sentence case |
| Body, lists, buttons, navigation | Regular (400) or Medium (500) | Sentence case |

- Headlines can be tight and large. Interface type stays calm: medium or regular, normal tracking, comfortable line height.
- Do not mix a serif, a script, or a condensed display face into the product.
- The wordmark is Montserrat ExtraBold, all caps, tracked slightly tight. "CHARGING" sits above "RHINO", both the same weight. Orange is the default wordmark color on light backgrounds; white on charcoal.

## Logo

Two levels. Do not redraw either as a new character.

### Primary lockup

The detailed low-poly rhino, charging to the right, with the wordmark beneath or beside it. Use this on the marketing header, the about surface, empty states that introduce the product, and any large brand placement.

The rhino is built from flat gray facets, a white horn, and a small dark eye. Orange speed lines sit behind the head. Dust and pebbles at the feet are part of the illustration, not part of the compact mark.

### Simplified marks

Use these when the primary lockup will not fit.

- Head in profile, with three orange motion strokes behind it.
- The same head inside an orange hexagon.
- The same head, knocked out of a charcoal rounded square, for app icons and avatars.

The hexagon and the rounded square are the only containers. Do not put the head in a circle, a shield, or a word balloon.

### Clear space and motion lines

Keep visible negative space between the head and the motion lines. The strokes read as speed because they do not touch the horn or the snout. If a layout forces them together, use the wordmark alone rather than collapsing the gap.

Give the lockup clear space equal to the height of the horn on every side. Do not rotate the rhino, recolor the facets with the rainbow palette, or set the wordmark in a different typeface.

## Illustration

Environments are low-poly and simple: faceted mountains, a few tree shapes, a path or a flag when the scene needs a goal. Color comes from the palette — sky and blue for distance, green and lime for ground, orange for the sun, a flag, or the motion.

The rhino is determined and approachable. It leans forward, but it is not snarling, armored, or mid-attack. Keep the eye small and the horn bright. Motion is dust, pebbles, and the orange strokes, not impact flashes or debris flying at the viewer.

Use a full scene on marketing, on the goal journey, and on celebratory moments. Inside everyday task lists, prefer the simplified mark or a short pattern, not a panorama.

## Pattern

Topo contour lines and low-poly mountain bands are the only textures. Draw them in blue, sky, green, or orange on stone or white.

Use a pattern as a thin band, a card edge, or a quiet background behind a hero. One pattern per view. Do not tile a loud pattern under forms, lists, or charts.

## Interface

The product is a light productivity tool that borrows the brand, not a poster of the brand.

- Surfaces are white and stone. Text is charcoal.
- Navigation uses blue for the active item. Inactive items are charcoal at reduced emphasis.
- The primary button is orange with white type. One primary button per view.
- Secondary actions are charcoal text or a quiet outline, not a second filled color.
- Progress, streaks, and milestones use orange. Completion and "on track" use green.
- Charts may use blue, sky, green, and orange. Do not introduce gray-blue or red.
- Landscape art can sit in a header, a weekly summary, or an empty state. It stays out of the task row.
- Icons are simple geometric line icons in charcoal, with blue or orange only for the active or complete state.

## Goal tracking

A goal is a summit. Tasks and milestones are the path. The experience line is: turn goals into a visual journey, make progress, hit milestones, and reach the summit.

### The journey

Every goal moves through four stages. The rhino illustration advances with them, from the trailhead to the flag.

| Stage | Picture | Meaning |
| --- | --- | --- |
| Start | Rhino at the trailhead | The goal exists. Little or no progress yet. |
| Build | Rhino partway up, a checkpoint behind | Habits and early milestones are in place. |
| Push | Rhino climbing, summit in view | The hard middle. Most of the work is still ahead, and the pace matters. |
| Achieve | Rhino at the flag | The goal is complete. |

Show the stage as a scene, not as a badge alone. Checkpoints on the path are completed milestones. The flag is the goal.

### Screens

**Goals.** A list of goal cards. Each card has an icon, a name, a short context line (a date, a target, or a timeframe), and one progress bar. Green fills the completed portion. Filter the list with All, Active, and Completed. The add action is `+ Add Goal`.

**Journey.** The detail hero. A low-poly mountain, a path, the rhino, and green checks for milestones already passed. Under the scene: a large percent complete, an orange progress bar, and where they are in the plan (for example, week 10 of 16). Three facts sit under that, each with an icon. Facts are counts the person can verify, not motivational copy.

**Progress.** A line chart of the goal over time, with the latest point called out in orange. Under the chart, a milestone checklist: done rows get a green check, the current row can be tinted green, and upcoming rows stay open. Show the count, such as 3 of 4 complete.

**Plan, tasks, and notes** are sibling tabs of Progress on the same goal. Tasks belong to a goal. They do not each get their own mountain.

The app bar is charcoal, with the simplified mark and white wordmark. Primary navigation is Home, Tasks, Goals, Calendar, and Progress. Goals is the home of this experience.

### What each part is for

- **Visual progress** shows the journey, so a percent is also a place on the mountain.
- **Milestones** break the goal into stages the person can finish.
- **Real results** are the numbers under the journey: runs, distance, weeks, books, whatever the goal actually measures.
- **Momentum** is the streak and the next open milestone, not a separate score.

## Voice

Short, active, and specific. Talk about the next thing, not about hustle.

Use "Make progress. Build momentum." as the brand line. In the product, prefer a concrete next step over a slogan. The rhino can be named. It does not threaten, roar, or trash the competition.

## Do not

- Do not treat orange as a background for long text.
- Do not crowd the motion lines into the head.
- Do not make the rhino aggressive.
- Do not add colors outside the seven named values for brand or UI.
- Do not cover task lists or charts with landscape pattern. The journey hero is the exception.
