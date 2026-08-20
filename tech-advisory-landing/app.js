// Wait for DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- 1. Mobile Menu Toggle ---
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('hidden');
      if (isOpen) {
        mobileMenu.classList.remove('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
      } else {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- 2. Navbar Background Blur on Scroll & Scrollspy ---
  const navbar = document.getElementById('navbar');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('py-3', 'bg-slate-950/80', 'backdrop-blur-xl', 'border-b', 'border-slate-800/80');
      navbar.classList.remove('py-5');
    } else {
      navbar.classList.remove('py-3', 'bg-slate-950/80', 'border-b', 'border-slate-800/80');
      navbar.classList.add('py-5');
    }

    // Scrollspy active section detection
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('text-cyan-400', 'font-semibold');
      link.classList.add('text-slate-400');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.remove('text-slate-400');
        link.classList.add('text-cyan-400', 'font-semibold');
      }
    });
  });

  // --- 3. Toast Notification Helper ---
  window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl text-sm font-medium transition-all duration-300 transform translate-y-4 opacity-0 ${
      isSuccess 
        ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-300 shadow-cyan-500/10' 
        : 'bg-slate-900/90 border-amber-500/40 text-amber-300 shadow-amber-500/10'
    }`;
    
    const iconName = isSuccess ? 'check-circle-2' : 'alert-circle';
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-5 h-5 ${isSuccess ? 'text-cyan-400' : 'text-amber-400'} shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    });

    // Remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  };

  // --- 4. Modal Management ---
  const modals = document.querySelectorAll('.modal-backdrop');
  const modalTriggers = document.querySelectorAll('[data-modal-target]');
  const modalCloses = document.querySelectorAll('[data-modal-close]');

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = trigger.getAttribute('data-modal-target');
      openModal(targetId);
    });
  });

  modalCloses.forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modal = closeBtn.closest('.modal-backdrop');
      closeModal(modal);
    });
  });

  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-backdrop.active');
      if (activeModal) closeModal(activeModal);
    }
  });

  // Expose modal helper globally
  window.openModal = openModal;
  window.closeModal = closeModal;

  // --- 5. Tradeoff Matrix Explorer Widget ---
  const latencySlider = document.getElementById('slider-latency');
  const speedSlider = document.getElementById('slider-speed');
  const budgetSlider = document.getElementById('slider-budget');

  const outcomeTitle = document.getElementById('tradeoff-outcome-title');
  const outcomeDesc = document.getElementById('tradeoff-outcome-desc');
  const outcomeStack = document.getElementById('tradeoff-outcome-stack');
  const outcomeMetricLatency = document.getElementById('tradeoff-metric-latency');
  const outcomeMetricCost = document.getElementById('tradeoff-metric-cost');

  function updateTradeoffExplorer() {
    if (!latencySlider || !speedSlider || !budgetSlider) return;

    const latencyVal = parseInt(latencySlider.value); // 1 = High performance, 3 = Balanced
    const speedVal = parseInt(speedSlider.value);     // 1 = High consistency, 3 = Eventual consistency
    const budgetVal = parseInt(budgetSlider.value);   // 1 = Lean startup, 3 = Enterprise high budget

    // Dynamic Strategy Calculations based on Senior Tradeoffs Logic
    if (latencyVal === 1 && budgetVal >= 2) {
      outcomeTitle.innerText = "Arquitectura Event-Driven & Caching Multi-Capa (High Scale)";
      outcomeDesc.innerText = "Prioriza sub-10ms en lecturas usando Redis Cluster, CDN Edge Revalidation y CQRS en bases de datos con réplicas de lectura desacopladas.";
      outcomeStack.innerText = "Redis, Kafka/RabbitMQ, PostgreSQL Read-Replicas, Go/Rust micro-services.";
      outcomeMetricLatency.innerText = "< 15 ms P99";
      outcomeMetricCost.innerText = "Medio - Alto";
    } else if (latencyVal === 3 || budgetVal === 1) {
      outcomeTitle.innerText = "Monolito Modular Resiliente (Pragmatic Senior Stack)";
      outcomeDesc.innerText = "Maximiza la velocidad de iteración y minimiza complejidad operativa. Un único repositorio bien estructurado con límites de dominio claros y PostgreSQL tuneado.";
      outcomeStack.innerText = "Node.js / Go, PostgreSQL + PgBouncer, Redis Caching, Cloudflare CDN.";
      outcomeMetricLatency.innerText = "~ 45 ms P99";
      outcomeMetricCost.innerText = "Optimizado (Bajo OpEx)";
    } else if (speedVal === 1) {
      outcomeTitle.innerText = "Arquitectura Transaccional ACID con Alta Consistencia";
      outcomeDesc.innerText = "Diseñada para finanzas o inventarios donde la pérdida o inconsistencia de datos es inaceptable. Isolation levels estrictos y patrones Outbox.";
      outcomeStack.innerText = "PostgreSQL / CockroachDB, Transactional Outbox, Event Sourcing auditables.";
      outcomeMetricLatency.innerText = "~ 25 ms P99";
      outcomeMetricCost.innerText = "Controlado";
    } else {
      outcomeTitle.innerText = "Arquitectura Híbrida Distribuida Escalable";
      outcomeDesc.innerText = "Balance ideal entre desacoplamiento por microservicios de dominio y capa de ingestión asíncrona para soportar picos inesperados de tráfico.";
      outcomeStack.innerText = "NestJS / Go, RabbitMQ, PostgreSQL + DynamoDB / MongoDB, Docker & K8s.";
      outcomeMetricLatency.innerText = "~ 20 ms P99";
      outcomeMetricCost.innerText = "Equilibrado";
    }
  }

  [latencySlider, speedSlider, budgetSlider].forEach(slider => {
    if (slider) slider.addEventListener('input', updateTradeoffExplorer);
  });
  updateTradeoffExplorer();

  // --- 6. DB Query Tuning Interactive Visualizer ---
  const btnBeforeQuery = document.getElementById('btn-query-before');
  const btnAfterQuery = document.getElementById('btn-query-after');
  const queryCodeContainer = document.getElementById('query-code-display');
  const queryMetricLatency = document.getElementById('query-metric-latency');
  const queryMetricCpu = document.getElementById('query-metric-cpu');
  const queryMetricScan = document.getElementById('query-metric-scan');

  if (btnBeforeQuery && btnAfterQuery) {
    btnBeforeQuery.addEventListener('click', () => {
      btnBeforeQuery.classList.add('bg-rose-500/20', 'text-rose-400', 'border-rose-500/50');
      btnBeforeQuery.classList.remove('bg-slate-800/50', 'text-slate-400', 'border-slate-700');
      btnAfterQuery.classList.remove('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50');
      btnAfterQuery.classList.add('bg-slate-800/50', 'text-slate-400', 'border-slate-700');

      queryCodeContainer.innerHTML = `<span class="text-rose-400">// ❌ ANTES: Query sin índice con N+1 problem y Full Table Scan</span>
<span class="text-slate-400">SELECT * FROM orders </span>
<span class="text-amber-300">WHERE LOWER(user_email) LIKE '%@gmail.com'</span>
<span class="text-slate-400">ORDER BY created_at DESC;</span> 
<span class="text-slate-500">// Execution Plan: Seq Scan on orders (cost=0.00..18450.00 rows=45000)</span>`;

      queryMetricLatency.innerText = "840 ms";
      queryMetricLatency.className = "text-xl font-bold text-rose-400 font-mono-code";
      queryMetricCpu.innerText = "94%";
      queryMetricCpu.className = "text-xl font-bold text-rose-400 font-mono-code";
      queryMetricScan.innerText = "450,000 filas (Sequential Scan)";
    });

    btnAfterQuery.addEventListener('click', () => {
      btnAfterQuery.classList.add('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50');
      btnAfterQuery.classList.remove('bg-slate-800/50', 'text-slate-400', 'border-slate-700');
      btnBeforeQuery.classList.remove('bg-rose-500/20', 'text-rose-400', 'border-rose-500/50');
      btnBeforeQuery.classList.add('bg-slate-800/50', 'text-slate-400', 'border-slate-700');

      queryCodeContainer.innerHTML = `<span class="text-cyan-400">// ✅ DESPUÉS: Con índice Cover GIN/BTREE + Query reescrita</span>
<span class="text-slate-400">CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);</span>
<span class="text-slate-400">SELECT id, total_amount, status FROM orders </span>
<span class="text-cyan-300">WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days';</span>
<span class="text-slate-500">// Execution Plan: Index Scan using idx_orders_user_created (cost=0.42..8.44)</span>`;

      queryMetricLatency.innerText = "4 ms (-99.5%)";
      queryMetricLatency.className = "text-xl font-bold text-cyan-400 font-mono-code";
      queryMetricCpu.innerText = "3%";
      queryMetricCpu.className = "text-xl font-bold text-cyan-400 font-mono-code";
      queryMetricScan.innerText = "12 filas (Index Scan Only)";
    });
  }

  // --- 7. Lead Contact Form Handling ---
  const leadForm = document.getElementById('lead-form');
  const leadSubmitBtn = document.getElementById('lead-submit-btn');

  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('lead-name')?.value.trim();
      const email = document.getElementById('lead-email')?.value.trim();
      const company = document.getElementById('lead-company')?.value.trim();
      const challenge = document.getElementById('lead-challenge')?.value.trim();

      if (!name || !email || !challenge) {
        showToast("Por favor completa los campos obligatorios.", "error");
        return;
      }

      // Check corporate email basic filter warning
      const commonPublicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && commonPublicDomains.includes(domain)) {
        showToast("Sugerencia: Usa tu correo corporativo para atención prioritaria.", "error");
      }

      // Simulate loading state
      const originalText = leadSubmitBtn.innerHTML;
      leadSubmitBtn.disabled = true;
      leadSubmitBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>Procesando solicitud...</span>
      `;
      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        leadSubmitBtn.disabled = false;
        leadSubmitBtn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();

        // Reset form
        leadForm.reset();

        showToast("¡Solicitud enviada con éxito! Te contactaré en menos de 24 horas hábiles.", "success");
      }, 1500);
    });
  }

  // --- 8. Diagnostic Modal Form Handling ---
  const diagForm = document.getElementById('diagnostic-form');
  if (diagForm) {
    diagForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = diagForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Guardando agenda...`;
      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();

        closeModal(document.getElementById('diagnostic-modal'));
        diagForm.reset();

        showToast("Sesión de diagnóstico reservada preliminarmente. Revisa tu correo.", "success");
      }, 1400);
    });
  }

  // --- 9. Copy to Clipboard Utility ---
  window.copyToClipboard = function(text, label = "Información") {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copiada al portapapeles.`, "success");
      }).catch(() => {
        showToast("No se pudo copiar el texto.", "error");
      });
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showToast(`${label} copiada al portapapeles.`, "success");
    }
  };
});
