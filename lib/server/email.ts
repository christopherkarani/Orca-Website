import { isProductionRuntime } from "./env";

export type LoginEmailResult = {
  delivered: boolean;
  devAccessLink?: string;
};

function requireEmailEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORCA_EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and ORCA_EMAIL_FROM are required for production login emails");
  }
  return { apiKey, from };
}

export async function sendLoginLinkEmail({
  to,
  accessLink,
}: {
  to: string;
  accessLink: string;
}): Promise<LoginEmailResult> {
  if (!isProductionRuntime()) {
    return { delivered: false, devAccessLink: accessLink };
  }

  const { apiKey, from } = requireEmailEnv();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your Orca account link",
      text: [
        "Open this link to view your Orca license and billing controls:",
        accessLink,
        "",
        "This link expires in 15 minutes and can be used once.",
      ].join("\n"),
      html: `<p>Open this link to view your Orca license and billing controls:</p><p><a href="${accessLink}">Open Orca account</a></p><p>This link expires in 15 minutes and can be used once.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected login email with status ${response.status}`);
  }

  return { delivered: true };
}
