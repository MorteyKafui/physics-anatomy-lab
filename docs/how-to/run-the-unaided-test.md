# Run the unaided test: five people who know no physics

The last Phase 1 item in the master plan is "Five people who know no physics complete the
pendulum unaided". It tests the plan's promise to a beginner: to never wonder what to do next.
The lab's coach is part of what is being tested, so testers may use every hint, card and
demonstration the lab offers. What they may not have is help from you.

## The pass rule

The item is done when **all five** testers, on their own, each:

1. reach step 10 (Report), with all of steps 1 to 9 completed, within 60 minutes; and
2. finish with a table and graph that the Review page shows no mistakes in; and
3. get no help from you with the task (see "What counts as your help").

A tester who fails any of these is still worth the session: what stopped them is the finding. Fix
it, then test a new person in their place (not the same person again, because they now know the
experiment).

## Who to ask

- **Adults (18 or over)** who have not studied physics beyond junior high school. For example,
  family, friends or colleagues who work outside science.
- **Not** anyone who has built, reviewed or seen this lab before.
- **Mix the devices:** three on a laptop and two on an Android phone, if you can. One of the
  phones can be the benchmark phone.
- **No under-18s in this round.** Students come in the Phase 6 usability tests, with their school's
  and parents' consent (AGENTS.md rule 4).

## What you need

- A production build, served as in `docs/how-to/benchmark-phone.md`, steps 1 and 2. On the laptop,
  open `http://localhost:3100/lab/simple-pendulum`. On a phone, use port forwarding.
- **A clean start for each tester.** Use a new Chrome profile, or in Chrome go to Settings ›
  Privacy and security › Site settings › View permissions and data stored across sites, and delete
  the data for `localhost`. The lab must open at "Step 1 of 10 · Question".
- One printed recording sheet per tester (at the end of this page), and a watch or clock.
- A quiet place. Sit beside and slightly behind the tester, not in front of the screen.

## The session (about 70 minutes)

### 1. Before you start (5 minutes)

Read this out, in your own words if you need to:

> Thank you for helping. We're testing the app, not you, so nothing you do can be wrong. If
> something is confusing, that's exactly what we need to know.
>
> Please do the experiment on the screen from start to finish, as if you were on your own. Think
> aloud as you go: say what you're looking at, what you expect, and what puzzles you.
>
> I can't answer questions about the experiment, because the app has to work without me. If you
> ask, I'll probably ask what you'd try. You can stop at any time.
>
> I'll take notes, but I won't write down your name. The app keeps no name or contact details.

Ask whether they are happy to go ahead. If they say no, thank them and stop. Label them P1, P2 and
so on, never by name.

### 2. The task (up to 60 minutes)

Say: "Please do the simple pendulum experiment. Start when you're ready." Note the time.

While they work:

- Write down **where they hesitate, what they say, and what they try**, with the step and the
  time. Hesitating for more than about 30 seconds, and any wrong turn, is worth a line.
- Stay quiet. If they fall silent for a long time, use only these prompts:
  - "What are you thinking?"
  - "What are you looking for?"
  - "What would you try?"
- If they ask you a question, reply "What do you think?" or "What would you try?"

**What counts as your help.** It fails rule 3, so mark it on the sheet:

- Answering a question about the task, or saying "yes" or "no" to an idea.
- Pointing at, naming or touching anything on the screen.
- Telling them which step they are on, or what to do next.

**What doesn't count.** Note it, but don't mark it as help:

- The neutral prompts above.
- Rescuing them from something technical that isn't part of the test, such as a browser crash or
  a phone going to sleep.

**If they are stuck.** After one neutral prompt, if they make no progress for 5 minutes, mark
"blocked" with the step and the time. You may then help them past that point, so the rest of the
session still teaches you something, but their run no longer counts as unaided. Stop at 60
minutes wherever they are.

### 3. When they finish or stop

1. Note the time.
2. Open Notebook from the app's side rail, choose "Download all with the report (ZIP)", and save
   the ZIP as `P1.zip` (`P2.zip`, …).
3. Open Review in the step strip. Note whether it shows any mistakes in the table or the graph.

### 4. Afterwards (5 minutes)

Ask these, and write down the answers in their words:

1. "What was the experiment for? What did you find?"
2. "Why do you think the swing was kept small, and why did you time 20 swings rather than one?"
   (The plan's success for a student: they can say why each precaution matters.)
3. "Was there a moment you didn't know what to do next? Where?"
4. "On a scale of 1 to 5, how sure were you, most of the time, about what to do next?"
5. "Anything else?"

Thank them.

## After all five

1. **Summarise the runs.** Extract `attempt.json` from each ZIP into a folder named after the
   tester (`P1/attempt.json`, …). Then, from the repository root:

   ```bash
   bun packages/engine/scripts/summarise-runs.ts P1/attempt.json P2/attempt.json P3/attempt.json P4/attempt.json P5/attempt.json
   ```

   It prints a table of, for each tester:
   - whether they finished, or the step they stopped at;
   - their total time, and their slowest step;
   - how often the coach helped, and with which skills;
   - how often they went back a step;
   - how many readings they took.

   It reads only what the lab recorded, which identifies no one.

2. **Write up the results** in `docs/planning/unaided-test-results.md`, in a pull request:
   - the summary table, with each tester's device and the pass rule's three checks;
   - every problem seen, most serious first, with how many testers hit it;
   - the answers to the questions, in brief.

   Leave out names, faces and voices. Keep the paper sheets only until the write-up is merged,
   then destroy them.

3. **Act on what you found.** Each problem becomes a fix in its own pull request. Then test new
   people in place of anyone who didn't pass.
4. **When all five have passed,** tick the item in `docs/planning/master-plan.md` in the
   results pull request (AGENTS.md, "Ticking an item").

---

## Recording sheet

Print one per tester.

**Tester:** P\_\_ **Device:** laptop / phone (model: \_\_\_\_\_\_) **Date:** \_\_\_\_\_\_

**Started:** \_\_:\_\_ **Finished or stopped:** \_\_:\_\_ **Reached step:** \_\_ of 10

| Time | Step | What happened (hesitation, words, wrong turn) | My help? |
| ---- | ---- | --------------------------------------------- | -------- |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |
|      |      |                                               |          |

**Blocked?** no / yes, at step \_\_ at \_\_:\_\_, because \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Review page:** no mistakes in the table and graph / mistakes in: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Answers afterwards:**

1. What it was for, and what they found:
2. Why a small swing, and why 20 swings:
3. Where they didn't know what to do next:
4. How sure, 1 to 5: \_\_
5. Anything else:

**Pass:** all ten steps in 60 minutes ☐ table and graph correct ☐ no help from me ☐
