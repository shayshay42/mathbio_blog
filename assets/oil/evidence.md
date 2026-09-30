# OIL and learned optimization: evidence behind the notebook

Prepared 2026-09-29 for `notes/oil-and-learned-optimization.html`.

This file records the scope of the blog's empirical claims. Source paths below
identify the research workspace used to write the post; they are not runtime
dependencies of the website. `provenance.json` records their SHA-256 identities.
`results.csv` contains the displayed table values, rounded to the precision of
the source summaries. The article and all its assets work independently of
those research checkouts.

## Terminology and corrected attribution

OIL is optimizer-in-the-loop training of an initializer. The current local
manuscript applies five differentiable safeguarded updates during training.
Its outer loss has initial parameter, refined parameter, and refined
trajectory terms, with equal outer weights on scaled losses. The parameter
terms use block-standardized coordinates; the trajectory term uses separately
scaled asinh-transformed states and a Huber penalty. Native bounded L-BFGS-B
at inference is a different procedure; the five training updates are absent.

Source: `PINO-gLV-NeurIPS-Revision/05-paper/ICLR-2027-OIL-current/iclr_2027.tex`,
section “A learned initialization for finite refinement” through “Inference is
a separate optimization procedure.” This is a local manuscript draft, not a
claim of publication or acceptance.

OIL-matching is the working name for a research line. Its methods include
accepted-gradient regression, straight endpoint flow matching, autonomous
bounded-action imitation, recurrent controllers, and learned-region proposals.
They should not be treated as one algorithm with one objective.

The later master synthesis supersedes the older GFM summary's broad external
OIL ranking. One older “OIL” result was identified as trajectory-fine-tuned
MPNN plus TM. This blog therefore does not reuse the old external OIL recovery
rows. Its current OIL comparison comes from the authenticated 100,000-system,
five-fold out-of-fold summary in `LEARNED_DYNAMICS_OPTIMIZATION_MASTER.md` §8.2:

| S6 raw initializer | Pooled native parameter RMSE | Simulation validity |
|---|---:|---:|
| MPNN | 0.060463 | 91.929% |
| Matched MPNN-FT | 0.061159 | 99.089% |
| True three-term MPNN-OIL | 0.065164 | 99.061% |

These are pooled parameter RMSEs, not means of per-system RMSE. That source's
trajectory summary is a mean of penalty-adjusted logarithmic losses, so it is
deliberately not substituted for an ordinary mean or median in this post.

## Autonomous-action table

Source: `oil-matching/docs/GFM_INVESTIGATION_SUMMARY.md` §4, corroborated by
`LEARNED_DYNAMICS_OPTIMIZATION_MASTER.md` §4.5.

- Clean synthetic six-species gLV, 42 parameters and 101 times.
- Selection IDs 25001–26000: 1,000 systems, one Section-3/start0 output each.
- Both learned models target the exact memoryless trust teacher's 20-step
  endpoint, not the generating truth and not a long L-BFGS-B endpoint.
- Teacher: unit-coordinate exact gradient, alpha 0.001, delta 0.035, outward
  boundary masking before the L2 cap, fraction-to-boundary and projection.
- Corpus: IDs 30001–35000, 5,000 paths and 100,000 valid transitions.
  4,500 systems train the model; 500 select rollout checkpoints.
- Each model has 1,882,154 parameters. Trust action stops at update 5800;
  direct endpoint trains to 10000; seed 42.
- Trust/direct first-state action diagnostics and final scoring use additional
  metric-only exact evaluations; these are excluded from inference calls.
- The mean and median in the CSV use only valid exact gLV replays. All systems
  remain in the validity denominator. Invalids are not assigned a synthetic
  loss in the blog's tables.
- The run historically failed its frozen penalty-based selection gate. The
  blog changes presentation, not the historical decision; no final test or
  model promotion is claimed.

Run: `/home/popsicle/gfm_autonomous_v4_safetyfix4`, jobs 19070564–19070574.
Source identity: `45ee5f48515aa71f3f8a1d5e1ba82cb9ac948e146445ce289759342e0faf358e`.
Corpus array identity: `5662192a5a1a9d3b9100cbf3536f18b2b1a74c118d86b52f95e7061930278979`.

## Region-continuation table

Source: `oil-matching/docs/GFM_REGION_CONTINUATION_BENCHMARK.md`, “Absolute
endpoint performance” and “Mechanism.” Authoritative Rorqual result SHA-256:
`0192c3b8cf1610f874f3b513d0e9eac576b633ae114b96a90a2e7e7dba25d845`.

- 48 exposed engineering systems from selection IDs 25001–26000; not a fresh
  confirmatory cohort and not the same estimand as the 1,000-system table.
- All four displayed rows have 48/48 valid selected replays, so valid-only and
  historical penalty-based summaries coincide for these rows.
- Every row has total exact allocation 32. Single-start rows use a B32 tail;
  the four-waypoint row uses B8 for each candidate and selects by observed loss.
- Flow proposal generation uses 20 neural calls once per system; direct uses
  one. These are additional to exact calls, not hardware-equivalent to them.
- Path4 and Chord4 tie on 42/48 systems. Their selected final-endpoint counts
  are 42/48 and 43/48. The portfolio gate failed.

The lesson is descriptive: these learned endpoints help local continuation,
but four points on one path are too correlated to justify four shortened
tails. This does not prove that diverse multistart search cannot work.

## Subsequent studies and status

- **Exact-guarded learned controller:** completed adaptive clean-S6 diagnostics.
  Its proposal cost two exact evaluations. A learned prefix plus 20-call tail
  did not beat the exact 22-call baseline. Source:
  `docs/LEARNED_OPTIMIZER_INVESTIGATION_SUMMARY.md`.
- **Lorenz restart policy:** completed 400-system two-fold contextual-value
  preflight, not DQN/sequential RL training. Cross-fitted Extra Trees chose
  IM+TM for all systems; 99.70% of positive oracle mean saving came from one
  system. Source: `docs/LORENZ63_RL_RESTART_PREFLIGHT_V1.md`.
- **Sparse/noisy gLV restart gate:** completed pilot found practically meaningful
  oracle headroom on 4.7% at B8 and 0% at B32 under TRF, with no validated
  observation-only ranking model. Source:
  `docs/GLV_SPARSE_NOISY_BENCHMARK_V2_RESULTS.md`, “Final restart-controller gate.”
- **Global-local posterior proposals:** completed validation-only comparison on
  128 full-state systems; eight starts each with TRF B128. NPE samples had 2.26%
  lower trajectory NMSE and 21.7% longer runtime than deterministic starts,
  with near-chance per-system wins. Source:
  `docs/GLV_GLOBAL_LOCAL_DIAGNOSTIC_V2_RESULTS.md`.
- **Adjoint-control pilot:** completed 64-system bounded deterministic MSA
  adaptation, requiring extra per-instance search. It is neither equal total
  compute nor a faithful implementation of stochastic Adjoint Matching. Source:
  `docs/LORENZ63_ADJOINT_MATCHING_PILOT.md`.
- **Structured adaptive regularization:** follow-up manuscript planning draft
  dated September 16. It proposes learning regularization in an explicit weak
  inverse solve. Its existence does not establish a comparative win. Source:
  `docs/SAR_FOLLOWUP_PAPER_OUTLINE.md`.
- **Sequential RL with local-solver actions:** proposed generalization in the
  blog. Require meaningful same-budget oracle headroom and deployable ranking
  before expensive policy training. No successful RL optimizer is reported.

## Illustration and literature

Discovery chronology is supplied by the author: the inverse-problem
derivations preceded their encounter with the related Gradient Flow Matching
literature on neural-network optimization. The connection was a later,
surprising discovery, not the source of the original derivations. This records
when the authors encountered the work, not its publication chronology, and
makes no publication-priority claim.

`optimizer-landscape.png` is an original generated illustration inspired by
the user's conceptual reference. It contains no measured data. Black indicates
local steps; blue indicates proposals that still require evaluation. The
generation used the built-in image tool. The exact prompt is in
`image-prompt.txt`; its source and saved-image hash are in `provenance.json`.

Primary literature is linked beside the corresponding claims and collected
in the article's reading list. The autonomous transport discussion uses
Beckmann Transport Models v3, not the broader v2 abstract. No transport theorem
is claimed for the discrete-action teacher. Explorative Modeling selects
current generated candidates during training; fixed start0 and nearest raw
initializer selection are distinct constructions.
