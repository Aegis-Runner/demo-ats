# Harbor Hire

A fictional demo application used as an AegisRunner testing target (no third-party IP).

## What it exercises

```
HARBOR HIRE — an applicant tracker with a STAGE PIPELINE (cross-step continuity).
  PIPELINE      an application moves applied -> screen -> offer -> hired, one step
                at a time; skipping a stage is not offered. The action shown
                depends on the current stage.
  CONTINUITY    the candidate + job an application was created with must survive
                every stage move — dropping them mid-pipeline is a silent bug.
  FILTER        "By stage" returns a SUBSET; a leak is unsound.
Faults (healthy when DEMO_BUGS empty):
  skipstage     "Advance" jumps two stages instead of one
  ghostmove     the advance renders success but the stage never changes
  dropcandidate advancing past screen forgets which candidate it was
```

## Run

```sh
docker build -t demo-ats .
docker run -p 3000:3000 -e DEMO_RESET_TOKEN=changeme demo-ats
```

Fault injection is env-gated via `DEMO_BUGS` (comma-separated); healthy when empty. Reset via `POST /api/reset` with header `X-Reset-Token`.
