# Estimation

OfficeOps estimates the active work of one competent person, including setup and cleanup but excluding delivery waits. A task starts with a keyword heuristic: mount/install 45 minutes, assembly 60, networking/cabling 60, configuration 30, cleaning/restocking 20, buying/moving 15, event support 120, and 30 when nothing matches.

Quantities use 80% efficiency for every item after the first. “Quick,” “just,” and “small” multiply by 0.6; “all,” “entire,” and “whole office” multiply by 2. Results are rounded to five minutes and constrained to 5–480 minutes. Heuristic confidence is 0.35.

When enabled, the Anthropic estimator receives only task text, category, location, and anonymized similar completed examples. It must return JSON with minutes, confidence, category, and rationale. Invalid output retries once then uses the heuristic.

After five tracked completions in a category, the calibrated estimate applies the median `actualMinutes / estimatedMinutes` multiplier, limited to 0.5–2.0. The newest 50 tracked completions form each category’s sample.
