---------------------------- MODULE GuidedSteps ----------------------------
(***************************************************************************)
(* The ten steps of an attempt (GLOSSARY.md), as a TLA+ model of           *)
(* packages/engine/src/steps/machine.ts. TLC checks the rules the master   *)
(* plan asks for ("Proven, not hoped"):                                     *)
(*                                                                          *)
(*   1. A student can always reach a report.               ReachesReport    *)
(*   2. No reading is ever lost.                           NoReadingLost    *)
(*   3. Exam mode never shows a hint.                      ExamShowsNoHint  *)
(*   4. The accepted value stays hidden until the student has analysed     *)
(*      their own data and read the feedback.              AcceptedLocked  *)
(*                                                                          *)
(* A step's exit check is the experiment's own; here it is "the student    *)
(* did the work", so CompleteStep is always possible, except that Measure  *)
(* needs at least one reading.                                             *)
(***************************************************************************)
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS Readings   \* reading ids the model may record, e.g. {r1, r2}

Steps == <<"question", "predict", "build", "check", "measure",
           "tabulate", "plot", "analyse", "conclude", "report">>
N == Len(Steps)
Idx(s) == CHOOSE i \in 1..N : Steps[i] = s

Modes == {"guided", "exam", "own-data"}
Levels == {"auto", "check-my-work", "on-my-own"}

VARIABLES
    mode,           \* fixed when the attempt starts
    level,          \* help level; ignored in exam mode
    step,           \* index of the step the student is on
    completed,      \* indices of steps whose exit check has passed
    readings,       \* readings in the table
    deleted,        \* readings the student removed (restorable)
    recorded,       \* every reading ever taken (history, for the check)
    hintShown,      \* has the coach shown any hint?
    feedbackRead,
    acceptedShown

vars == <<mode, level, step, completed, readings, deleted, recorded,
          hintShown, feedbackRead, acceptedShown>>

TypeOK ==
    /\ mode \in Modes
    /\ level \in Levels
    /\ step \in 1..N
    /\ completed \subseteq 1..N
    /\ readings \subseteq Readings /\ deleted \subseteq Readings
    /\ recorded \subseteq Readings
    /\ hintShown \in BOOLEAN /\ feedbackRead \in BOOLEAN /\ acceptedShown \in BOOLEAN

\* The furthest step the student may open: the first one not yet completed.
Frontier == IF completed = 1..N THEN N
            ELSE CHOOSE i \in 1..N : i \notin completed /\ \A j \in 1..(i-1) : j \in completed

Init ==
    /\ mode \in Modes
    /\ level \in Levels
    /\ step = 1
    /\ completed = {}
    /\ readings = {} /\ deleted = {} /\ recorded = {}
    /\ hintShown = FALSE /\ feedbackRead = FALSE /\ acceptedShown = FALSE

\* Go back to any step, or forward up to the frontier.
GoTo(i) ==
    /\ i \in 1..Frontier
    /\ i # step
    /\ step' = i
    /\ UNCHANGED <<mode, level, completed, readings, deleted, recorded,
                   hintShown, feedbackRead, acceptedShown>>

CompleteStep ==
    /\ step \notin completed
    /\ (Steps[step] = "measure") => readings # {}
    /\ completed' = completed \cup {step}
    /\ UNCHANGED <<mode, level, step, readings, deleted, recorded,
                   hintShown, feedbackRead, acceptedShown>>

RecordReading(r) ==
    /\ Steps[step] = "measure"
    /\ r \notin recorded
    /\ readings' = readings \cup {r}
    /\ recorded' = recorded \cup {r}
    /\ UNCHANGED <<mode, level, step, completed, deleted, hintShown,
                   feedbackRead, acceptedShown>>

DeleteReading(r) ==
    /\ Steps[step] \in {"measure", "tabulate"}
    /\ r \in readings
    /\ readings' = readings \ {r}
    /\ deleted' = deleted \cup {r}
    /\ UNCHANGED <<mode, level, step, completed, recorded, hintShown,
                   feedbackRead, acceptedShown>>

RestoreReading(r) ==
    /\ r \in deleted
    /\ deleted' = deleted \ {r}
    /\ readings' = readings \cup {r}
    /\ UNCHANGED <<mode, level, step, completed, recorded, hintShown,
                   feedbackRead, acceptedShown>>

SetLevel(l) ==
    /\ mode # "exam"
    /\ level' = l
    /\ UNCHANGED <<mode, step, completed, readings, deleted, recorded,
                   hintShown, feedbackRead, acceptedShown>>

ShowHint ==
    /\ mode # "exam"
    /\ hintShown' = TRUE
    /\ UNCHANGED <<mode, level, step, completed, readings, deleted, recorded,
                   feedbackRead, acceptedShown>>

ReadFeedback ==
    /\ Idx("analyse") \in completed
    /\ feedbackRead' = TRUE
    /\ UNCHANGED <<mode, level, step, completed, readings, deleted, recorded,
                   hintShown, acceptedShown>>

RevealAccepted ==
    /\ Idx("analyse") \in completed
    /\ feedbackRead
    /\ acceptedShown' = TRUE
    /\ UNCHANGED <<mode, level, step, completed, readings, deleted, recorded,
                   hintShown, feedbackRead>>

\* Opening the first unfinished step. (Fairness on "step forward by one" is not enough: TLC
\* found a student bouncing between steps 1 and 2 for ever, which steps forward infinitely often
\* without ever reaching step 3.)
OpenFrontier == GoTo(Frontier)

Next ==
    \/ \E i \in 1..N : GoTo(i)
    \/ CompleteStep
    \/ \E r \in Readings : RecordReading(r) \/ DeleteReading(r) \/ RestoreReading(r)
    \/ \E l \in Levels : SetLevel(l)
    \/ ShowHint \/ ReadFeedback \/ RevealAccepted

\* The student keeps working: whenever the next piece of progress is possible again and
\* again, it eventually happens. Stepping back, deleting and hints may happen any number of
\* times in between.
Fairness ==
    /\ SF_vars(CompleteStep)
    /\ SF_vars(OpenFrontier)
    /\ \A r \in Readings : SF_vars(RecordReading(r))
    /\ SF_vars(\E r \in Readings : RestoreReading(r))

Spec == Init /\ [][Next]_vars /\ Fairness

-----------------------------------------------------------------------------
ExamShowsNoHint == mode = "exam" => ~hintShown

NoReadingLost == recorded \subseteq (readings \cup deleted)

AcceptedLocked == acceptedShown => (Idx("analyse") \in completed /\ feedbackRead)

CompletedNeverShrinks == [][completed \subseteq completed']_vars

ReachesReport == <>(step = N)
=============================================================================
