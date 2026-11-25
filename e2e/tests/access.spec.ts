import { expect, test } from "@playwright/test";

import { WEB } from "../playwright.config";

// Teacher sign-in and joining a class (design/mockups/SignIn.dc.html and Join.dc.html; landing
// page brief, decision 6). The API is answered here, so these run without it.

test.describe("teacher sign-in", () => {
  test("the landing page hands the email to /sign-in without putting it in the address", async ({
    page,
  }) => {
    await page.route("**/api/auth/methods", (r) =>
      r.fulfill({ json: { email_link: true, google: true } }),
    );
    let sent: unknown;
    await page.route("**/api/auth/email-link", async (r) => {
      sent = r.request().postDataJSON();
      await r.fulfill({ status: 202, json: { detail: "Check your email." } });
    });
    await page.goto(`${WEB}/#signup`);
    await page.getByLabel("School email").fill("teacher@example.test");
    await page.getByRole("button", { name: "Sign up with email" }).click();
    await expect(page).toHaveURL(`${WEB}/sign-in`);
    await expect(page.getByLabel("Your email")).toHaveValue("teacher@example.test");
    await expect(page.getByRole("link", { name: "Continue with Google" })).toBeVisible();

    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByText("teacher@example.test", { exact: true })).toBeVisible();
    // Without a Turnstile site key there is no widget and no token (the API's check is off too).
    expect(sent).toEqual({ email: "teacher@example.test" });
  });

  test("an email link signs in, and a new teacher names themselves for students", async ({
    page,
  }) => {
    await page.route("**/api/auth/email-link/verify", (r) =>
      r.fulfill({ json: { id: "t1", email: "teacher@example.test", display_name: null } }),
    );
    let named: unknown;
    await page.route("**/api/auth/me", async (r) => {
      if (r.request().method() === "PATCH") {
        named = r.request().postDataJSON();
        await r.fulfill({
          json: { id: "t1", email: "teacher@example.test", display_name: "Mr Mensah" },
        });
      } else await r.fulfill({ status: 401, json: { detail: "Not signed in" } });
    });
    await page.route("**/api/classes", (r) => r.fulfill({ json: [] }));
    await page.goto(`${WEB}/sign-in/link#token=abc`);
    await expect(page.getByRole("heading", { name: "You're signed in" })).toBeVisible();
    // The token is taken out of the address bar as soon as it is read.
    expect(new URL(page.url()).hash).toBe("");
    await page.getByLabel("Your name for students").fill("Mr Mensah");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(`${WEB}/teach`);
    expect(named).toEqual({ display_name: "Mr Mensah" });
  });

  test("a used link says so and offers a new one", async ({ page }) => {
    await page.route("**/api/auth/email-link/verify", (r) =>
      r.fulfill({
        status: 400,
        json: { detail: "This sign-in link has expired or was already used." },
      }),
    );
    await page.goto(`${WEB}/sign-in/link#token=used`);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a new link" })).toBeVisible();
  });
});

test.describe("joining a class", () => {
  test("a code from the landing page opens the class, its notices and the join form", async ({
    page,
  }) => {
    await page.route("**/api/join/ABC-123", (r) =>
      r.fulfill({
        json: { class_name: "Form 2 Science", teacher_name: "Mr Mensah", ai_enabled: false },
      }),
    );
    let joined: Record<string, unknown> | undefined;
    await page.route("**/api/join", async (r) => {
      joined = r.request().postDataJSON() as Record<string, unknown>;
      await r.fulfill({
        status: 201,
        json: { kind: "student", member_id: "m1", display_name: "Kofi_A" },
      });
    });
    await page.goto(`${WEB}/#signup`);
    await page.getByLabel("Class code from your teacher").fill("ABC-123");
    await page.getByRole("button", { name: "Join the class" }).click();
    await expect(page).toHaveURL(`${WEB}/join`);
    await expect(
      page.getByRole("heading", { name: "You're joining Form 2 Science" }),
    ).toBeVisible();
    await expect(page.getByText("Set up by your teacher, Mr Mensah.")).toBeVisible();
    await expect(page.getByText("AI help is off for this class.")).toBeVisible();

    await page.getByLabel("Pick a display name").fill("Kofi_A");
    await page.getByRole("button", { name: "Join the class" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "Tick the box to agree first.",
    );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Join the class" }).click();
    await expect(page).toHaveURL(`${WEB}/lab/simple-pendulum`);
    // ADR 0011: a code, a display name and the Terms tick, nothing else.
    expect(joined).toEqual({ code: "ABC-123", display_name: "Kofi_A", agreed_to_terms: true });
  });

  test("a wrong code is said plainly", async ({ page }) => {
    await page.route("**/api/join/NOPE", (r) =>
      r.fulfill({
        status: 404,
        json: { detail: "No class has this code. Check it with your teacher." },
      }),
    );
    await page.goto(`${WEB}/join`);
    await page.getByLabel("Class code from your teacher").fill("NOPE");
    await page.getByRole("button", { name: "Find my class" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "No class has this code. Check it with your teacher.",
    );
  });
});

test("the Terms and Privacy pages say they are drafts awaiting review", async ({ page }) => {
  for (const path of ["/terms", "/privacy"]) {
    await page.goto(`${WEB}${path}`);
    await expect(page.getByRole("note")).toContainText("It is not in force yet.");
    await expect(page.locator("[data-blank]").first()).toBeVisible();
  }
});
