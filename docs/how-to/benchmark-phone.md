# Run Physics Anatomy on the benchmark phone

The master plan's benchmark device is a low-cost Android phone (2 GB of RAM, a budget processor)
on slow 4G, as used in Ghanaian schools. CI emulates it in `e2e/tests/performance.spec.ts`
(Chrome's CPU slowed 6×, slow 4G). These steps check the same budgets on a real phone.

## What you need

- The phone, with Chrome, and a USB cable.
- A laptop with this repository, set up as in `local-setup-windows.md`, and Chrome.

A service worker only runs on a secure origin, and `localhost` counts as one. Chrome's port
forwarding lets the phone open the laptop's server as `localhost`, so the offline app installs
exactly as it will from the real site.

## 1. Serve a production build on the laptop

```powershell
bun run build
cd apps/web; bunx next start --port 3100
```

## 2. Connect the phone

1. On the phone, turn on Developer options (Settings › About phone, tap Build number seven times),
   then turn on USB debugging.
2. Connect it to the laptop with the cable and allow debugging when the phone asks.
3. On the laptop, open `chrome://inspect/#devices` in Chrome. Under Port forwarding, add
   `3100` → `localhost:3100` and tick "Enable port forwarding".

## 3. Install the app and take the readings

1. On the phone, open `http://localhost:3100/lab/simple-pendulum` in Chrome.
2. From Chrome's menu, choose Install app (or Add to home screen).
3. In `chrome://inspect` on the laptop, choose inspect under the phone's tab, then:
   - **JavaScript:** in the Network panel, tick "Disable cache", reload, and filter by JS. The
     transferred total is the lab's JavaScript.
   - **Frame rate:** build the bench and go to Measure. In the Performance panel, record ten
     seconds while the bob swings. Read the frame rate from the Frames track.
   - **Interaction:** in the same recording, press Start, Count a pass and Stop on the phone.
     Read the longest interaction from the Interactions track.
   - **Memory:** in the Memory panel, take a heap snapshot while the bob swings.
4. **Offline:** turn on aeroplane mode. Open the installed app from the home screen. Open the
   lab, the notebook, the review, the report and the print sheets, and download the report as
   a PDF. Turn aeroplane mode off and check your work is still there.

## 4. Record the results

Copy this table into the pull request or the issue for the run, with the phone's model:

| Budget (master plan)                 | Limit          | On the phone |
| ------------------------------------ | -------------- | ------------ |
| JavaScript to open the lab           | 350 KB or less |              |
| Frame rate while the bob swings      | 30 fps or more |              |
| Interaction to next paint            | 200 ms or less |              |
| Memory in a running experiment       | 150 MB or less |              |
| Opens and works in aeroplane mode    | Yes            |              |
| The report downloads as PDF, offline | Yes            |              |
