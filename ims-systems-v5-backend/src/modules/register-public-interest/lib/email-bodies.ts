/** Carbon Calculator early-access confirmation (static copy per spec). */
export function buildCarbonCalculatorInterestEmail(): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Carbo-Calc Interest Registered Successfully.";
  const text = [
    "Thank you for registering your interest in the Carbon Calculator.",
    "",
    "We predict it will be available in July, and you will get exclusive early access when it launches.",
    "",
    "If you have any questions, contact support@imssystems.tech.",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
      <p>Thank you for registering your interest in the <strong>Carbon Calculator</strong>.</p>
      <p>We predict it will be available in July, and you will get <strong>exclusive early access</strong> when it launches.</p>
      <p>If you have any questions, contact <a href="mailto:support@imssystems.tech">support@imssystems.tech</a>.</p>
    </div>
  `.trim();

  return { subject, html, text };
}
