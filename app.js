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

        // Campo "Outro" (só aparece quando a opção Outro é marcada)
        const hasOutro = q.options.some(isOutro);
        let outroBox = null;
        let outroTextarea = null;
        const outroValue = () => {
          const txt = outroTextarea ? outroTextarea.value.trim() : "";
          return txt ? `Outro: ${txt}` : "Outro";
        };

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

            if (isOutro(optionLabel)) {
              answers[q.id] = outroValue();
              if (outroBox) {
                outroBox.classList.add("visible");
                outroTextarea.focus();
              }
            } else {
              answers[q.id] = optionLabel;
              if (outroBox) {
                outroBox.classList.remove("visible", "error");
                outroTextarea.value = "";
              }
            }
          });
          choiceWrap.appendChild(opt);
        });

        wrap.appendChild(choiceWrap);

        if (hasOutro) {
          outroBox = createOutroBox(q.id);
          outroTextarea = outroBox.querySelector("textarea");
          outroTextarea.addEventListener("input", () => {
            autoGrow(outroTextarea);
            answers[q.id] = outroValue();
            outroBox.classList.remove("error");
          });
          wrap.appendChild(outroBox);
        }
      } else if (q.type === "multi_choice") {
        const max = q.max || Infinity;
        answers[q.id] = [];

        const choiceWrap = document.createElement("div");
        choiceWrap.className = "bloco-checkbox bloco-checkbox--grid";
        choiceWrap.dataset.qid = q.id;

        // Campo "Outro" (só aparece quando a opção Outro é marcada)
        const hasOutro = q.options.some(isOutro);
        let outroBox = null;
        let outroTextarea = null;
        const outroValue = () => {
          const txt = outroTextarea ? outroTextarea.value.trim() : "";
          return txt ? `Outro: ${txt}` : "Outro";
        };

        q.options.forEach((optionLabel) => {
          const optIsOutro = isOutro(optionLabel);
          const opt = document.createElement("div");
          opt.className = "checkbox-option checkbox-option--wrap";
          opt.dataset.value = optionLabel;
          opt.innerHTML = `
            <img src="assets/checkbox-unchecked.svg" alt="" />
            <span>${optionLabel}</span>
          `;
          opt.addEventListener("click", () => {
            const selected = answers[q.id];
            // para a opção Outro, qualquer valor começando com "Outro" conta como marcado
            const idx = selected.findIndex((v) => (optIsOutro ? isOutro(v) : v === optionLabel));

            if (idx !== -1) {
              answers[q.id] = selected.filter((_, i) => i !== idx);
              opt.classList.remove("selected");
              opt.querySelector("img").src = "assets/checkbox-unchecked.svg";
              if (optIsOutro && outroBox) {
                outroBox.classList.remove("visible", "error");
                outroTextarea.value = "";
              }
            } else {
              if (selected.length >= max) return; // já atingiu o limite de seleções
              answers[q.id].push(optIsOutro ? outroValue() : optionLabel);
              opt.classList.add("selected");
              opt.querySelector("img").src = "assets/checkbox-checked.svg";
              if (optIsOutro && outroBox) {
                outroBox.classList.add("visible");
                outroTextarea.focus();
              }
            }
          });
          choiceWrap.appendChild(opt);
        });

        wrap.appendChild(choiceWrap);

        if (q.max) {
          const hint = document.createElement("span");
          hint.className = "choice-hint";
          hint.textContent = `Selecione até ${q.max} opções.`;
          wrap.appendChild(hint);
        }

        if (hasOutro) {
          outroBox = createOutroBox(q.id);
          outroTextarea = outroBox.querySelector("textarea");
          outroTextarea.addEventListener("input", () => {
            autoGrow(outroTextarea);
            const idx = answers[q.id].findIndex(isOutro);
            if (idx !== -1) answers[q.id][idx] = outroValue();
            outroBox.classList.remove("error");
          });
          wrap.appendChild(outroBox);
        }
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

  // Reconhece a opção "Outro" (ex.: "Outro", "Outro ", "outros")
  function isOutro(label) {
    return /^outro/i.test(String(label).trim());
  }

  // Cria o campo de texto que aparece ao marcar "Outro"
  function createOutroBox(qid) {
    const box = document.createElement("div");
    box.className = "bloco-escrever bloco-outro";
    box.dataset.outroFor = qid;
    const textarea = document.createElement("textarea");
    textarea.rows = 1;
    textarea.placeholder = "Qual? Escreva aqui...";
    box.appendChild(textarea);
    return box;
  }

  // ---------- Navegação ----------

  function showScreen(index) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));

    if (index === -1) {
      document.getElementById("screen-home").classList.add("active");
      headerRight.textContent = "Bem-vindo(a)";
    } else if (index === FORM_CONFIG.pages.length) {
      document.getElementById("screen-conclusao").classList.add("active");
      headerRight.textContent = FORM_CONFIG.pages[FORM_CONFIG.pages.length - 1].progress;
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
        } else if (answers[q.id] === "Outro") {
          // "Outro" marcado mas sem texto escrito
          markOutroError(q.id);
          valid = false;
        }
      } else if (q.type === "multi_choice") {
        if (!answers[q.id] || answers[q.id].length === 0) {
          valid = false;
        } else if (answers[q.id].some((v) => v === "Outro")) {
          markOutroError(q.id);
          valid = false;
        }
      }
    });

    return valid;
  }

  function markOutroError(qid) {
    const box = document.querySelector(`[data-outro-for="${qid}"]`);
    if (box) box.classList.add("error");
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
