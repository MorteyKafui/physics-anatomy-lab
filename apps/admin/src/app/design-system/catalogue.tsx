"use client";

import { periodExact } from "@pa/physics";
import { contrast, Logo, THEMES, themes, topicHue, type Theme, type ThemeRoles } from "@pa/ui";
import { Badge } from "@pa/ui/components/badge";
import { Button } from "@pa/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pa/ui/components/card";
import { Checkbox } from "@pa/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@pa/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@pa/ui/components/field";
import { Input } from "@pa/ui/components/input";
import { Kbd } from "@pa/ui/components/kbd";
import { Label } from "@pa/ui/components/label";
import { Progress } from "@pa/ui/components/progress";
import { RadioGroup, RadioGroupItem } from "@pa/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pa/ui/components/select";
import { Separator } from "@pa/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@pa/ui/components/sheet";
import { toast, Toaster } from "@pa/ui/components/sonner";
import { Switch } from "@pa/ui/components/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pa/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { Textarea } from "@pa/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@pa/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@pa/ui/components/tooltip";
import { CheckIcon, PauseIcon, PlayIcon, RotateCcwIcon, TriangleAlertIcon } from "@pa/ui/icons";
import { useEffect, useState, type ReactNode } from "react";

const THEME_NAMES: Record<Theme, string> = {
  lab: "Lab (dark)",
  bench: "Bench paper",
  site: "Site (light)",
  projector: "Projector",
};

const ROLE_NAMES: [keyof ThemeRoles, string][] = [
  ["bg", "Background"],
  ["surface", "Surface"],
  ["raised", "Raised"],
  ["border", "Border"],
  ["control", "Control border"],
  ["fg", "Text"],
  ["fgSoft", "Soft text"],
  ["fgMuted", "Muted text"],
  ["accent", "Accent"],
  ["accentText", "Accent text"],
  ["ok", "Good"],
  ["warn", "Warning"],
  ["danger", "Critical"],
];

const TIMERS = [
  { value: "stopwatch", label: "Stopwatch (0.01 s)" },
  { value: "clock", label: "Wall clock (1 s)" },
  { value: "gate", label: "Light gate (0.001 s)" },
];

// Specimen numbers come from the physics package (AGENTS.md rule 1): a 5° pendulum, g = 9.81.
const SPECIMEN = [0.2, 0.4, 0.6, 0.8, 1.0].map((length) => ({
  length,
  period: periodExact({ length, g: 9.81, amplitude: (5 * Math.PI) / 180 }),
}));

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-border py-8">
      <h2 id={id} className="font-display text-2xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Catalogue() {
  const [theme, setTheme] = useState<Theme>("lab");

  // Popups open in a portal on <body>, so the theme goes on <html>, as it will in the apps.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  return (
    <TooltipProvider>
      <main className="mx-auto flex max-w-6xl flex-col px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-8">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="font-display text-3xl font-bold">Design system</h1>
              <p className="text-muted-foreground">
                Tokens, themes, type and components from{" "}
                <code className="font-mono">packages/ui</code>.
              </p>
              <p className="text-sm text-muted-foreground">
                Example content: labels and steps show how components look, not real data. Every
                number in a table here comes from the physics package.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span id="theme-label" className="text-sm text-soft">
              Theme
            </span>
            <ToggleGroup
              aria-labelledby="theme-label"
              value={[theme]}
              onValueChange={(v) => v[0] && setTheme(v[0] as Theme)}
              variant="outline"
            >
              {THEMES.map((t) => (
                <ToggleGroupItem key={t} value={t}>
                  {THEME_NAMES[t]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </header>

        <Section id="themes" title="Themes">
          <p className="max-w-prose text-soft">
            Every component uses roles, never palette colours, so one attribute re-colours it.
            Ratios are against the background, worked out here from the theme values. Text needs
            4.5:1 (7:1 on the projector theme); control borders and focus rings need 3:1.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {THEMES.map((t) => (
              <div
                key={t}
                data-theme={t}
                className="flex flex-col gap-2 border border-border bg-background p-4 text-foreground"
              >
                <h3 className="font-medium">{THEME_NAMES[t]}</h3>
                <ul className="flex flex-col gap-1">
                  {ROLE_NAMES.map(([role, label]) => (
                    <li key={role} className="flex items-center gap-2 text-sm">
                      <span
                        aria-hidden
                        className="size-4 shrink-0 border border-border"
                        style={{ background: themes[t][role] }}
                      />
                      <span className="flex-1">{label}</span>
                      <code className="font-mono text-xs text-muted-foreground">
                        {themes[t][role]}
                      </code>
                      {role !== "bg" && (
                        <code className="w-12 text-right font-mono text-xs">
                          {contrast(themes[t][role], themes[t].bg).toFixed(1)}
                        </code>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="topics" title="Topic colours">
          <p className="max-w-prose text-soft">
            One hue per physics topic, for data points, tags and figures. Never for body text, and
            never the only way something is shown.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(topicHue).map(([topic, hex]) => (
              <li key={topic} className="flex flex-col gap-2">
                <span
                  aria-hidden
                  className="h-12 border border-border"
                  style={{ background: hex }}
                />
                <span className="text-sm capitalize">{topic}</span>
                <code className="font-mono text-xs text-muted-foreground">{hex}</code>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="type" title="Type">
          <p className="max-w-prose text-soft">
            Geist for the interface, Geist Mono with tabular figures for every number, unit and
            code, and Bricolage Grotesque for display headlines. All three are open-licensed.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Display · Bricolage Grotesque</span>
              <p className="font-display text-5xl font-extrabold tracking-tight">
                Physics from first principles.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Interface · Geist</span>
              <p className="text-lg">
                Release the bob from a small angle and time twenty oscillations.
              </p>
              <p className="text-sm text-soft">Read the stopwatch to the nearest 0.01 s.</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Numbers · Geist Mono, tabular</span>
              <table className="font-mono text-sm">
                <caption className="sr-only">Period of a pendulum swinging through 5°</caption>
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="pr-6 text-left font-normal">l / m</th>
                    <th className="text-right font-normal">T / s</th>
                  </tr>
                </thead>
                <tbody>
                  {SPECIMEN.map((row) => (
                    <tr key={row.length}>
                      <td className="pr-6">{row.length.toFixed(3)}</td>
                      <td className="text-right">{row.period.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section id="buttons" title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Start measuring</Button>
            <Button variant="outline">Add a row</Button>
            <Button variant="secondary">Save snapshot</Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="destructive">Delete reading</Button>
            <Button variant="link">View all readings</Button>
            <Button disabled>Plot graph</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Start the stopwatch">
              <PlayIcon />
            </Button>
            <Button size="icon" variant="outline" aria-label="Pause">
              <PauseIcon />
            </Button>
            <Button variant="outline">
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            36 px tall for a mouse, as in the mockups; at least 44 px on touch screens.
          </p>
        </Section>

        <Section id="forms" title="Forms">
          <div className="grid gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="ds-length">Length of the pendulum (cm)</FieldLabel>
              <Input id="ds-length" inputMode="decimal" placeholder="e.g. 80.0" />
              <FieldDescription>
                Measure from the point of suspension to the centre of the bob.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-instrument">Timing with</FieldLabel>
              <Select defaultValue="stopwatch" items={TIMERS}>
                <SelectTrigger id="ds-instrument" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-precautions">Precautions</FieldLabel>
              <Textarea
                id="ds-precautions"
                placeholder="What you did to make your readings reliable"
              />
            </Field>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="ds-repeat" defaultChecked />
                <Label htmlFor="ds-repeat">Repeat each reading</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ds-sound" defaultChecked />
                <Label htmlFor="ds-sound">Lab sounds</Label>
              </div>
              <RadioGroup defaultValue="colour" aria-label="Graph export">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="colour" id="ds-colour" />
                  <Label htmlFor="ds-colour">Colour</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="mono" id="ds-mono" />
                  <Label htmlFor="ds-mono">Black and white</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </Section>

        <Section id="tabs" title="Tabs, chips and keys">
          <Tabs defaultValue="coach" className="max-w-xl">
            <TabsList>
              <TabsTrigger value="coach">Coach</TabsTrigger>
              <TabsTrigger value="steps">Steps</TabsTrigger>
              <TabsTrigger value="formulas">Formulas</TabsTrigger>
            </TabsList>
            <TabsContent value="coach" className="pt-3 text-soft">
              Hints appear here while you work.
            </TabsContent>
            <TabsContent value="steps" className="pt-3 text-soft">
              The steps of the experiment.
            </TabsContent>
            <TabsContent value="formulas" className="pt-3 text-soft">
              Formula cards for this experiment.
            </TabsContent>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>New</Badge>
            <Badge variant="secondary">Mechanics</Badge>
            <Badge variant="outline">
              <CheckIcon aria-hidden /> On track
            </Badge>
            <Badge variant="destructive">
              <TriangleAlertIcon aria-hidden /> Needs attention
            </Badge>
            <span className="ml-4 text-sm text-soft">
              Search with <Kbd>/</Kbd> or <Kbd>⌘K</Kbd>
            </span>
          </div>
        </Section>

        <Section id="surfaces" title="Cards and tables">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Simple pendulum</CardTitle>
                <CardDescription>Find g from a graph of T² against l.</CardDescription>
                <CardAction>
                  <Badge variant="secondary">Mechanics</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Progress value={40} aria-label="Steps done" />
                <span className="text-sm text-muted-foreground">Step 4 of 10</span>
              </CardContent>
            </Card>
            <Table>
              <TableCaption>Specimen: periods from the physics package.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>l / m</TableHead>
                  <TableHead className="text-right">T / s</TableHead>
                  <TableHead className="text-right">T² / s²</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SPECIMEN.map((row) => (
                  <TableRow key={row.length}>
                    <TableCell className="font-mono">{row.length.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono">{row.period.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(row.period ** 2).toFixed(3)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section id="overlays" title="Dialogs, drawers, tooltips and toasts">
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>Open a dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this reading?</DialogTitle>
                  <DialogDescription>
                    You can undo this for a few seconds afterwards.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Keep it</DialogClose>
                  <DialogClose render={<Button variant="destructive" />}>Delete</DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>Open a drawer</SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Bench 4</SheetTitle>
                  <SheetDescription>The detail drawer has one main action.</SheetDescription>
                </SheetHeader>
                <SheetFooter>
                  <Button>Send a hint</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" />}>
                Hover for a tooltip
              </TooltipTrigger>
              <TooltipContent>Least count of the stopwatch: 0.01 s</TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              onClick={() =>
                toast("Reading deleted", {
                  action: { label: "Undo", onClick: () => toast("Reading restored") },
                })
              }
            >
              Show a toast with Undo
            </Button>
          </div>
        </Section>

        <Separator />
        <p className="pt-6 text-sm text-muted-foreground">
          Square corners everywhere (Lyra). Only truly round things are round: status dots, the bob,
          progress rings and the stopwatch.
        </p>
      </main>
      <Toaster />
    </TooltipProvider>
  );
}
