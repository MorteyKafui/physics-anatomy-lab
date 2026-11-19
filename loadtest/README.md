# Load tests

k6 scripts for the master plan's scale targets. What they measure, how to run them and how to read
the results: [docs/ops/load-testing.md](../docs/ops/load-testing.md).

```powershell
k6 run -e ADDRESS_HEADER=x-load-test-address --summary-export loadtest/results/smoke.json loadtest/classroom.js
```
