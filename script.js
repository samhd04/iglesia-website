// Configuración de Supabase
const SUPABASE_URL = "https://txbamiopuwcnpwtmwomk.supabase.co"; // ⚠️ CAMBIAR ESTO
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YmFtaW9wdXdjbnB3dG13b21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzODQ3NjksImV4cCI6MjA2NTk2MDc2OX0.kkm1kBWFvcciu8yISuB07k1E-pPgtnZpqKqp4176EVQ"; // ⚠️ CAMBIAR ESTO

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables Globales
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let events = [];
let faqData = [];

// Meses en español
const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Días de la semana en español
const dayHeaders = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Inicializar el sitio web
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando aplicación...");

  initializeNavigation();
  initializeCalendar();
  initializeFAQ();
  initializeGallery();
  updateFooterYear();

  // Verificar si el usuario está logueado
  await checkCurrentUser();

  // Cargar eventos desde Supabase
  await loadEvents();

  console.log("✅ Aplicación iniciada correctamente");
});

// ========== FUNCIONES DE AUTENTICACIÓN ==========

async function checkCurrentUser() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Obtener información adicional del usuario
      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && userData) {
        currentUser = userData;
        updateUIForLoggedInUser();
        console.log("👤 Usuario logueado:", currentUser.nombre);
      }
    }
  } catch (error) {
    console.error("Error verificando usuario:", error);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    console.log("🔐 Intentando login...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Obtener información adicional del usuario
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (userError) throw userError;

    currentUser = userData;
    updateUIForLoggedInUser();
    closeModal("loginModal");
    showMessage(`¡Bienvenido de nuevo, ${userData.nombre}!`, "success");

    await loadEvents(); // Recargar eventos
  } catch (error) {
    console.error("Error en login:", error);
    showMessage(error.message, "error");
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const role = document.getElementById("registerRole").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    showMessage("Las contraseñas no coinciden.", "error");
    return;
  }

  if (!validatePassword(password)) {
    showMessage("La contraseña no cumple con los requisitos.", "error");
    return;
  }

  try {
    console.log("📝 Registrando usuario...");

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Crear perfil en tabla usuarios
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .insert([
        {
          id: authData.user.id,
          nombre: name,
          email: email,
          password_hash: "handled_by_supabase_auth",
          rol: role,
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    currentUser = userData;
    updateUIForLoggedInUser();
    closeModal("registerModal");
    showMessage(`¡Bienvenido a Un Lugar de Él Para Ti, ${name}!`, "success");
  } catch (error) {
    console.error("Error en registro:", error);
    showMessage(error.message, "error");
  }
}

async function logout() {
  try {
    await supabase.auth.signOut();
    currentUser = null;

    // Resetear UI
    const loginLink = document.getElementById("loginLink");
    if (loginLink) {
      loginLink.textContent = "ingresar";
      loginLink.onclick = () => openModal("loginModal");
    }

    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
      dashboard.style.display = "none";
    }
    document.body.style.overflow = "auto";

    const eventActions = document.getElementById("eventActions");
    if (eventActions) {
      eventActions.style.display = "none";
    }

    showMessage("Has cerrado sesión.", "success");
    updateUpcomingEvents();
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    showMessage("Error al cerrar sesión", "error");
  }
}

// ========== FUNCIONES DE EVENTOS ==========

async function loadEvents() {
  try {
    console.log("📅 Cargando eventos...");

    const { data, error } = await supabase
      .from("eventos")
      .select(
        `
        *,
        creado_por:usuarios(nombre),
        confirmaciones_eventos(usuario_id)
      `
      )
      .eq("activo", true)
      .order("fecha_evento", { ascending: true });

    if (error) throw error;

    events = data.map((event) => ({
      id: event.id,
      title: event.titulo,
      date: event.fecha_evento,
      time: event.hora_evento,
      location: event.ubicacion,
      description: event.descripcion,
      audience: event.audiencia,
      createdBy: event.creado_por?.nombre || "Admin",
      rsvps: event.confirmaciones_eventos.map((r) => r.usuario_id),
    }));

    updateCalendar();
    updateUpcomingEvents();

    console.log(`✅ ${events.length} eventos cargados`);
  } catch (error) {
    console.error("Error cargando eventos:", error);
    showMessage("Error cargando eventos", "error");
  }
}

async function handleEventSubmit(event) {
  event.preventDefault();

  if (
    !currentUser ||
    (currentUser.rol !== "pastor" && currentUser.rol !== "lider")
  ) {
    showMessage("No tienes permisos para crear eventos.", "error");
    return;
  }

  const eventData = {
    titulo: document.getElementById("eventTitle").value,
    descripcion: document.getElementById("eventDescription").value,
    fecha_evento: document.getElementById("eventDate").value,
    hora_evento: document.getElementById("eventTime").value,
    ubicacion: document.getElementById("eventLocation").value,
    audiencia: document.getElementById("eventAudience").value,
    creado_por: currentUser.id,
  };

  try {
    console.log("➕ Creando evento...");

    const { data, error } = await supabase
      .from("eventos")
      .insert([eventData])
      .select();

    if (error) throw error;

    await loadEvents(); // Recargar eventos
    closeModal("eventModal");
    showMessage("¡Evento creado exitosamente!", "success");
    document.getElementById("eventForm").reset();
    await updateDashboardStats();
  } catch (error) {
    console.error("Error creando evento:", error);
    showMessage("Error creando evento", "error");
  }
}

async function rsvpEvent(eventId) {
  if (!currentUser) {
    openModal("loginModal");
    return;
  }

  try {
    console.log("✋ Confirmando asistencia...");

    const { data, error } = await supabase
      .from("confirmaciones_eventos")
      .upsert([
        {
          evento_id: eventId,
          usuario_id: currentUser.id,
          confirmado: true,
        },
      ])
      .select();

    if (error) {
      if (error.code === "23505") {
        showMessage("Ya has confirmado tu asistencia a este evento.", "info");
      } else {
        throw error;
      }
      return;
    }

    showMessage("¡Asistencia confirmada!", "success");
    await loadEvents(); // Recargar para actualizar conteos
  } catch (error) {
    console.error("Error confirmando asistencia:", error);
    showMessage("Error confirmando asistencia", "error");
  }
}

// ========== FUNCIONES DE PREGUNTAS FAQ ==========

async function submitQuestion(event) {
  event.preventDefault();

  const questionData = {
    nombre: document.getElementById("questionName").value,
    email: document.getElementById("questionEmail").value,
    pregunta: document.getElementById("questionText").value,
  };

  try {
    console.log("❓ Enviando pregunta...");

    const { data, error } = await supabase
      .from("preguntas_faq")
      .insert([questionData])
      .select();

    if (error) throw error;

    showMessage(
      "¡Gracias por tu pregunta! Te responderemos pronto.",
      "success"
    );
    document.getElementById("faqForm").reset();
    await updateDashboardStats();
  } catch (error) {
    console.error("Error enviando pregunta:", error);
    showMessage("Error enviando pregunta", "error");
  }
}

// ========== FUNCIONES DE FORMULARIO DE ASISTENTES ==========

async function submitAttendeeForm(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const attendeeData = {
    nombre_completo: formData.get("fullName"),
    email: formData.get("email"),
    tiene_congregacion: formData.get("congregation") === "si",
    tiene_discipulado: formData.get("discipleship") === "si",
    esta_bautizado: formData.get("baptized") === "si",
    peticion_oracion: formData.get("prayerRequest"),
    desea_contacto: formData.get("contact") === "si",
  };

  try {
    console.log("📋 Enviando formulario de asistente...");

    const { data, error } = await supabase
      .from("formularios_asistentes")
      .insert([attendeeData])
      .select();

    if (error) throw error;

    showMessage(
      "¡Gracias por tu información! Nos pondremos en contacto contigo pronto.",
      "success"
    );
    event.target.reset();
    await updateDashboardStats();
  } catch (error) {
    console.error("Error enviando formulario:", error);
    showMessage("Error enviando formulario", "error");
  }
}

// ========== FUNCIONES DEL DASHBOARD ==========

async function showDashboard() {
  if (!currentUser) {
    openModal("loginModal");
    return;
  }

  document.getElementById("dashboard").style.display = "block";
  document.body.style.overflow = "hidden";

  document.getElementById("dashboardUserName").textContent = currentUser.nombre;
  await updateDashboardStats();
}

async function updateDashboardStats() {
  try {
    // Contar eventos
    const { count: eventsCount } = await supabase
      .from("eventos")
      .select("*", { count: "exact", head: true })
      .eq("activo", true);

    // Contar preguntas pendientes
    const { count: questionsCount } = await supabase
      .from("preguntas_faq")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente");

    // Contar formularios no contactados
    const { count: formsCount } = await supabase
      .from("formularios_asistentes")
      .select("*", { count: "exact", head: true })
      .eq("contactado", false);

    document.getElementById("eventsCount").textContent = eventsCount || 0;
    document.getElementById("questionsCount").textContent = questionsCount || 0;
    document.getElementById("formsCount").textContent = formsCount || 0;
  } catch (error) {
    console.error("Error actualizando estadísticas:", error);
  }
}

// ========== FUNCIONES DE NAVEGACIÓN ==========

function initializeNavigation() {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navMenu.classList.remove("active");
    });
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.getAttribute("href").startsWith("#")) {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        scrollToSection(targetId.substring(1));
      }
    });
  });

  window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar");
    if (window.scrollY > 100) {
      navbar.style.background = "rgba(255, 255, 255, 0.95)";
      navbar.style.backdropFilter = "blur(10px)";
    } else {
      navbar.style.background = "var(--white)";
      navbar.style.backdropFilter = "none";
    }
  });
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// ========== FUNCIONES DEL CALENDARIO ==========

function initializeCalendar() {
  updateCalendar();
  updateUpcomingEvents();
}

function updateCalendar() {
  document.getElementById(
    "currentMonth"
  ).textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  // Agregar encabezados de días
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-header";
    dayHeader.textContent = day;
    calendar.appendChild(dayHeader);
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  // Agregar celdas vacías para días antes del primer día del mes
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day other-month";
    calendar.appendChild(emptyDay);
  }

  // Agregar días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = day;

    const currentDate = new Date(currentYear, currentMonth, day);

    // Verificar si es hoy
    if (currentDate.toDateString() === today.toDateString()) {
      dayElement.classList.add("today");
    }

    // Verificar si hay eventos en este día
    const hasEvent = events.some((event) => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === currentDate.toDateString();
    });

    if (hasEvent) {
      dayElement.classList.add("has-event");
    }

    dayElement.addEventListener("click", () => {
      showDayEvents(currentYear, currentMonth, day);
    });

    calendar.appendChild(dayElement);
  }
}

function changeMonth(direction) {
  currentMonth += direction;

  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }

  updateCalendar();
  updateUpcomingEvents();
}

function showDayEvents(year, month, day) {
  const selectedDate = new Date(year, month, day);
  const dayEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  if (dayEvents.length > 0) {
    const eventsList = dayEvents
      .map(
        (event) => `
      <div class="event-item">
        <h4>${event.title}</h4>
        <p><i class="fas fa-clock"></i> ${event.time}</p>
        <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
        <p><i class="fas fa-users"></i> ${event.audience}</p>
        <p>${event.description}</p>
        ${
          !currentUser
            ? '<button class="btn btn-primary" onclick="openModal(\'loginModal\')">ingresar para confirmar</button>'
            : `<button class="btn btn-primary" onclick="rsvpEvent('${event.id}')">confirmar asistencia</button>`
        }
      </div>
    `
      )
      .join("");

    showMessage(
      `Eventos para ${selectedDate.toLocaleDateString(
        "es-ES"
      )}:<br>${eventsList}`,
      "info"
    );
  } else {
    if (
      currentUser &&
      (currentUser.rol === "pastor" || currentUser.rol === "lider")
    ) {
      if (confirm("No hay eventos en este día. ¿Te gustaría agregar uno?")) {
        document.getElementById("eventDate").value = selectedDate
          .toISOString()
          .split("T")[0];
        openModal("eventModal");
      }
    } else {
      showMessage("No hay eventos programados para este día.", "info");
    }
  }
}

function updateUpcomingEvents() {
  const eventsList = document.getElementById("eventsList");
  const today = new Date();

  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  if (upcomingEvents.length === 0) {
    eventsList.innerHTML =
      '<p class="text-center">No hay eventos próximos programados.</p>';
    return;
  }

  eventsList.innerHTML = upcomingEvents
    .map(
      (event) => `
    <div class="event-item">
      <h4>${event.title}</h4>
      <p><i class="fas fa-calendar"></i> ${new Date(
        event.date
      ).toLocaleDateString("es-ES")}</p>
      <p><i class="fas fa-clock"></i> ${event.time}</p>
      <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
      <p><i class="fas fa-users"></i> ${event.audience}</p>
      <p>${event.description}</p>
      ${
        !currentUser
          ? '<button class="btn btn-primary" onclick="openModal(\'loginModal\')">ingresar para confirmar</button>'
          : `<button class="btn btn-primary" onclick="rsvpEvent('${event.id}')">confirmar asistencia</button>`
      }
    </div>
  `
    )
    .join("");
}

// ========== FUNCIONES DE FAQ ==========

function initializeFAQ() {
  faqData = [
    {
      question: "¿cuáles son los horarios de reunión?",
      answer:
        "Nos reunimos los domingos a las 10:00 AM y los miércoles a las 7:00 PM. También tenemos grupos pequeños durante la semana.",
    },
    {
      question: "¿tienen programas para niños?",
      answer:
        "¡Sí! Tenemos ministerio infantil durante todas nuestras reuniones, con actividades apropiadas para cada edad.",
    },
    {
      question: "¿cómo puedo involucrarme en el ministerio?",
      answer:
        "Hay muchas maneras de servir. Puedes hablar con nuestros líderes después de cualquier reunión o contactarnos directamente.",
    },
    {
      question: "¿ofrecen bautismo?",
      answer:
        "Sí, ofrecemos bautismo por inmersión. Es una decisión importante que celebramos con toda la comunidad.",
    },
    {
      question: "¿necesito ser miembro para participar?",
      answer:
        "¡Para nada! Todos son bienvenidos a participar en nuestras actividades y reuniones, sin importar su trasfondo.",
    },
  ];

  displayFAQ();
}

function displayFAQ() {
  const container = document.getElementById("faqContainer");
  container.innerHTML = "";

  faqData.forEach((faq, index) => {
    const faqItem = document.createElement("div");
    faqItem.className = "faq-item";
    faqItem.innerHTML = `
      <div class="faq-question" onclick="toggleFAQ(${index})">
        <h4>${faq.question}</h4>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="faq-answer">
        <p>${faq.answer}</p>
      </div>
    `;
    container.appendChild(faqItem);
  });
}

function toggleFAQ(index) {
  const faqItems = document.querySelectorAll(".faq-item");
  const currentItem = faqItems[index];
  const isActive = currentItem.classList.contains("active");

  faqItems.forEach((item) => {
    item.classList.remove("active");
    const icon = item.querySelector(".fa-chevron-down");
    icon.style.transform = "rotate(0deg)";
  });

  if (!isActive) {
    currentItem.classList.add("active");
    const icon = currentItem.querySelector(".fa-chevron-down");
    icon.style.transform = "rotate(180deg)";
  }
}

function searchFAQ() {
  const searchTerm = document.getElementById("faqSearch").value.toLowerCase();
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item
      .querySelector(".faq-question h4")
      .textContent.toLowerCase();
    const answer = item
      .querySelector(".faq-answer p")
      .textContent.toLowerCase();

    if (question.includes(searchTerm) || answer.includes(searchTerm)) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

// ========== FUNCIONES DE GALERÍA ==========

let currentGallerySlide = 0;

function initializeGallery() {
  const galleryItems = document.querySelectorAll(".gallery-item");
  const indicatorsContainer = document.getElementById("galleryIndicators");

  galleryItems.forEach((_, index) => {
    const indicator = document.createElement("div");
    indicator.className = `gallery-indicator ${index === 0 ? "active" : ""}`;
    indicator.addEventListener("click", () => goToGallerySlide(index));
    indicatorsContainer.appendChild(indicator);
  });

  setInterval(() => {
    changeGallerySlide(1);
  }, 6000);
}

function changeGallerySlide(direction) {
  const items = document.querySelectorAll(".gallery-item");
  const indicators = document.querySelectorAll(".gallery-indicator");

  items[currentGallerySlide].classList.remove("active");
  indicators[currentGallerySlide].classList.remove("active");

  currentGallerySlide += direction;

  if (currentGallerySlide >= items.length) {
    currentGallerySlide = 0;
  } else if (currentGallerySlide < 0) {
    currentGallerySlide = items.length - 1;
  }

  items[currentGallerySlide].classList.add("active");
  indicators[currentGallerySlide].classList.add("active");
}

function goToGallerySlide(index) {
  const items = document.querySelectorAll(".gallery-item");
  const indicators = document.querySelectorAll(".gallery-indicator");

  items[currentGallerySlide].classList.remove("active");
  indicators[currentGallerySlide].classList.remove("active");

  currentGallerySlide = index;

  items[currentGallerySlide].classList.add("active");
  indicators[currentGallerySlide].classList.add("active");
}

// ========== FUNCIONES DE MODAL ==========

function openModal(modalId) {
  document.getElementById(modalId).style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  document.body.style.overflow = "auto";
}

window.addEventListener("click", (event) => {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });
});

// ========== FUNCIONES DE UTILIDAD ==========

function showMessage(message, type) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.innerHTML = message;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.remove();
  }, 6000);
}

function validatePassword(password) {
  const requirements = {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };

  Object.keys(requirements).forEach((req) => {
    const element = document.getElementById(req);
    if (element) {
      element.classList.toggle("valid", requirements[req]);
    }
  });

  return Object.values(requirements).every((req) => req);
}

function updateUIForLoggedInUser() {
  if (!currentUser) return;

  const loginLink = document.getElementById("loginLink");
  if (loginLink) {
    loginLink.textContent = currentUser.nombre;
    loginLink.onclick = () => showDashboard();
  }

  if (currentUser.rol === "pastor" || currentUser.rol === "lider") {
    const eventActions = document.getElementById("eventActions");
    if (eventActions) {
      eventActions.style.display = "block";
    }
  }

  updateUpcomingEvents();
}

function updateFooterYear() {
  document.getElementById("currentYear").textContent = new Date().getFullYear();
}

// Validación de contraseña en tiempo real
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("registerPassword");
  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      validatePassword(this.value);
    });
  }
});

console.log("🎉 Script cargado completamente");
