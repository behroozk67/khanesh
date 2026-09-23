# Quickstart: validating Stage B

Run everything from `khanesh-server/`.

1. **Baseline**: before any edit, run `npm test` and record the result in `baseline.md`. Save the rule ids to
   `ids-before.txt` using the N16 one-liner.
2. **Red first**: add the guards, then run `node --test rules/engine.test.js`. Every behavioural guard must be red and
   every freeze green. Record the names.
3. **Implement**, then run `npm test` again. The expected result is 0 fail, with the total at baseline + the new guards.
4. **Probes**: run the research probes (`probeB.mjs`, `probeB2.mjs`) again. Every row in research R1 must now
   either fire its finding or sit in `unmapped`. None may remain in `qual` with no reader.
5. **Id diff**: `ids-after.txt` must equal `ids-before.txt` plus the 5 new ids, with nothing removed.
6. **Isolated proof**: extract `b9068df` with `git archive`, add a `node_modules` junction, drop in the new
   `engine.test.js`, and run it. Only the behavioural guards may be red.
7. **Texts**: print every new or changed Persian string verbatim for review.
