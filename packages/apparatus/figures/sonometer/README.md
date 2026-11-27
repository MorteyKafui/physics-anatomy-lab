# Sonometer figure

The vibrating string on a school sonometer, drawn with the Anatomy kit (`../../kit`). Every number
it shows comes from `packages/physics/src/sonometer.ts`, which the page inlines.

```powershell
node build.mjs            # sonometer.html (dark)
node build.mjs --light    # sonometer-light.html
node build.mjs --audit    # must end "audit passed"
node ../../kit/scripts/lines.mjs sonometer.html   # must print "line ends: 0"
```

The built pages and `shots/` are not committed. Proof screenshots are in `docs/proof/sim-sonometer/`.
