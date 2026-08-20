// Função serverless (Vercel) que recebe as respostas do formulário,
// monta um HTML simples e dispara por e-mail via Resend.
// Variáveis de ambiente necessárias (configuradas no painel da Vercel):
//   RESEND_API_KEY  -> chave de API do resend.com
//   TO_EMAIL        -> e-mail que vai receber as respostas
//   FROM_EMAIL      -> remetente verificado no Resend (ex: onboarding@resend.dev para testes)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clientName, pages, answers } = req.body || {};

  if (!pages || !answers) {
    return res.status(400).json({ error: "Missing pages or answers" });
  }

  const html = buildHtml(clientName, pages, answers);

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: process.env.TO_EMAIL,
        subject: `Novas respostas do formulário — ${clientName || "Cliente"}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", errText);
      // DEBUG TEMPORÁRIO: expõe o erro real do Resend para diagnóstico. Remover depois.
      return res.status(502).json({ error: "Falha ao enviar e-mail", debug: errText });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(clientName, pages, answers) {
  let body = `<h1 style="font-family:sans-serif;">Respostas do formulário${clientName ? " — " + escapeHtml(clientName) : ""}</h1>`;

  pages.forEach((page) => {
    body += `<h2 style="font-family:sans-serif;margin-top:32px;">${escapeHtml(page.title)}</h2>`;
    page.questions.forEach((q) => {
      const answer = answers[q.id];
      const displayAnswer = answer && String(answer).trim() ? escapeHtml(answer) : "(não respondido)";
      body += `
        <div style="margin:16px 0;font-family:sans-serif;">
          <p style="font-weight:600;margin:0 0 4px 0;">${escapeHtml(q.label)}</p>
          <p style="margin:0;white-space:pre-wrap;color:#333;">${displayAnswer}</p>
        </div>
      `;
    });
  });

  return body;
}
