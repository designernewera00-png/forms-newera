// Controla navegação entre telas, validação e o disparo final das respostas por e-mail.

(function () {
  const container = document.getElementById("questions-container");
  const headerRight = document.getElementById("header-right");
  const homeGreeting = document.getElementById("home-greeting");

  const answers = {};
  let currentIndex = -1; // -1 = tela Home

  homeGreeting.textContent = `Olá, ${FORM_CONFIG.clientName}`;

  // ---------- Gera o HTML de cada tela de pergunta a partir de questions.js ----------

  FORM_CONFIG.pages.forEach((page, pageIndex) => {
    const section = document.createElement("section");
    section.className = "screen";
    section.id = `screen-${page.id}`;

    const inner = document.createElement("div");
    inner.className = "screen-inner";

    const blocoTexto = document.createElement("div");
    blocoTexto.className = "bloco-texto";
    blocoTexto.innerHTML = `
      <span class="eyebrow">${page.eyebrow}</span>
      <h1 class="page-title">${page.title}</h1>
    `;
    inner.appendChild(blocoTexto);

    const blocoPerguntas = document.createElement("div");
    blocoPerguntas.className = "bloco-perguntas";

    page.questions.forEach((q) => {
      const wrap = document.createElement("div");
      wrap.className = "pergunta";

      const label = document.createElement("label");
      label.textContent = q.label;
      wrap.appendChild(label);

      if (q.type === "text") {
        const box = document.createElement("div");
        box.className = "bloco-escrever";
        const textarea = document.createElement("textarea");
        textarea.rows = 1;
        textarea.placeholder = q.placeholder || "";
        textarea.dataset.qid = q.id;
        textarea.addEventListener("input", () => {
          autoGrow(textarea);
          answers[q.id] = textarea.value;
          box.classList.remove("error");
        });
        box.appendChild(textarea);
        wrap.appendChild(box);
      } else if (q.type === "choice") {
        const choiceWrap = document.createElement("div");
        choiceWrap.className = "bloco-checkbox";
        choiceWrap.dataset.qid = q.id;

        q.options.forEach((optionLabel) => {
          const opt = document.createElement("div");
          opt.className = "checkbox-option";
          opt.dataset.value = optionLabel;
          opt.innerHTML = `
            <img src="assets/checkbox-unchecked.svg" alt="" />
            <span>${optionLabel}</span>
          `;
          opt.addEventListener("click", () => {
            choiceWrap.querySelectorAll(".checkbox-option").forEach((el) => {
              el.classList.remove("selected");
              el.querySelector("img").src = "assets/checkbox-unchecked.svg";
            });
            opt.classList.add("selected");
            opt.querySelector("img").src = "assets/checkbox-checked.svg";
            answers[q.id] = optionLabel;
          });
          choiceWrap.appendChild(opt);
        });

        wrap.appendChild(choiceWrap);
      }

      blocoPerguntas.appendChild(wrap);
    });

    const btnWrap = document.createElement("div");
    btnWrap.className = "btn-next-wrap";

    const btnBack = document.createElement("button");
    btnBack.className = "btn-back";
    btnBack.innerHTML = `<img src="assets/arrow-right.svg" alt="" /> Voltar`;
    btnBack.addEventListener("click", () => showScreen(pageIndex - 1));
    btnWrap.appendChild(btnBack);

    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.innerHTML = `${pageIndex === FORM_CONFIG.pages.length - 1 ? "Enviar" : "Próximo"} <img src="assets/arrow-right.svg" alt="" />`;
    btn.addEventListener("click", () => handleNext(page, pageIndex));
    btnWrap.appendChild(btn);

    blocoPerguntas.appendChild(btnWrap);

    inner.appendChild(blocoPerguntas);
    section.appendChild(inner);
    container.appendChild(section);
  });

  function autoGrow(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  // ---------- Navegação ----------

  function showScreen(index) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));

    if (index === -1) {
      document.getElementById("screen-home").classList.add("active");
      headerRight.textContent = "Bem-vindo(a)";
    } else if (index === FORM_CONFIG.pages.length) {
      document.getElementById("screen-conclusao").classList.add("active");
      headerRight.textContent = "08/08";
    } else {
      const page = FORM_CONFIG.pages[index];
      document.getElementById(`screen-${page.id}`).classList.add("active");
      headerRight.textContent = page.progress;
    }

    window.scrollTo(0, 0);
    currentIndex = index;
  }

  function validatePage(page) {
    let valid = true;

    page.questions.forEach((q) => {
      if (!q.required) return;

      if (q.type === "text") {
        const textarea = document.querySelector(`textarea[data-qid="${q.id}"]`);
        if (!answers[q.id] || !answers[q.id].trim()) {
          textarea.closest(".bloco-escrever").classList.add("error");
          valid = false;
        }
      } else if (q.type === "choice") {
        if (!answers[q.id]) {
          valid = false;
        }
      }
    });

    return valid;
  }

  function handleNext(page, pageIndex) {
    if (!validatePage(page)) return;

    if (pageIndex === FORM_CONFIG.pages.length - 1) {
      showScreen(FORM_CONFIG.pages.length);
      sendAnswers();
    } else {
      showScreen(pageIndex + 1);
    }
  }

  document.getElementById("btn-start").addEventListener("click", () => {
    showScreen(0);
  });

  // ---------- Envio final por e-mail (Resend, via função serverless /api/send-email) ----------

  async function sendAnswers() {
    const statusEl = document.getElementById("download-status");
    statusEl.textContent = "Enviando suas respostas...";
    statusEl.className = "download-status";

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: FORM_CONFIG.clientName,
          pages: FORM_CONFIG.pages,
          answers: answers,
        }),
      });

      if (!response.ok) throw new Error("Falha no envio");

      statusEl.textContent = "Respostas enviadas com sucesso!";
      statusEl.className = "download-status success";
    } catch (err) {
      statusEl.textContent = "Não foi possível enviar automaticamente. Tente novamente em instantes.";
      statusEl.className = "download-status error";
      console.error(err);
    }
  }
})();
