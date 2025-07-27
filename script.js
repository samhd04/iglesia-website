// Variables Globales
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let events = [];
let faqData = [];
let questions = [];
let attendeeForms = [];
let predicas = [];
let __msgEl = null;
let __msgTimer = null;

const AREAS_SERVICIO = [
  "alabanza",
  "staff",
  "intercesión",
  "180°",
  "audiovisuales y medios",
  "kids"
];




// Obtener la fecha actual en UTC
const fechaUTC = new Date();

// Ajustar la hora a la zona horaria de Colombia (UTC-5)
const fechaColombia = new Date(fechaUTC.setHours(fechaUTC.getHours() - 5));

console.log("Fecha y hora en Colombia:", fechaColombia);

// Convertir a formato YYYY-MM-DD
const fechaColombiaFormato = fechaColombia.toISOString().split('T')[0];
console.log("Fecha en formato YYYY-MM-DD:", fechaColombiaFormato);

//Formatear fecha y hora
function formateaFecha(fechaISO){
  return new Date(fechaISO).toLocaleDateString("es-CO", { timeZone:"America/Bogota" });
}
function formateaHora(fechaISO){
  return new Date(fechaISO).toLocaleTimeString("es-CO", {
    timeZone:"America/Bogota",
    hour: "2-digit",
    minute: "2-digit"
  });
}




// Inicializa Supabase
const supabase = window.supabase.createClient(
    "https://lubryqwofitefnxpzoiu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YnJ5cXdvZml0ZWZueHB6b2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3Mjg5MTIsImV4cCI6MjA2NjMwNDkxMn0.-pytVRaCeMHV3ktvHJfhqxNjRIYZSh4h8sfigZhhmpk"
);

// 1) Función para traer el perfil (nombre + rol) y actualizar la UI
async function loadUserProfile(userId) {
    const { data: perfil, error } = await supabase
        .from("usuarios")
        .select("nombre, rol")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Error cargando perfil:", error);
        return;
    }

    // Graba en currentUser y muestra controles de admin
    currentUser = {
        id: userId,
        name: perfil.nombre,
        role: perfil.rol,
    };
    updateUIForLoggedInUser();
    initNotifInasistencias();

    
    
}

// 2) (Ya la tienes) Función que carga tus eventos
async function loadStoredData() {
    const { data: dbEvents, error: errEv } = await supabase
        .from("eventos")
        .select("*");
    if (!errEv) events = dbEvents;
    updateCalendar();
    updateUpcomingEvents();
}

// 3) Ahora tu listener de Auth puede invocar ambas sin error:
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        loadUserProfile(session.user.id);
        loadStoredData();
    } else {
        currentUser = null;
        updateUIForLoggedOutUser();
        initNotifInasistencias();
    }
});

(async () => {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) return;

    // recupera perfil + carga calendario
    await loadUserProfile(user.id);
    await loadStoredData();

    // si era admin **y** estaba en modo_panel, abre dashboard
    /*if (
        currentUser.role === "pastor" &&
        localStorage.getItem("modo_panel") === "activo"
    ) {
        showDashboard();
    }*/
})();

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
    initializeNavigation();
    initializeCalendar();
    initializeFAQ();
    initializeGallery();
    loadSampleData();
    updateFooterYear();

    // 1️⃣ Verificar sesión en Supabase
    const { data, error } = await supabase.auth.getSession();
    if (data.session) {
        const user = data.session.user;
        // 2️⃣ Traer perfil (nombre y rol)
        const { data: perfil } = await supabase
            .from("usuarios")
            .select("nombre, rol")
            .eq("id", user.id)
            .single();
        currentUser = { id: user.id, name: perfil.nombre, role: perfil.rol };
        updateUIForLoggedInUser();

    }

    // 3️⃣ Cargar datos guardados (eventos, FAQ, etc.)
    loadStoredData();
});

// Funciones de Navegación
function initializeNavigation() {
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");
    const navLinks = document.querySelectorAll(".nav-link");

    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navMenu.classList.toggle("active");
    });

    // Cerrar menú móvil al hacer clic en un enlace
    navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
        const isUserToggle = e.target.id === "userDropdownToggle";
        const isInsideUserMenu = e.target.closest("#userDropdownMenu");

        if (!isUserToggle && !isInsideUserMenu) {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
        }
    });
    });

    // Desplazamiento suave para enlaces de navegación
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            if (link.getAttribute("href").startsWith("#")) {
                e.preventDefault();
                const targetId = link.getAttribute("href");
                scrollToSection(targetId.substring(1));
            }
        });
    });

    // Efecto de scroll en navbar
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

// Funciones del Calendario
function initializeCalendar() {
    updateCalendar();
    updateUpcomingEvents();
}

function openNewEventModal(date) {
    const form = document.getElementById("eventForm");
    form.reset();
    delete form.dataset.editing;
    document.getElementById("eventDate").value = date;
    openModal("eventModal");
}
function updateUpcomingEvents() {
    const container = document.getElementById("upcomingEvents");
    container.innerHTML = "";

    // Tomamos los 3 primeros eventos futuros
    const items = events
        .filter((ev) => new Date(ev.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    if (items.length === 0) {
        container.innerHTML =
            '<p class="text-center">No hay eventos próximos programados.</p>';
        return;
    }

    items.forEach((ev) => {
        const div = document.createElement("div");
        div.className = "upcoming-item";
        div.innerHTML = `
      <h4>${ev.title}</h4>
      <p><i class="fas fa-calendar-alt"></i> ${new Date(
          ev.date
      ).toLocaleDateString("es-ES")}</p>
      <p><i class="fas fa-clock"></i> ${ev.time}</p>
      <p><i class="fas fa-map-marker-alt"></i> ${ev.location || ""}</p>
      <p><i class="fas fa-users"></i> ${ev.audience}</p>
    `;

        const btn = document.createElement("button");
        btn.className = "btn btn-primary";

        if (!currentUser) {
            // invitado
            btn.textContent = "ingresar para confirmar";
            btn.onclick = () => openModal("loginModal");
        } else if (currentUser.role !== "pastor") {
            // usuario normal
            btn.textContent = "confirmar asistencia";
            btn.onclick = () => rsvpEvent(ev.id);
        } else {
            // admin no ve botón
            btn.style.display = "none";
        }

        div.appendChild(btn);
        container.appendChild(div);
    });
}

function updateCalendar() {
    document.getElementById(
        "currentMonth"
    ).textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    // Encabezados
    dayHeaders.forEach((day) => {
        const header = document.createElement("div");
        header.className = "calendar-day-header";
        header.textContent = day;
        calendar.appendChild(header);
    });

    // Celdas vacías
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day other-month";
        calendar.appendChild(empty);
    }

    // Días con evento o no
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div");
        dayElement.className = "calendar-day";
        dayElement.textContent = day;

        const currentDate = new Date(currentYear, currentMonth, day);
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add("today");
        }
        if (
            events.some(
                (e) =>
                    new Date(e.date).toDateString() ===
                    currentDate.toDateString()
            )
        ) {
            dayElement.classList.add("has-event");
        }

        // **muestra el modal de ese día al hacer click**
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
    console.log("⟳ showDayEvents", year, month, day);

    // 1) Filtrar eventos del día
    const selectedDate = new Date(year, month, day);
    const key = selectedDate.toDateString();
    const dayEvents = events.filter(
        (ev) => new Date(ev.date).toDateString() === key
    );

    // 2) Abrir el modal de lista
    openModal("eventsModal");
    document.getElementById(
        "eventsModalTitle"
    ).textContent = `Eventos para ${selectedDate.toLocaleDateString("es-ES")}`;
    const listEl = document.getElementById("eventsList");
    listEl.innerHTML = "";

    // 4) Si hay eventos, los pintamos con sus botones
    dayEvents.forEach((ev) => {
        const item = document.createElement("div");
        item.className = "event-item";
        item.innerHTML = `
      <h4>${ev.title}</h4>
      <p><i class="fas fa-clock"></i> ${ev.time}</p>
      <p><i class="fas fa-map-marker-alt"></i> ${ev.location || ""}</p>
      <p><i class="fas fa-users"></i> ${ev.audience}</p>
      <p>${ev.description || ""}</p>
    `;

        const actions = document.createElement("div");
        actions.className = "event-actions";

        if (!currentUser) {
            // Invitado: cierra este modal y abre el login
            actions.innerHTML = `
        <button
          class="btn btn-primary"
          onclick="closeModal('eventsModal'); openModal('loginModal')"
        >
          ingresar para confirmar
        </button>
      `;
        } else if (currentUser.role === "pastor") {
            // Admin: editar / eliminar
            actions.innerHTML = `
        <button class="btn btn-secondary" onclick="editEvent('${ev.id}')">
          ✏️ Editar
        </button>
        <button class="btn btn-danger" onclick="deleteEvent('${ev.id}')">
          🗑 Eliminar
        </button>
      `;
        } else {
            // Usuario normal: RSVP
            actions.innerHTML = `
        <button class="btn btn-primary" onclick="rsvpEvent('${ev.id}')">
          ✅ Confirmar asistencia
        </button>
      `;
        }

        item.appendChild(actions);
        listEl.appendChild(item);
    });
}

// Funciones de FAQ
function initializeFAQ() {
    faqData = [
        {
            question: "¿Cuáles son los horarios de reunión?",
            answer: "Nos reunimos los domingos a las 9:30 AM. también tenemos reuniones grupales durante la semana.",
        },
        {
            question: "¿Tienen programas para niños?",
            answer: "¡Sí! tenemos ministerio infantil durante nuestras reuniones dominicales, con actividades apropiadas para cada edad.",
        },
        {
            question: "¿Cómo puedo involucrarme en el ministerio?",
            answer: "Hay muchas maneras de servir. puedes hablar con nuestros líderes después de cualquier reunión o contactarnos directamente.",
        },
        {
            question: "¿Ofrecen bautismo?",
            answer: "Sí, Acompañamos a los interesados en un proceso de conocer más sobre este importante paso en la vida de un cristiano",
        },
        {
            question: "¿Necesito ser miembro para participar?",
            answer: "¡Para nada! todos son bienvenidos a participar en nuestras actividades y reuniones, sin importar si están explorando la fe.",
        },
    ];

    displayFAQ();
}

// Funciones de la Galería
let currentGallerySlide = 0;

function initializeGallery() {
    const galleryItems = document.querySelectorAll(".gallery-item");
    const indicatorsContainer = document.getElementById("galleryIndicators");

    // Crear indicadores
    galleryItems.forEach((_, index) => {
        const indicator = document.createElement("div");
        indicator.className = `gallery-indicator ${
            index === 0 ? "active" : ""
        }`;
        indicator.addEventListener("click", () => goToGallerySlide(index));
        indicatorsContainer.appendChild(indicator);
    });

    // Auto-reproducción de la galería
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

    // Cerrar todos los elementos FAQ
    faqItems.forEach((item) => {
        item.classList.remove("active");
        const icon = item.querySelector(".fa-chevron-down");
        icon.style.transform = "rotate(0deg)";
    });

    // Abrir elemento clickeado si no estaba activo
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

// Envía la pregunta a la tabla 'preguntas' de Supabase
async function submitQuestion(event) {
    event.preventDefault();

    // 1️⃣ Prepara el objeto con los datos de la pregunta
    const questionData = {
        id: Date.now().toString(),
        name: document.getElementById("questionName").value.trim(),
        email: document.getElementById("questionEmail").value.trim(),
        question: document.getElementById("questionText").value.trim(),
        date: new Date().toISOString(),
        status: "pending",
    };

    // 2️⃣ Inserta en Supabase
    const { data, error } = await supabase
        .from("preguntas")
        .insert([questionData]);

    if (error) {
        // Muestra error si algo falla
        return showMessage(
            `Error al enviar pregunta: ${error.message}`,
            "error"
        );
    }

    // 3️⃣ Actualiza tu array local y la UI
    questions.unshift(questionData);
    updateDashboardStats();

    // 4️⃣ Notifica al usuario y limpia el formulario
    showMessage(
        "¡Gracias por tu pregunta! Te responderemos pronto.",
        "success"
    );
    document.getElementById("faqForm").reset();
}
// ========================
// 🔽 Función: cargar servidores en el <select>
// ========================
async function cargarServidoresEnSelect() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre")
    .eq("rol", "servidor");

  const select = document.getElementById("select-servidores");
  select.innerHTML = ""; // Limpiar contenido anterior

  if (error) {
    console.error("Error al cargar servidores:", error);
    return;
  }

  data.forEach((servidor) => {
    const option = document.createElement("option");
    option.value = servidor.id;
    option.textContent = servidor.nombre;
    select.appendChild(option);
  });
}

// Funciones de Modal
// Función para abrir el modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = "block";  // Muestra el modal
    document.body.style.overflow = "hidden";  // Desactiva el scroll en el fondo

    // Añadir un evento de clic para cerrar el modal cuando se haga clic fuera de él
    modal.addEventListener('click', function(event) {
        // Verificar si el clic es fuera del contenido del modal
        // Y solo cerrar si el modal no es el de login
        if (event.target === modal && modalId !== "loginModal") {
            closeModal(modalId);  // Cierra el modal si no es el loginModal
        }
    });
}

// Función para cerrar el modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = "none";  // Oculta el modal
    document.body.style.overflow = "auto";  // Restaura el scroll en el fondo
}



function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
    document.body.style.overflow = "auto";
}

// Cerrar modal al hacer clic fuera
window.addEventListener("click", (event) => {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
        if (event.target === modal) {
            modal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });
});

// Funciones de Autenticación
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) return showMessage("Email o contraseña inválidos.", "error");

    // Obtener rol y nombre del usuario
    const { data: perfil } = await supabase
        .from("usuarios")
        .select("nombre, rol")
        .eq("id", data.user.id)
        .single();

    currentUser = { id: data.user.id, name: perfil.nombre, role: perfil.rol };
    /*mostrarBotonNotificacionesSiUsuarioActivo();*/
    updateUIForLoggedInUser();
    await loadStoredData();
    updateCalendar();
    updateUpcomingEvents();
    closeModal("loginModal");
    showMessage(`¡Bienvenido de nuevo, ${perfil.nombre}!`, "success");


}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const role = "miembro";
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        return showMessage("Las contraseñas no coinciden.", "error");
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return showMessage(error.message, "error");

    // Insertar perfil con rol 'usuario' por defecto
    await supabase.from("usuarios").insert([
        {
            id: data.user.id,
            nombre: name,
            correo: email,
            rol: role,
        },
    ]);
    currentUser = { id: data.user.id, name: name, role: role };
    /*mostrarBotonNotificacionesSiUsuarioActivo();*/
    showMessage(`¡Registro exitoso, ${name}!`, "success");
    closeModal("registerModal");
    openModal("notificationModal");
}
async function toggleNotifications() {
    if (!currentUser || !currentUser.id) return;

    // Consultar el estado actual desde Supabase
    const { data, error } = await supabase
        .from("usuarios")
        .select("recibir_notificaciones")
        .eq("id", currentUser.id)
        .single();

    if (error || !data) {
        alert("No se pudo obtener tu estado de notificaciones.");
        return;
    }

    const nuevoEstado = !data.recibir_notificaciones;

    // Actualizar el nuevo estado
    const { error: updateError } = await supabase
        .from("usuarios")
        .update({ recibir_notificaciones: nuevoEstado })
        .eq("id", currentUser.id);

    if (updateError) {
        alert("No se pudo actualizar tu preferencia.");
    } else {
        updateNotificationToggleButton(nuevoEstado);
        alert(
            nuevoEstado
                ? "Activaste las notificaciones."
                : "Desactivaste las notificaciones."
        );
    }
}
function updateNotificationToggleButton(estado) {
    const btn = document.getElementById("notificationToggleBtn");
    if (btn) {
        btn.textContent = estado
            ? "Dejar de recibir notificaciones"
            : "Recibir notificaciones";
    }
}
async function mostrarBotonNotificacionesSiUsuarioActivo() {
    if (!currentUser || !currentUser.id) return;

    const contenedor = document.getElementById("notificationToggleContainer");
    const btn = document.getElementById("notificationToggleBtn");

    // Muestra el contenedor del botón
    contenedor.style.display = "block";

    // Consulta el estado actual del usuario
    const { data, error } = await supabase
        .from("usuarios")
        .select("recibir_notificaciones")
        .eq("id", currentUser.id)
        .single();

    if (!error && data) {
        updateNotificationToggleButton(data.recibir_notificaciones);
    } else {
        btn.textContent = "No disponible";
        btn.disabled = true;
    }
}

async function handleNotificationChoice(choice) {
    closeModal("notificationModal");

    if (!currentUser || !currentUser.id) return;

    const { error } = await supabase
        .from("usuarios")
        .update({ recibir_notificaciones: choice })
        .eq("id", currentUser.id);

    if (error) {
        alert("Hubo un problema al guardar tu preferencia.");
        console.error("Error al guardar notificación:", error);
    } else if (choice) {
        alert("¡Te avisaremos de los próximos eventos!");
    } else {
        console.log("El usuario prefirió no recibir notificaciones.");
    }
}

function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById("forgotEmail").value;

    // Simular envío de email de reset
    showMessage(
        `Se ha enviado un enlace de restablecimiento a ${email}`,
        "success"
    );
    closeModal("forgotPasswordModal");
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 10,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
    };

    // Actualizar indicadores de UI
    Object.keys(requirements).forEach((req) => {
        const element = document.getElementById(req);
        if (element) {
            element.classList.toggle("valid", requirements[req]);
        }
    });

    return Object.values(requirements).every((req) => req);
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

function updateUIForLoggedInUser() {
    if (!currentUser) return;

    const loginLink = document.getElementById("loginLink");
    const userDropdownToggle = document.getElementById("userDropdownToggle");
    const userDropdownContainer = document.getElementById(
        "userDropdownContainer"
    );
    const userDropdownMenu = document.getElementById("userDropdownMenu");

    // Oculta botón "Ingresar"
    if (loginLink) loginLink.style.display = "none";

    // Muestra nombre del usuario
    if (userDropdownToggle && userDropdownContainer && userDropdownMenu) {
        userDropdownToggle.textContent = currentUser.name;
        userDropdownContainer.style.display = "block";

        // Genera contenido dinámicamente
        let menuHTML = "";

        if (currentUser.role === "pastor") {
            menuHTML += `<a href="#" onclick="showDashboard()">Panel de control</a>`;
            menuHTML += `<a href="#" onclick="showRoleManager()">Gestionar roles</a>`;
            menuHTML += `<a href="#" onclick="openDevocionalForm()">Crear devocional</a>`;


        }

        if (currentUser.role === "servidor" || currentUser.role === "miembro" || currentUser.role === "pastor") {
            menuHTML += `<a href="#" id="verDevocionalBtn" onclick="viewDevocionalCreado()">Ver devocional</a>`;
        }

        if (["pastor", "líder", "servidor"].includes(currentUser.role)) {
            menuHTML += `<a href="#" onclick="abrirCalendarioServidores()">Calendario de Servidores</a>`;
        }



        // Subir prédica (para líderes y pastores)
        if (["pastor", "líder"].includes(currentUser.role)) {
            menuHTML += `<a href="#" onclick="openModal('uploadPredicaModal'); inicializarFormularioPredica();">Subir prédica</a>`;

        }

        // Ver prédicas (para todos)
        menuHTML += `<a href="#" onclick="abrirModalVerPredicas()">Ver prédicas</a>`;

        if (["pastor", "líder"].includes(currentUser.role)) {
        menuHTML += `<a href="#" onclick="abrirResultadosEncuesta()">Resultados</a>`;
        }


        /*if (currentUser.role !== "pastor") {
            menuHTML += `<a href="#" onclick="openModal('miembroModal')">Completar información</a>`;
            menuHTML += `<a href="#" onclick="abrirEncuestaSatisfaccion()">Encuesta de satisfacción</a>`;
        }*/
            menuHTML += `<a href="#" onclick="openModal('miembroModal')">Completar información</a>`;
            menuHTML += `<a href="#" onclick="abrirEncuestaSatisfaccion()">Encuesta de satisfacción</a>`;



        menuHTML += `<a href="#" onclick="cerrarSesion()">Cerrar sesión</a>`;
        userDropdownMenu.innerHTML = menuHTML;

        userDropdownToggle.onclick = function (e) {
            e.preventDefault();
            userDropdownMenu.style.display =
                userDropdownMenu.style.display === "block" ? "none" : "block";
        };

        // Oculta el menú si haces clic fuera
        document.addEventListener("click", function (e) {
            if (!userDropdownContainer.contains(e.target)) {
                userDropdownMenu.style.display = "none";
            }
        });
    }

    // Botón solo miembros
    if (currentUser.role === "miembro") {
        const contenedor = document.getElementById("botonMiembroContainer");
        if (contenedor) {
            contenedor.innerHTML = `
                <button class="btn btn-primary" onclick="openModal('miembroModal')">
                    completar información personal
                </button>
            `;
        }
    }


    // Mostrar botón crear evento solo para pastores
    const eventActions = document.getElementById("eventActions");
    if (eventActions) {
        eventActions.style.display =
            currentUser.role === "pastor" ? "block" : "none";
    }

    updateUpcomingEvents();
}

// 👇 Esto garantiza que se reintente mostrar el botón si aún no aparece
setTimeout(() => {
    if (
        currentUser &&
        currentUser.role === "miembro" &&
        document.getElementById("botonMiembroContainer")
    ) {
        const contenedor = document.getElementById("botonMiembroContainer");
        contenedor.innerHTML = `
      <button class="btn btn-primary" onclick="openModal('miembroModal')">
        completar información personal
      </button>
    `;
    }
}, 1000);

function updateUIForLoggedOutUser() {
    // 1) Oculta panel de control (dashboard)
    const dash = document.getElementById("dashboard");
    if (dash) dash.style.display = "none";

    // 2) Restaura scroll y oculta el modal si quedó abierto
    document.body.style.overflow = "auto";
    closeModal("eventModal");
    closeModal("loginModal");

    // 3) Oculta “Crear Evento”
    const evActions = document.getElementById("eventActions");
    if (evActions) evActions.style.display = "none";

    // 4) Ajusta nav para mostrar “Ingresar” en lugar de usuario/admin
    const loginLink = document.getElementById("loginLink");
    if (loginLink) {
        loginLink.textContent = "Ingresar";
        loginLink.onclick = () => openModal("loginModal");
    }

    // 5) Pinta de nuevo el calendario y próximos eventos
    updateCalendar();
    updateUpcomingEvents();
}

async function logout() {
    // 1) Llamada a Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
        return showMessage(`Error cerrando sesión: ${error.message}`, "error");
    }

    // 2) Limpia estado
    currentUser = null;

    // 3) Restablece UI pública
    updateUIForLoggedOutUser();

    // 4) Mensaje al usuario
    showMessage("Has cerrado sesión correctamente.", "success");
}

// Funciones del Dashboard
async function showDashboard() {
    if (!currentUser) {
        openModal("loginModal");
        return;
    }

    document.getElementById("calendarView").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.body.style.overflow = "hidden";

    document.getElementById("dashboardUserName").textContent = currentUser.name;

    // Refresca los contadores desde la BD
    await loadAdminData();

    localStorage.setItem("modo_panel", "activo");
}

function showLogOut() {
    openModal("logOutModal");
    return;
}

function updateDashboardStats() {
    document.getElementById("eventsCount").textContent = events.length;
    document.getElementById("questionsCount").textContent = questions.length;
    document.getElementById("formsCount").textContent = attendeeForms.length;
}

async function loadAdminData() {
    // Eventos
    let { count: cntEv } = await supabase
        .from("eventos")
        .select("*", { count: "exact" });
    document.getElementById("eventsCount").textContent = cntEv;

    // Preguntas
    let { count: cntQ } = await supabase
        .from("preguntas")
        .select("*", { count: "exact" });
    document.getElementById("questionsCount").textContent = cntQ;

    // Formularios
    let { count: cntF } = await supabase
        .from("asistentes")
        .select("*", { count: "exact" });
    document.getElementById("formsCount").textContent = cntF;

    // Preguntas
    const { data: preguntas, error } = await supabase
        .from("preguntas")
        .select("*")
        .order("date", { ascending: false });

    const contenedor = document.getElementById("listaPreguntas");
    contenedor.innerHTML = "";

    if (error || !preguntas || preguntas.length === 0) {
        contenedor.innerHTML = "<p>No hay preguntas registradas.</p>";
        return;
    }

    preguntas.forEach((p) => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "pregunta-card";
        tarjeta.innerHTML = `
      <p><strong>${p.name}</strong> — ${p.email}</p>
      <p><em>${new Date(p.date).toLocaleString()}</em></p>
      <p>${p.question}</p>
      <textarea id="respuesta-${p.id}" placeholder="Escribe una respuesta...">${
            p.respuesta || ""
        }</textarea>
      <button class="btn btn-primary" onclick="responderPregunta('${
          p.id
      }')">Guardar respuesta</button>
    `;
        contenedor.appendChild(tarjeta);
    });
}

// Funciones de Gestión de Eventos
async function handleEventSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const editingId = form.dataset.editing; // si existe, venimos de un edit

    // 1) Lee los campos del formulario
    const title = form.eventTitle.value.trim();
    const date = form.eventDate.value; // ISO yyyy-mm-dd
    const time = form.eventTime.value; // hh:mm
    const location = form.eventLocation.value.trim();
    const audience = form.eventAudience.value;
    const description = form.eventDescription.value.trim();

    // 2) Prepara el objeto común de datos
    const eventData = { title, date, time, location, audience, description };

    if (editingId) {
        // —————— EDITAR EVENTO EXISTENTE ——————
        const { error } = await supabase
            .from("eventos")
            .update(eventData)
            .eq("id", editingId);

        if (error) {
            return showMessage(
                `Error al actualizar: ${error.message}`,
                "error"
            );
        }

        // Sincroniza tu array local para reflejar la edición
        events = events.map((ev) =>
            ev.id === editingId ? { ...ev, ...eventData } : ev
        );

        delete form.dataset.editing;
        showMessage("Evento actualizado", "success");
    } else {
        // —————— CREAR NUEVO EVENTO ——————

        // 3) Genera un ID único para el nuevo evento
        const newId = Date.now().toString();

        // 4) Verifica que exista currentUser.id
        if (!currentUser || !currentUser.id) {
            return showMessage(
                "Debes iniciar sesión para crear eventos",
                "error"
            );
        }

        // 5) Construye el objeto que vas a insertar
        const newEvent = {
            id: newId,
            ...eventData,
            createdby: currentUser.id, // ↪ se inserta en la columna `createdby` (uuid NOT NULL)
        };

        // 6) Inserta en Supabase
        const { error } = await supabase.from("eventos").insert([newEvent]);

        if (error) {
            return showMessage(`Error al crear: ${error.message}`, "error");
        }

        // 7) Añade al array local para que el calendario se refresque
        events.unshift(newEvent);
        showMessage("Evento creado", "success");
    }

    // 8) Refresca la UI: calendario, lista de próximos eventos y stats
    updateCalendar();
    updateUpcomingEvents();
    updateDashboardStats();

    // 9) Cierra modal y limpia form
    closeModal("eventModal");
    form.reset();
}

function editEvent(id) {
    // 2.a) Solo admin
    if (!currentUser || currentUser.role !== "pastor") {
        return showMessage("No tienes permisos para editar", "error");
    }

    // 2.b) Busca el evento y carga el form
    const ev = events.find((e) => e.id === id);
    if (!ev) return showMessage("Evento no encontrado", "error");

    const form = document.getElementById("eventForm");
    form.eventTitle.value = ev.title;
    form.eventDate.value = ev.date;
    form.eventTime.value = ev.time;
    form.eventLocation.value = ev.location;
    form.eventAudience.value = ev.audience;
    form.eventDescription.value = ev.description;

    // Marca modo edición
    form.dataset.editing = id;

    openModal("eventModal");
}

// Formulario de Asistentes via Supabase
async function submitAttendeeForm(event) {
    event.preventDefault();

    // Recoger todos los campos del formulario
    const form = event.target;
    const entries = Object.fromEntries(new FormData(form).entries());
    const attendeeData = {
        id: Date.now().toString(),
        fullname: entries.fullname.trim(),
        email: entries.email.trim(),
        congregation: entries.congregation,
        discipleship: entries.discipleship,
        baptized: entries.baptized,
        prayerrequest: entries.prayerrequest.trim(),
        contact: entries.contact,
        date: new Date().toISOString(),
    };

    // Insertar en la tabla 'asistentes' de Supabase
    const { data, error } = await supabase
        .from("asistentes")
        .insert([attendeeData]);

    if (error) {
        // 3️⃣ Manejo de error
        return showMessage(
            `Error al guardar tu información: ${error.message}`,
            "error"
        );
    }

    // Actualizar estado local y UI
    attendeeForms.unshift(attendeeData);
    updateDashboardStats();

    // Informar al usuario y limpiar el formulario
    showMessage(
        "¡Gracias por tu información! Nos pondremos en contacto pronto.",
        "success"
    );
    form.reset();
}

// Funciones de Utilidad
//Mostrar mensajes
function showMessage(message, type = "info", ms = 6000) {
  // Cerrar el anterior si existe
  if (__msgEl) {
    clearTimeout(__msgTimer);
    __msgEl.remove();
    __msgEl = null;
  }

  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.innerHTML = message; // usa textContent si no quieres HTML

  document.body.appendChild(div);

  // Guarda referencias para poder cerrar el próximo
  __msgEl = div;
  __msgTimer = setTimeout(() => {
    div.remove();
    if (__msgEl === div) __msgEl = null;
  }, ms);
}

async function loadSampleData() {
    // 1) Trae los eventos de Supabase
    const { data: dbEvents, error } = await supabase
        .from("eventos")
        .select("*");

    // 3) Si hay error, vacía el array; si no, úsalo
    if (error) {
        console.error("Error cargando eventos:", error);
        events = [];
    } else {
        events = dbEvents;
    }

    // 4) Finalmente refresca el calendario y la lista de próximos eventos
    updateCalendar();
    updateUpcomingEvents();
}

function updateFooterYear() {
    document.getElementById("currentYear").textContent =
        new Date().getFullYear();
}

// Inicializar todo cuando la página se carga
document.addEventListener("DOMContentLoaded", () => {
    console.log("¡sitio web de un lugar de él para ti cargado exitosamente!");
});

function editEvent(id) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return showMessage("Evento no encontrado", "error");
    if (currentUser.role !== "pastor")
        return showMessage("Sin permisos", "error");

    const form = document.getElementById("eventForm");
    form.eventTitle.value = ev.title;
    form.eventDate.value = ev.date;
    form.eventTime.value = ev.time;
    form.eventLocation.value = ev.location;
    form.eventAudience.value = ev.audience;
    form.eventDescription.value = ev.description;

    form.dataset.editing = id;
    closeModal("eventsModal");
    openModal("eventModal");
}

async function deleteEvent(id) {
    if (currentUser.role !== "pastor")
        return showMessage("Sin permisos", "error");

    if (!confirm("¿Eliminar este evento?")) return;
    const { error } = await supabase.from("eventos").delete().eq("id", id);
    if (error) return showMessage(`Error: ${error.message}`, "error");

    events = events.filter((e) => e.id !== id);
    updateCalendar();
    updateUpcomingEvents();
    updateDashboardStats();
    showMessage("Evento eliminado", "success");
}

// 1) Asocia clicks
document.querySelectorAll(".admin-card").forEach((card) => {
    card.addEventListener("click", () => {
        loadAdminData();
        // muestra el contenedor padre
        document.getElementById("adminDetails").classList.remove("hidden");
        // 2) ocultar y mostrar paneles como ya tienes
        const sec = card.dataset.section;
        document
            .querySelectorAll(".details-panel")
            .forEach((d) => d.classList.add("hidden"));
        document.getElementById(sec).classList.remove("hidden");
        // 3) cargar registros…
        if (sec === "eventsDetails") loadEventsList();
        if (sec === "questionsDetails") loadQuestionsList();
        if (sec === "formsDetails") loadFormsList();
    });
});

async function loadEventsList() {
    const { data: evs, error } = await supabase
        .from("eventos")
        .select("id, title, date, time, location")
        .order("date", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error cargando eventos:", error);
        return;
    }
    const container = document.getElementById("eventsCards");
    container.innerHTML = "";
    evs.forEach((ev) => {
        const card = document.createElement("div");
        card.className = "card-panel hoverable record-card";
        card.innerHTML = `
      <h6>${ev.title}</h6>
      <p><strong>Fecha:</strong> ${ev.date} <strong>Hora:</strong> ${ev.time}</p>
      <p><strong>Lugar:</strong> ${ev.location}</p>
    `;
        container.appendChild(card);
    });
}

async function loadQuestionsList() {
    const { data: qs, error } = await supabase
        .from("preguntas")
        .select("id, name, email, question, date, status")
        .order("date", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error cargando preguntas:", error);
        return;
    }
    const container = document.getElementById("questionsCards");
    container.innerHTML = "";
    qs.forEach((q) => {
        const card = document.createElement("div");
        card.className = "card-panel hoverable record-card";
        card.innerHTML = `
      <p><strong>${q.name}</strong> &lt;${q.email}&gt;</p>
      <p>${q.question}</p>
      <p class="small">
        ${new Date(q.date).toLocaleString()} — <em>${q.status}</em>
      </p>
    `;
        container.appendChild(card);
    });
}

async function loadFormsList() {
    const { data: fs, error } = await supabase
        .from("asistentes")
        .select(
            "id, fullname, email, congregation, discipleship, baptized, prayerrequest, contact, date"
        )
        .order("date", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error cargando asistentes:", error);
        return;
    }
    const container = document.getElementById("formsCards");
    container.innerHTML = "";
    fs.forEach((f) => {
        const card = document.createElement("div");
        card.className = "card-panel hoverable record-card";
        card.innerHTML = `
      <p><strong>${f.fullname}</strong> &lt;${f.email}&gt;</p>
      <p>Congregación: ${f.congregation}</p>
      <p>Bautizado: ${f.baptized} — Discipulado: ${f.discipleship}</p>
      <p>Solicitud: ${f.prayerrequest || "–"}</p>
      <p class="small">${new Date(f.date).toLocaleString()}</p>
    `;
        container.appendChild(card);
    });
}

document.getElementById("backToDashboard").addEventListener("click", () => {
    localStorage.removeItem("modo_panel");
    // 1) Oculta el bloque de detalles
    document.getElementById("adminDetails").classList.add("hidden");

    // 2) Oculta TODO el dashboard
    document.getElementById("dashboard").style.display = "none";

    // 3) (Re)Muestra tu calendario
    //    Asegúrate de que el contenedor de tu calendario tenga un id,
    //    por ejemplo <div id="calendarView" class="calendar-container">…
    document.getElementById("calendarView").style.display = "block";

    // 4) Restaura scroll del body
    document.body.style.overflow = "auto";
});

async function guardarInformacionMiembro(e) {
    e.preventDefault();
    const { data, error } = await supabase.auth.getUser();

    if (error) return showMessage(error.message, "error");

    const form = e.target;
    const data2 = {
        id: data.user.id,
        id_usuario: data.user.id,
        nombre_completo: form.nombre_completo.value,
        documento: form.documento.value,
        edad: form.edad.value,
        genero: form.genero.value,
        telefono: form.telefono.value,
        correo: form.correo.value,
        direccion: form.direccion.value,
        estado_civil: form.estado_civil.value,
        familia_en_iglesia: form.familia_en_iglesia.value,
        tiene_hijos: form.tiene_hijos.value,
        historial_otras_iglesias: form.historial_otras_iglesias.value,
        bautismo: form.bautismo.value,
        motivo_visita: form.motivo_visita.value,
        necesidades_especificas: form.necesidades_especificas.value,
        area_interes: form.area_interes.value,
        rol: "miembro",
    };

    const { error2 } = await supabase.from("miembros").insert([data2]);
    if (error2) {
        alert("Error al guardar: " + error.message);
    } else {
        showMessage("Información guardada correctamente.", "success");
        closeModal("miembroModal");
        form.reset();
    }
}

async function cerrarSesion() {
    await supabase.auth.signOut();
    currentUser = null;
    localStorage.removeItem("modo_panel");

    showMessage("Has cerrado sesión correctamente.", "success");

    setTimeout(() => {
        location.reload();
    }, 1000); // Espera 1 segundo para que el usuario vea el mensaje
}

async function responderPregunta(id) {
    const respuesta = document.getElementById(`respuesta-${id}`).value;
    
    // 1. Actualiza la pregunta en Supabase
    const { data: pregunta, error: updateError } = await supabase
        .from("preguntas")
        .update({ 
            respuesta: respuesta, 
            status: "respondida",
            fecha_respuesta: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
        alert("Error al guardar la respuesta.");
        return;
    }

    // 2. Envía el correo al usuario
    try {
        const emailParams = {
            to_email: pregunta.email,
            to_name: pregunta.name,
            question: pregunta.question,
            answer: respuesta,
            response_date: new Date().toLocaleDateString('es-ES')
        };

        await emailjs.send(
            'TU_SERVICE_ID_DE_EMAILJS', 
            'TU_TEMPLATE_ID_DE_EMAILJS', 
            emailParams
        );
        
        alert("Respuesta guardada y correo enviado correctamente.");
    } catch (emailError) {
        console.error("Error enviando el correo:", emailError);
        alert("Respuesta guardada, pero hubo un problema enviando el correo.");
    }
}

function mostrarFormularioRecuperacion() {
    closeModal("loginModal");
    openModal("recuperarModal");
}

async function enviarCorreoRecuperacion() {
    const email = document.getElementById("recuperarEmail").value;
    if (!email) {
        alert("Por favor ingresa un correo.");
        return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://iglesia-website.vercel.app/cambiar-clave.html",
    });

    if (error) {
        alert("Error al enviar el correo: " + error.message);
        return;
    }

    alert(
        "Se ha enviado un correo de recuperación. Revisa tu bandeja de entrada."
    );
    closeModal("recuperarModal");
}

function showRoleManager() {
    if (!currentUser) {
        openModal("loginModal");
        return;
    }

    document.getElementById("dashboard").style.display = "none";
    document.getElementById("roleManager").style.display = "block";
    document.body.style.overflow = "hidden";

    document.getElementById("roleManagerUserName").textContent = currentUser.name;


    loadRoles();
}

/*async function showDashboard() {
    if (!currentUser) {
        openModal("loginModal");
        return;
    }

    document.getElementById("calendarView").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.body.style.overflow = "hidden";

    document.getElementById("dashboardUserName").textContent = currentUser.name;

    // Refresca los contadores desde la BD
    await loadAdminData();

    localStorage.setItem("modo_panel", "activo");
}*/



function volverDesdeRoles() {
    document.getElementById("roleManager").style.display = "none";
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("calendarView").style.display = "block";
    document.body.style.overflow = "auto";
}


async function loadRoles() {
    const { data: usuarios, error } = await supabase
        .from("usuarios")
        .select("id, nombre, rol");

    const roles = ["miembro", "servidor", "líder", "pastor"];

    roles.forEach(r => {
        const ul = document.getElementById(`list-${r}`);
        if (ul) ul.innerHTML = "";
    });

    usuarios.forEach(user => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${user.nombre}
            <select onchange="cambiarRol('${user.id}', this.value)">
                ${roles.map(r =>
                    `<option value="${r}" ${r === user.rol ? "selected" : ""}>${r}</option>`
                ).join("")}
            </select>
        `;
        const contenedor = document.getElementById(`list-${user.rol}`);
        if (contenedor) contenedor.appendChild(li);
    });
}

async function cambiarRol(userId, nuevoRol) {
    const { error } = await supabase
        .from("usuarios")
        .update({ rol: nuevoRol })
        .eq("id", userId);

    if (error) {
        alert("❌ Error al cambiar el rol");
    } else {
        loadRoles(); // Refrescar listas
    }
}

function addDropdownButton(text, onClick) {
    const btn = document.createElement("button");
    btn.className = "dropdown-item";
    btn.innerText = text;
    btn.onclick = onClick;
    document.getElementById("userDropdownMenu").appendChild(btn);
}

async function cargarPredicas() {
    console.log("🔁 Ejecutando cargarPredicas");

    const { data, error } = await supabase
        .from("predicas")
        .select("*")
        .order("fecha", { ascending: false });

    if (!error) {
        predicas = data;
        filtrarPredicas();
    }

    console.log("✅ Prédicas cargadas:", data);

  predicas = data;
  filtrarPredicas();
}

function filtrarPredicas() {
    const nombre = document.getElementById("filtroNombre").value.toLowerCase();
    const serie = document.getElementById("filtroSerie").value.toLowerCase();
    const fecha = document.getElementById("filtroFecha").value;

    const resultados = predicas.filter(p =>
        (!nombre || p.nombre.toLowerCase().includes(nombre)) &&
        (!serie || p.serie?.toLowerCase().includes(serie)) &&
        (!fecha || p.fecha === fecha)
    );

    const contenedor = document.getElementById("listaPredicas");
    contenedor.innerHTML = "";

    resultados.forEach(p => {
        const div = document.createElement("div");
        div.className = "predica-item";
        div.innerHTML = `
            <strong>${p.nombre}</strong> (${p.fecha})<br>
            <em>${p.serie || "Sin serie"}</em><br>
            <a href="${p.archivo_url}" download="${p.archivo_nombre}" target="_blank">📥 Descargar</a>
            ${(currentUser?.id === p.autor_id || currentUser?.role === 'pastor') ? `
                <button onclick="borrarPredica('${p.id}')">🗑 Eliminar</button>` : ""}
        `;
        contenedor.appendChild(div);
    });
}

async function borrarPredica(id) {
    if (!confirm("¿Eliminar esta prédica?")) return;

    console.log("🟡 Buscando prédica con id:", id);

    // Paso 1: obtener la prédica
    const { data: predica, error: fetchError } = await supabase
        .from("predicas")
        .select("archivo_url, archivo_nombre")
        .eq("id", id)
        .single();

    if (fetchError || !predica) {
        console.error("❌ No se pudo obtener la prédica:", fetchError);
        return mostrarMensaje("❌ No se pudo obtener la prédica", "error");
    }

    console.log("📄 Datos obtenidos de la prédica:", predica);

    // Paso 2: extraer nombre del archivo
    const archivoNombre = predica.archivo_url.split("/").pop();
    console.log("🧾 Nombre del archivo a eliminar:", archivoNombre);

    // Paso 3: eliminar archivo del bucket
    const { error: deleteFileError } = await supabase.storage
        .from("predicasarchivos")
        .remove([archivoNombre]);

    if (deleteFileError) {
        console.error("❌ Error al eliminar archivo del storage:", deleteFileError);
    } else {
        console.log("✅ Archivo eliminado del bucket correctamente");
    }

    // Paso 4: eliminar registro de la base de datos
    const { error: deleteDbError } = await supabase
        .from("predicas")
        .delete()
        .eq("id", id);

    if (deleteDbError) {
        console.error("❌ Error al eliminar el registro de la BD:", deleteDbError);
        return mostrarMensaje("❌ No se pudo eliminar de la base de datos", "error");
    }

    console.log("✅ Registro eliminado de la base de datos");
    showMessage("✅ Prédica eliminada correctamente", "success");
    cargarPredicas();
}







function mostrarMensaje(texto, tipo = "success") {
    const div = document.createElement("div");
    div.textContent = texto;
    div.style.background = tipo === "success" ? "#4caf50" : "#f44336";
    div.style.color = "white";
    div.style.padding = "12px 18px";
    div.style.marginTop = "10px";
    div.style.borderRadius = "8px";
    div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    div.style.fontSize = "15px";
    div.style.fontFamily = "Arial, sans-serif";

    const contenedor = document.getElementById("mensajeEstado");
    contenedor.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 4000);
}


function inicializarFormularioPredica() {
    const uploadForm = document.getElementById("uploadForm");
    if (!uploadForm || uploadForm.dataset.init === "true") return;

    uploadForm.dataset.init = "true"; // evita doble carga

    uploadForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const archivo = uploadForm.archivo?.files?.[0];
        if (!archivo) return mostrarMensaje("❌ Selecciona un archivo", "error");

        // Validación opcional del tipo de archivo
        const tiposPermitidos = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
            "application/vnd.ms-powerpoint" // .ppt
        ];
        if (!tiposPermitidos.includes(archivo.type)) {
            return showMessage("❌ Tipo de archivo no permitido", "error");
        }

        const nombre = uploadForm.nombre_predica.value.trim();
        const serie = uploadForm.serie.value.trim();
        const fecha = uploadForm.fecha.value;
        const ext = archivo.name.split(".").pop();
        const filename = `predica-${Date.now()}.${ext}`;

        // Subir archivo
        console.log("📂 Archivo a subir:", archivo);

        const { error: uploadError } = await supabase.storage
            .from("predicasarchivos")
            .upload(filename, archivo, {
                cacheControl: "3600",
                upsert: true
            });

        if (uploadError) {
            console.error("❌ Error subiendo archivo:", uploadError);
            return mostrarMensaje("❌ Error subiendo archivo", "error");
        }

        // Obtener URL pública
        const { data: urlData, error: urlError } = await supabase.storage
            .from("predicasarchivos")
            .getPublicUrl(filename);

        if (urlError || !urlData?.publicUrl) {
            console.error("❌ Error obteniendo URL pública:", urlError);
            return mostrarMensaje("❌ No se pudo obtener URL del archivo", "error");
        }

        const publicUrl = urlData.publicUrl;

        // Insertar en la tabla
        const { error: insertError } = await supabase.from("predicas").insert([{
            nombre,
            serie,
            fecha,
            archivo_url: publicUrl,
            archivo_nombre: archivo.name,
            autor_id: currentUser.id,
        }]);

        if (insertError) {
            console.error("❌ Error insertando en la base de datos:", insertError);
            return mostrarMensaje("❌ Error guardando datos", "error");
        }

        showMessage("✅ Prédica subida exitosamente", "success");
        closeModal("uploadPredicaModal");
        uploadForm.reset();
        cargarPredicas();
    });
}

function limpiarFiltros() {
    document.getElementById("filtroNombre").value = "";
    document.getElementById("filtroSerie").value = "";
    document.getElementById("filtroFecha").value = "";
    filtrarPredicas();
}

function verTodasLasPredicas() {
  document.getElementById("filtroNombre").value = "";
  document.getElementById("filtroSerie").value = "";
  document.getElementById("filtroFecha").value = "";
  filtrarPredicas();
}

function abrirModalVerPredicas() {
  console.log("✅ abrirModalVerPredicas fue llamado");
  cargarPredicas(); // Asegura que los datos estén listos
  openModal("verPredicasModal"); // Abre el modal
}


function abrirEncuestaSatisfaccion() {
  const modal = document.getElementById("encuestaModal");
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }
}

function cerrarEncuestaSatisfaccion() {
  const modal = document.getElementById("encuestaModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}


async function enviarEncuesta() {
event.preventDefault();
  console.log("➡ Enviando encuesta...");

  const asistencia = document.querySelector('input[name="asistencia"]:checked')?.value;
  const experiencia = document.querySelector('input[name="experiencia"]:checked')?.value;
  const pastor = document.querySelector('input[name="pastor"]:checked')?.value;
  const servicio = document.querySelector('input[name="servicio"]:checked')?.value;
  const ubicacion = document.querySelector('input[name="ubicacion"]:checked')?.value;
  const ambiente = document.querySelector('input[name="ambiente"]:checked')?.value;
  const mejoras = document.getElementById("mejoras").value.trim();
  const comentarios = document.getElementById("comentarioEncuesta").value.trim();

  if (!asistencia || !experiencia || !pastor || !servicio || !ubicacion || !ambiente || !mejoras) {
    alert("⚠️ Por favor, completa todos los campos obligatorios.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("encuestas_satisfaccion")
      .insert([
        {
          asistencia,
          experiencia,
          pastor,
          servicio,
          ubicacion,
          ambiente,
          mejoras,
          comentarios, // <- ya corregido
        },
      ]);

    if (error) {
  console.error("❌ Error guardando encuesta:", error.message, error.details);
  showMessage("Hubo un error al enviar la encuesta. Inténtalo de nuevo.", "error.");
}else {
      console.log("✅ Encuesta guardada:", data);
      showMessage("✅ ¡Gracias por responder la encuesta!","success");
      document.getElementById("encuestaModal").style.display = "none";
    }
  } catch (e) {
    console.error("💥 Error inesperado:", e);
    showMessage("Error inesperado al enviar la encuesta.", "error.");
  }
}

async function abrirRetroalimentacion() {

console.log("📊 Abriendo resumen de encuestas...");
  /*document.getElementById("calendarView").style.display = "none";*/
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("retroalimentacionPanel").style.display = "block";
  document.body.style.overflow = "auto";

  const { data, error } = await supabase.from("encuestas_satisfaccion").select("*");

  if (error) {
    console.error("Error obteniendo encuestas:", error);
    alert("❌ No se pudo cargar la retroalimentación.");
    return;
  }

  mostrarTablaEncuestas(data);
  mostrarResumenEstadistico(data);
}

function cerrarRetroalimentacion() {
  document.getElementById("retroalimentacionPanel").style.display = "none";
  /*document.getElementById("calendarView").style.display = "block";*/
  document.body.style.overflow = "auto";
}

function mostrarTablaEncuestas(data) {
  const contenedor = document.getElementById("tablaEncuestas");
  if (data.length === 0) {
    contenedor.innerHTML = "<p>No hay encuestas registradas.</p>";
    return;
  }

  let html = "<table class='highlight'><thead><tr>";
  html += "<th>Asistencia</th><th>Experiencia</th><th>Pastor</th><th>Servicio</th><th>Ubicación</th><th>Ambiente</th><th>Mejoras</th><th>Comentarios</th>";
  html += "</tr></thead><tbody>";

  for (const row of data) {
    html += `<tr>
      <td>${row.asistencia}</td>
      <td>${row.experiencia}</td>
      <td>${row.pastor}</td>
      <td>${row.servicio}</td>
      <td>${row.ubicacion}</td>
      <td>${row.ambiente}</td>
      <td>${row.mejoras}</td>
      <td>${row.comentarios || ''}</td>
    </tr>`;
  }

  html += "</tbody></table>";
  contenedor.innerHTML = html;
}

function mostrarResumenEstadistico(data) {
  const resumen = document.getElementById("resumenEstadisticas");

  const contar = (campo, valor) => data.filter((d) => d[campo] === valor).length;

  const total = data.length;
  const resumenHTML = `
    <h5>📊 Resumen Estadístico:</h5>
    <ul>
      <li><strong>Asistencia:</strong> Siempre: ${contar("asistencia", "Siempre")}, Casi siempre: ${contar("asistencia", "Casi siempre")}</li>
      <li><strong>Experiencia:</strong> Excelente: ${contar("experiencia", "Excelente")}, Buena: ${contar("experiencia", "Buena")}</li>
      <li><strong>Pastor:</strong> Excelente: ${contar("pastor", "Excelente")}, Buena: ${contar("pastor", "Buena")}</li>
      <li><strong>Servicio:</strong> Excelente: ${contar("servicio", "Excelente")}, Buena: ${contar("servicio", "Buena")}</li>
      <li><strong>Ambiente:</strong> Muy acogedor: ${contar("ambiente", "Muy acogedor")}, Cálido: ${contar("ambiente", "Cálido")}</li>
      <li><strong>Total de respuestas:</strong> ${total}</li>
    </ul>
  `;

  resumen.innerHTML = resumenHTML;
}

async function abrirResultadosEncuesta() {
  openModal("resultadosModal");

  const { data: encuestas, error } = await supabase
    .from("encuestas_satisfaccion")
    .select("*")
    .order("fecha_envio", { ascending: false });

  if (error || !encuestas || encuestas.length === 0) {
    document.getElementById("tablaEncuestas").innerHTML =
      "<p>No hay encuestas registradas.</p>";
    return;
  }

  // Construir tabla
  let tablaHTML = `
    <table class="tabla-encuesta">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Asistencia</th>
          <th>Experiencia</th>
          <th>Pastor</th>
          <th>Servicio</th>
          <th>Ubicación</th>
          <th>Ambiente</th>
          <th>Mejoras</th>
          <th>Comentarios</th>
        </tr>
      </thead>
      <tbody>
  `;

  encuestas.forEach((e) => {
    tablaHTML += `
      <tr>
        <td>${new Date(e.fecha_envio).toLocaleDateString()}</td>
        <td>${e.asistencia}</td>
        <td>${e.experiencia}</td>
        <td>${e.pastor}</td>
        <td>${e.servicio}</td>
        <td>${e.ubicacion}</td>
        <td>${e.ambiente}</td>
        <td>${e.mejoras || "-"}</td>
        <td>${e.comentarios || "-"}</td>
      </tr>
    `;
  });

  tablaHTML += "</tbody></table>";
  document.getElementById("tablaEncuestas").innerHTML = tablaHTML;

  // Gráficos
  const titulosPreguntas = {
  asistencia: "¿Con qué frecuencia asistes a nuestras reuniones?",
  experiencia: "¿Cómo calificarías tu experiencia general?ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ",  
  pastor: "¿Cómo evalúas al pastor y la familia pastoral?ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ",
  servicio: "¿Qué opinas del equipo de servicio (alabanza, audiovisual, staff, etc)?",
  ubicacion: "¿Qué opinas del espacio y ubicación de la iglesia?",
  ambiente: "¿Cómo describirías el ambiente con las demás personas?"
};

  const preguntas = ["asistencia", "experiencia", "pastor", "servicio", "ubicacion", "ambiente"];
  const opciones = {
    asistencia: ["Siempre", "Casi siempre", "A veces", "Nunca"],
    experiencia: ["Excelente", "Buena", "Regular", "Mala"],
    pastor: ["Excelente", "Buena", "Regular", "Mala"],
    servicio: ["Excelente", "Buena", "Regular", "Mala"],
    ubicacion: ["Muy cómoda", "Adecuada", "Limitada", "Incómoda"],
    ambiente: ["Muy acogedor", "Cálido", "Frío", "Hostil"]
  };
  const contenedorGraficos = document.getElementById("graficosEncuesta");
contenedorGraficos.innerHTML = ""; // Limpiar

preguntas.forEach((pregunta) => {
  const respuestas = encuestas.map((e) => e[pregunta]);
  const labels = opciones[pregunta];
  const conteo = labels.map((label) =>
    respuestas.filter((r) => r === label).length
  );

  const graficoBox = document.createElement("div");
  graficoBox.className = "grafico-box";

  const titulo = document.createElement("h5");
  titulo.textContent = titulosPreguntas[pregunta] || pregunta;
  titulo.style.textAlign = "center";
  titulo.style.marginBottom = "10px";

  const canvas = document.createElement("canvas");
  canvas.id = `grafico-${pregunta}`;
  canvas.width = 300;
  canvas.height = 300;

  graficoBox.appendChild(titulo);
  graficoBox.appendChild(canvas);
  contenedorGraficos.appendChild(graficoBox);

  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        label: "Respuestas",
        data: conteo,
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#8BC34A",
          "#9C27B0",
          "#FF9800"
        ],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
});

}

function exportarEncuestasAExcel() {
  const tabla = document.querySelector(".tabla-encuesta");
  if (!tabla) {
    alert("No hay datos para exportar");
    return;
  }

  // Obtener encabezados
  const headers = Array.from(tabla.querySelectorAll("thead th")).map((th) =>
    th.innerText.trim()
  );

  // Obtener filas de datos
  const rows = Array.from(tabla.querySelectorAll("tbody tr")).map((tr) => {
    const cells = tr.querySelectorAll("td");
    const rowData = {};
    headers.forEach((header, i) => {
      rowData[header] = cells[i]?.innerText || "";
    });
    return rowData;
  });

  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Aplicar autofiltros (como tabla)
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: headers.length - 1 },
    }),
  };

  // Ajustar anchos de columna automáticamente
  ws["!cols"] = headers.map(() => ({ wch: 20 }));

  // Añadir a libro y exportar
  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  XLSX.writeFile(wb, "resultados_encuesta.xlsx");
}








// --- abrirCalendarioServidores() ---
async function abrirCalendarioServidores(eventoFocusId = null) {
  openModal("asignarServidorModal");

  if (!currentUser) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadUserProfile(user.id);
  }

  const esServidor = currentUser?.role === "servidor";

  const bloqueServidores = document.getElementById("bloqueServidoresDisponibles");
  const listaEventosSrv  = document.getElementById("listaEventosDelServidor");
  const btnAsignar       = document.getElementById("btnAsignarServidores");

  if (esServidor) {
    bloqueServidores.style.display = "none";
    listaEventosSrv.style.display  = "block";
    btnAsignar.style.display       = "none";  // ← ocultar botón global

    await cargarEventosAsignadosServidor(eventoFocusId);
  } else {
    bloqueServidores.style.display = "block";
    listaEventosSrv.style.display  = "none";

    btnAsignar.style.display   = "inline-block";
    btnAsignar.textContent     = "Asignar servidores al evento";
    btnAsignar.disabled        = false;
    btnAsignar.classList.remove("ocultar");

    await cargarServidores();
  }

  cargarCalendarios();
}





async function cargarEventosAsignadosServidor(focusId = null) {
  const ul = document.getElementById("eventosServidorCollapsible");
  if (!ul) return;

  ul.innerHTML = `<li style="text-align:center;padding:12px;">Cargando...</li>`;

  const { data: asigns, error: e1 } = await supabase
    .from("asignaciones_servidores")
    .select("id, evento_id")
    .eq("servidor_id", currentUser.id);

  if (e1) {
    console.error(e1);
    ul.innerHTML = `<li style="padding:12px;color:red;text-align:center;">Error cargando asignaciones</li>`;
    return;
  }

  if (!asigns || asigns.length === 0) {
    ul.innerHTML = `<li style="padding:12px;text-align:center;">No tienes eventos asignados.</li>`;
    return;
  }

  const ids = asigns.map(a => a.evento_id);
  const { data: eventos, error: e2 } = await supabase
    .from("eventos")
    .select(`
      id,
      titulo:title,
      fecha:date,
      hora:time,
      lugar:location,
      descripcion:description,
      audiencia:audience
    `)
    .in("id", ids);

  if (e2) {
    console.error(e2);
    ul.innerHTML = `<li style="padding:12px;color:red;text-align:center;">Error cargando eventos</li>`;
    return;
  }

  const eventosPorId = Object.fromEntries(eventos.map(ev => [ev.id, ev]));
  ul.innerHTML = "";

  asigns.forEach(a => {
    const ev = eventosPorId[a.evento_id];
    if (!ev) return;

    const fechaIni = ev.fecha ? formateaFecha(ev.fecha) : "—";
    const [horaIni, horaFin] = dividirHora(ev.hora);

    const chipHTML  = ev.audiencia ? `<span class="chip">${ev.audiencia}</span>` : "";
    const lugarHTML = ev.lugar ? `<p><strong>Lugar:</strong> ${ev.lugar}</p>` : "";
    const descHTML  = ev.descripcion ? `<p><strong>Descripción:</strong> ${ev.descripcion}</p>` : "";
    const rangoHora = horaFin ? ` - ${horaFin}` : "";

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="collapsible-header btn-ev-servidor" data-evento-id="${ev.id}">
        <i class="material-icons">event</i>
        <span>${fechaIni} - ${ev.titulo}</span>
        ${chipHTML}
        <i class="material-icons rotate-icon">expand_more</i>
      </div>
      <div class="collapsible-body">
        <p><strong>Hora:</strong> ${horaIni}${rangoHora}</p>
        ${lugarHTML}
        ${descHTML}
        <div class="inasistencia-box">
          <button class="btn-inasistencia waves-effect waves-light" onclick="informarInasistencia(${ev.id})">
            <i class="material-icons left">report_problem</i>
            Informar inasistencia
          </button>
        </div>
      </div>
    `;

    // Resaltar si coincide con el focus
    if (focusId && ev.id === focusId) {
      li.classList.add("evento-alerta");
      // Abrir el acordeón para que se vea
      setTimeout(() => {
        const header = li.querySelector(".collapsible-header");
        header && header.click();
      }, 150);
    }

    ul.appendChild(li);
  });

  if (window.M) {
    const old = M.Collapsible.getInstance(ul);
    if (old) old.destroy();
    requestAnimationFrame(() => {
      M.Collapsible.init(ul, { accordion: false });
    });
  } else {
    initAccordionFallback(ul);
  }
}


function initAccordionFallback(ul){
  ul.querySelectorAll('.collapsible-body').forEach(b => b.style.display = 'none');
  ul.querySelectorAll('.collapsible-header').forEach(h => {
    h.addEventListener('click', () => {
      const li = h.parentElement;
      const body = h.nextElementSibling;
      const open = body.style.display === 'block';
      body.style.display = open ? 'none' : 'block';
      li.classList.toggle('active', !open);
    });
  });
}


function formateaFecha(isoDate){
  try {
    return new Date(isoDate).toLocaleDateString("es-CO", { timeZone:"America/Bogota" });
  } catch {
    return isoDate;
  }
}

function dividirHora(h){
  if (!h) return ["—", ""];
  // Soporta "HH:MM - HH:MM", "HH:MM–HH:MM" o solo "HH:MM"
  const parts = h.split(/[-–]/);
  if (parts.length === 2) return [parts[0].trim(), parts[1].trim()];
  return [h.trim(), ""];
}

async function informarInasistencia(eventoId){
  const motivo = prompt("¿Deseas añadir un motivo? (opcional)");
  const { data, error } = await supabase
    .from("inasistencias")
    .insert({
      servidor_id: currentUser.id,
      evento_id: eventoId,
      motivo
    })
    .select("id");

  if (error) {
    console.error(error);
    window.M?.toast ? M.toast({html:"Error al informar inasistencia"}) : showMessage("Error","error");
    return;
  }
  window.M?.toast ? M.toast({html:"Inasistencia informada"}) : showMessage("Inasistencia informada","success");
}

const NOTIF_ROLES = ["pastor","lider","líder","admin","administrador"];

function normalizeRole(r=""){
  return r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); // quita acentos
}

function initNotifInasistencias(){
  const li    = document.getElementById("notifLi");
  const btn   = document.getElementById("btnNotifInasistencias");
  const badge = document.getElementById("badgeNotifIna");
  if (!li || !btn || !badge) return;

  const role = normalizeRole(currentUser?.role || "");
  const esLP = NOTIF_ROLES.map(normalizeRole).includes(role);

  // Mostrar/ocultar LI completo
  li.classList.toggle("hidden", !esLP);
  if (!esLP) {
    badge.classList.add("hide");
    btn.onclick = null;
    return;
  }

  // Mostrar botón
  btn.style.display = "inline-flex";

  btn.onclick = async () => {
    const noti = await obtenerPrimeraNotificacionNoVista();
    if (!noti) {
      window.M?.toast
        ? M.toast({ html:"Sin inasistencias nuevas" })
        : showMessage("Sin inasistencias nuevas","success");
      return;
    }

    await supabase.from("inasistencias")
      .update({ visto: true })
      .eq("id", noti.id);

    abrirCalendarioServidores(noti.evento_id); // asegúrate de aceptar el parámetro
  };

  // Primera carga del badge
  refrescarBadgeInasistencias();

  // Realtime (evita suscribirte varias veces)
  if (!window._inaChannel){
    window._inaChannel = supabase
      .channel("inasistencias-ch")
      .on("postgres_changes",
          { event: "INSERT", schema:"public", table:"inasistencias" },
          () => refrescarBadgeInasistencias())
      .subscribe();
  }
}

async function refrescarBadgeInasistencias(){
  const badge = document.getElementById("badgeNotifIna");
  const li    = document.getElementById("notifLi");
  if (!badge || !li || li.classList.contains("hidden")) return;

  const { count, error } = await supabase
    .from("inasistencias")
    .select("id", { count: "exact", head: true })
    .eq("visto", false);

  if (error){ console.error(error); return; }

  badge.textContent = count || 0;
  badge.classList.toggle("hide", !count);
}

async function obtenerPrimeraNotificacionNoVista(){
  const { data, error } = await supabase
    .from("inasistencias")
    .select("id, evento_id")
    .eq("visto", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error){ console.error(error); return null; }
  return data || null;
}








async function cargarCalendarios() {
  // 0. Destruir instancias previas
  moment.locale('es');

  ['#calendarioContainer', '#calendarioContainerServidores'].forEach(sel => {
    if ($(sel).data('fullCalendar')) $(sel).fullCalendar('destroy');
  });

  const eventos = await cargarEventos();

  async function mostrarDetalleEvento(ev) {
    const esServidor = currentUser && currentUser.role === "servidor";

  console.log("⚙️ Buscando en Supabase el evento", ev.id);

  const { data: evento, error } = await supabase
    .from("eventos")
    .select("title, date, time, location, description")
    .eq("id", ev.id)
    .single();

  console.log("Resultado Supabase:", { evento, error });

  if (error || !evento) {
    alert("No se encontró información para este evento");
    return;
  }

  // ✅ MOSTRAR el panel de detalles
  // Posición inicial del panel (abajo a la derecha)
    const panel = document.getElementById("detalleEventoServidores");
    panel.style.bottom = "20px";
    panel.style.right = "20px";
    panel.style.left = "";
    panel.style.top = "";
    panel.style.display = "block";

    if (esServidor) {
    document.getElementById("bloqueServidoresDisponibles").style.display = "none";
    document.getElementById("listaEventosDelServidor").style.display = "block";
    document.getElementById("btnAsignarServidores").textContent = "Informar inasistencia (no activo)";
    document.getElementById("btnAsignarServidores").disabled = true;
    document.getElementById("btnAsignarServidores").classList.remove("ocultar");

    await cargarEventosAsignadosServidor(); // Mostrar la lista del servidor
  } else {
    document.getElementById("bloqueServidoresDisponibles").style.display = "block";
    document.getElementById("listaEventosDelServidor").style.display = "none";
    document.getElementById("btnAsignarServidores").textContent = "Asignar servidores al evento";
    document.getElementById("btnAsignarServidores").disabled = false;
    document.getElementById("btnAsignarServidores").classList.remove("ocultar");
  }

  document.getElementById("detalleEventoServidores").style.display = "block";

  document.getElementById("btnAsignarServidores").classList.remove("ocultar");


  // ✅ LLENAR el contenido con los datos del evento
  document.getElementById("detalleTitulo").textContent        = evento.title;
  document.getElementById("detalleTitulo").setAttribute("data-id", ev.id);
  document.getElementById("detalleFecha").textContent         = evento.date;
  document.getElementById("detalleHora").textContent          = evento.time        || "";
  document.getElementById("detalleLugar").textContent         = evento.location    || "";
  document.getElementById("detalleDescripcion").textContent   = evento.description || "";

  // ✅ CARGAR servidores asignados
  const { data: asignados } = await supabase
    .from("asignaciones_servidores")
    .select("servidor_id, usuarios:servidor_id(nombre)")
    .eq("evento_id", ev.id);

const ul = document.getElementById("listaServidoresAsignados");
ul.innerHTML = "";

// ✅ MARCAR los servidores asignados como seleccionados
const servidoresAsignados = asignados.map(a => String(a.servidor_id));

document.querySelectorAll('#servidoresList li').forEach(li => {
  const servidorId = li.getAttribute("data-id");
  if (servidoresAsignados.includes(servidorId)) {
    li.classList.add("seleccionado");
  } else {
    li.classList.remove("seleccionado");
  }
});



  if (!asignados || asignados.length === 0) {
  const li = document.createElement("li");
  li.textContent = "Sin asignaciones";
  li.classList.add("sin-link"); // ⬅️ Aplica el estilo aquí
  ul.appendChild(li);
} else {
  asignados.forEach((a) => {
    const li = document.createElement("li");
    li.textContent = a.usuarios?.nombre || "Nombre no disponible";
    ul.appendChild(li);
  });
}



}



  const opciones = {
    editable: false,
    droppable: true,
    eventClick: mostrarDetalleEvento,
    lang: 'es'
  };

  $('#calendarioContainer').fullCalendar({
    ...opciones,
    events: eventos.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end }))
  });

  $('#calendarioContainerServidores').fullCalendar({
    ...opciones,
    events: eventos.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end }))
  });
}






async function cargarServidores() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre")
    .eq("rol", "servidor");

  if (error) {
    console.error("❌ Error al cargar servidores:", error);
    return;
  }

  const listaServidores = document.getElementById("servidoresList");
  listaServidores.innerHTML = "";

  data.forEach((servidor) => {
    const li = document.createElement("li");
    li.textContent = servidor.nombre;
    li.setAttribute("data-id", servidor.id);

    li.style.cursor = "pointer";

    li.addEventListener("click", function () {
      this.classList.toggle("seleccionado"); // estilo visual
    });

    listaServidores.appendChild(li);
  });
}




async function asignarServidorAEvento(eventId, servidorId) {
    const { error } = await supabase
        .from("asignaciones_servidores")
        .insert([
            { evento_id: eventId, servidor_id: servidorId }
        ]);

    if (error) {
        console.error("❌ Error al asignar servidor:", error);
    } else {
        console.log("✔️ Servidor asignado al evento");
    }
}

async function cargarEventos() {
    const { data, error } = await supabase
        .from("eventos")  // Asegúrate de que esta sea la tabla correcta
        .select("id, title, date, time");  // Usa los nombres de campos correctos

    if (error) {
        console.error("❌ Error al cargar eventos:", error.message);
        return [];
    }

    // Verifica si los eventos se están cargando correctamente
    console.log("Eventos cargados:", data);

    // Convierte los datos de eventos para que tengan el formato adecuado para FullCalendar
    const eventos = data.map(evento => {
        // Combina la fecha (date) y la hora (time) en un formato adecuado para FullCalendar
        const startDate = `${evento.date}T${evento.time}`;

        return {
            title: evento.title,
            start: startDate,  // La fecha completa para el evento
            end: startDate,    // Para este ejemplo, el evento dura solo un instante (igual para start y end)
            id: String(evento.id)
        };
    });

    return eventos;
}

/*document.getElementById("informarInasistenciaBtn").addEventListener("click", function() {
    alert("Inasistencia informada");
});*/

function cerrarDetalleEvento() {
  const panel = document.getElementById("detalleEventoServidores");
  if (panel) panel.style.display = "none";

  // También ocultamos el botón de asignar
  document.getElementById("btnAsignarServidores")?.classList.add("ocultar");

  // Deseleccionamos servidores
  document.querySelectorAll("#servidoresList li.selected").forEach(li => {
    li.classList.remove("selected");
  });
}


async function asignarServidoresSeleccionados() {
  const servidoresSeleccionados = [...document.querySelectorAll('#servidoresList li.seleccionado')]
    .map(li => li.getAttribute("data-id"));

  const eventoId = document.getElementById("detalleTitulo").getAttribute("data-id");

  if (!eventoId) {
    showMessage("No hay un evento activo para asignar.","error");
    return;
  }

  // ✅ Obtener asignaciones actuales
  const { data: asignadosExistentes, error: errorConsulta } = await supabase
    .from("asignaciones_servidores")
    .select("servidor_id")
    .eq("evento_id", eventoId);

  if (errorConsulta) {
    console.error("❌ Error al consultar asignaciones existentes:", errorConsulta);
    alert("Error al verificar asignaciones previas.");
    return;
  }

  const idsYaAsignados = asignadosExistentes.map(a => String(a.servidor_id));

  // ➕ Determinar nuevos servidores a asignar
  const nuevos = servidoresSeleccionados.filter(id => !idsYaAsignados.includes(id));

  // ➖ Determinar servidores a eliminar (deseleccionados pero estaban antes)
  const aEliminar = idsYaAsignados.filter(id => !servidoresSeleccionados.includes(id));

  // ⏫ Insertar nuevos
  if (nuevos.length > 0) {
    const nuevosRegistros = nuevos.map(id => ({
      evento_id: eventoId,
      servidor_id: id
    }));

    const { error: errorInsert } = await supabase.from("asignaciones_servidores").insert(nuevosRegistros);
    if (errorInsert) {
      console.error("❌ Error al asignar nuevos servidores:", errorInsert);
      alert("Error al asignar nuevos servidores.");
      return;
    }
  }

  // ⏬ Eliminar deseleccionados
  if (aEliminar.length > 0) {
    const { error: errorDelete } = await supabase
      .from("asignaciones_servidores")
      .delete()
      .match({ evento_id: eventoId })
      .in("servidor_id", aEliminar);

    if (errorDelete) {
      console.error("❌ Error al quitar servidores:", errorDelete);
      alert("Error al quitar servidores deseleccionados.");
      return;
    }
  }

  showMessage("✔️ Asignaciones actualizadas correctamente.", "success");
  cerrarDetalleEvento();
}



// Hace que el panel de detalles se pueda arrastrar
function hacerPanelMovible(panelId, handleId) {
  const panel = document.getElementById(panelId);
  const handle = document.getElementById(handleId);

  let offsetX = 0, offsetY = 0, isDragging = false;

  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    panel.style.position = 'fixed'; // clave: usar fixed
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });
}





// Activa el arrastre al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  hacerPanelMovible("detalleEventoServidores", "barraMovimiento");
});
















async function crearDevocional(titulo, texto, fecha, apoyos_biblicos, elementos_interactivos, usuario_id) {
    const { error } = await supabase
        .from("devocionales")
        .insert([
            { 
                titulo: titulo, 
                texto: texto, 
                fecha: fecha, 
                apoyos_biblicos: apoyos_biblicos, 
                elementos_interactivos: elementos_interactivos, 
                usuario_id: usuario_id 
            }
        ]);

    if (error) {
        console.error("❌ Error al crear el devocional:", error);
    } else {
        console.log("✔️ Devocional creado con éxito");
    }
}

async function obtenerDevocionalDia() {
    const fechaHoy = fechaColombia  // Obtener la fecha actual en formato YYYY-MM-DD

    const { data, error } = await supabase
        .from("devocionales")
        .select("*")
        .eq("fecha", fechaHoy)  // Filtrar por la fecha actual
        .single();  // Solo obtener un devocional (el de hoy)

    if (error) {
        console.error("❌ Error al obtener el devocional:", error);
        return null;
    }

    console.log("Devocional del día:", data);
    return data;
}

// Función para abrir el modal de crear devocional
function openDevocionalForm() {
    document.getElementById("devocionalModal").style.display = "block";
}

// Función para cerrar el modal de crear devocional
function closeDevocionalForm() {
    document.getElementById("devocionalModal").style.display = "none";
}

// Agregar un evento para cerrar el modal cuando el usuario haga clic fuera del contenido
window.addEventListener('click', function(event) {
    const modal = document.getElementById("devocionalModal");
    if (event.target === modal) {
        closeDevocionalForm();
    }
});

document.getElementById("devocionalForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title  = document.getElementById("devocionalTitle").value.trim();
  const text   = document.getElementById("devocionalText").value.trim();
  const date   = document.getElementById("devocionalDate").value;
  const biblicalReferences = document.getElementById("devocionalBiblicalReferences").value.trim();

  // Archivos (puede ser 0, 1 o varios)
  const files = document.getElementById("devocionalMedia").files;
  console.log('[FORM] Cantidad de archivos seleccionados:', files.length);

  // Subir (esto devolverá string "url1,url2,..." o null)
  const elementosInteractivos = files.length ? await uploadMultipleMedia(files) : null;
  console.log('[FORM] elementos_interactivos a guardar =>', elementosInteractivos);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error('Usuario no autenticado');
    showMessage('Debes iniciar sesión', 'error');
    return;
  }

// (Opcional) conservar vistas si ya existía un devocional en esa fecha
let vistasAnterior = 0;
const { data: filaExistente, error: selError } = await supabase
  .from('devocionales')
  .select('vistas')
  .eq('fecha', date)
  .maybeSingle();

if (!selError && filaExistente && typeof filaExistente.vistas === 'number') {
  vistasAnterior = filaExistente.vistas;
}

const linkVirtualInput = document.getElementById('devocionalLink');
const linkVirtual = linkVirtualInput ? linkVirtualInput.value.trim() : null;


// Objeto final
const filaDevocional = {
  fecha: date,
  titulo: title,
  texto: text,
  apoyos_biblicos: biblicalReferences || null,
  elementos_interactivos: elementosInteractivos,
  usuario_id: userData.user.id,
  vistas: vistasAnterior,        // quita esta línea si no usas 'vistas'
  link: linkVirtual || null      // agrega si tienes el campo link
};

console.log('[UPSERT] Enviando:', filaDevocional);

const { data: upsertData, error: errorUpsert } = await supabase
  .from('devocionales')
  .upsert([filaDevocional], {
    onConflict: 'fecha',            // requiere UNIQUE(fecha)
    returning: 'representation'
  });

if (errorUpsert) {
  console.error('❌ Error guardando devocional (upsert):', errorUpsert);
  showMessage('Error guardando devocional', 'error');
  return;
}

console.log('✔️ Devocional creado/actualizado:', upsertData);
showMessage('Devocional guardado (creado o sobrescrito).', 'success');
closeDevocionalForm();
form.reset();

});




// Función para subir el archivo de media (si hay uno)
async function uploadMedia(file) {
  const ext = file.name.split('.').pop();
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Subir al bucket (asegúrate de que el bucket se llama 'devocionales')
  const { data, error } = await supabase.storage
    .from('devocionales')
    .upload(`media/${nombre}`, file);

  if (error) {
    console.error('[UPLOAD][ERROR]', error);
    return null;
  }

  // Obtener URL pública
  const { data: pub } = supabase.storage
    .from('devocionales')
    .getPublicUrl(data.path);

  console.log('[UPLOAD] URL pública =>', pub.publicUrl);
  return pub.publicUrl;
}

async function uploadMultipleMedia(fileList) {
  const urls = [];
  for (const file of fileList) {
    const url = await uploadMedia(file);
    if (url) urls.push(url);
  }
  return urls.length ? urls.join(',') : null;
}




async function viewDevocional() {
    const { data: devocional, error } = await supabase
        .from("devocionales")
        .select("*")
        .eq("fecha", fechaColombiaFormato) // Devocional solo de hoy
        .single();  // Solo obtener el devocional de hoy

    if (error || !devocional) {
        showMessage("No hay devocional disponible para hoy","error.");
        console.error("Error cargando devocional:", error);
        return;
    }

    // Mostrar el devocional en el modal
    document.getElementById("devocionalViewTitle").textContent = devocional.link;
    document.getElementById("devocionalViewTitle").textContent = devocional.titulo;
    document.getElementById("devocionalViewText").textContent = devocional.texto;
    document.getElementById("devocionalViewDate").textContent = devocional.fecha;
    document.getElementById("devocionalViewBiblicalReferences").textContent = devocional.apoyos_biblicos;

    // Mostrar el enlace virtual en el modal
    // Mostrar el enlace del devocional
const devocionalLink = document.getElementById("devocionalViewLink");

// Verificar si el devocional tiene un enlace
if (devocionalLink.link && devocional.link.trim() !== "") {
    devocionalLink.href = devocional.link;  // Asigna el enlace real al href
    devocionalLink.textContent = "Ver Devocional";  // Establece el texto del enlace
} else {
    devocionalLink.removeAttribute("href");  // Elimina el atributo href si no hay enlace
    devocionalLink.textContent = "No disponible";  // Si no hay enlace, mostramos "No disponible"
}


    // Mostrar los elementos interactivos (si existen)
    const mediaContainer = document.getElementById("mediaContainer");
    mediaContainer.innerHTML = '';  // Limpiar el contenedor de medios

    if (devocional.elementos_interactivos) {
        const elementos = devocional.elementos_interactivos.split(','); // Suponiendo que están separados por comas

        elementos.forEach(elemento => {
            const ext = elemento.split('.').pop(); // Extraemos la extensión para identificar si es imagen o video

            const mediaElement = document.createElement(ext === 'mp4' || ext === 'webm' ? 'video' : 'img');
            mediaElement.src = elemento;
            mediaElement.alt = 'Elemento interactivo';
            mediaElement.style.maxWidth = '100%'; // Para asegurarnos de que no se desborde

            if (ext === 'mp4' || ext === 'webm') {
                mediaElement.controls = true; // Agregar controles solo si es video
            }

            mediaContainer.appendChild(mediaElement);
            renderElementosInteractivos(devocional.elementos_interactivos);

        });
    }

    // Mostrar el modal
    document.getElementById("devocionalViewModal").style.display = "block";
}


// Cerrar el modal de devocional
function closeDevocionalModal() {
    document.getElementById("devocionalModal").style.display = "none";
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById("devocionalModal");
    if (event.target === modal) {
        closeDevocionalModal();
    }
});

// Mostrar el botón de ver devocional si el usuario es miembro o servidor
function showDevocionalButton() {
    if (currentUser.role === "servidor" || currentUser.role === "miembro") {
        const devocionalBtn = document.getElementById("verDevocionalBtn");
        if (devocionalBtn) {
            devocionalBtn.style.display = "block";  // Mostrar el botón
        }
    }
}

/*async function viewDevocionalCreado() {
    // Obtener el devocional del día
    
    const { data: devocional, error } = await supabase
        .from("devocionales")
        .select("*")
        .eq("fecha", fechaColombiaFormato) // Solo devocional de hoy
        .single();  // Solo obtener un devocional (el de hoy)

    if (error || !devocional) {
        return showMessage("No hay devocional disponible para hoy", "error");

    }

    // Actualizar el contenido del nuevo modal con los datos del devocional
    document.getElementById("devocionalViewTitle").textContent = devocional.titulo;
    document.getElementById("devocionalViewText").textContent = devocional.texto;

    // Mostrar la fecha del devocional
    

    document.getElementById("devocionalViewDate").textContent = devocional.fecha;

    // Mostrar los apoyos bíblicos
    document.getElementById("devocionalViewBiblicalReferences").textContent = devocional.apoyos_biblicos;
    setDevocionalLink(devocional);

    // Mostrar los elementos interactivos (si existen, como imágenes o videos)
    const mediaContainer = document.getElementById("mediaContainer");
    mediaContainer.innerHTML = ''; // Limpiar el contenedor de media

    if (devocional.elementos_interactivos) {
        // Si existen elementos interactivos, mostramos imágenes o videos
        const elementos = devocional.elementos_interactivos.split(','); // Suponiendo que están separados por comas

        elementos.forEach(elemento => {
            const ext = elemento.split('.').pop(); // Extraemos la extensión para identificar si es imagen o video

            const mediaElement = document.createElement(ext === 'mp4' || ext === 'webm' ? 'video' : 'img');
            mediaElement.src = elemento;
            mediaElement.alt = 'Elemento interactivo';
            mediaElement.style.maxWidth = '100%'; // Para asegurarnos de que no se desborde

            if (ext === 'mp4' || ext === 'webm') {
                mediaElement.controls = true; // Solo si es video, se agregan los controles
            }

            mediaContainer.appendChild(mediaElement);
            renderElementosInteractivos(devocional.elementos_interactivos);

        });
        renderElementosInteractivos(devocional.elementos_interactivos);

    }

    // Mostrar el modal
    document.getElementById("devocionalViewModal").style.display = "block";
}*/

/*async function viewDevocionalCreado() {
  limpiarDevocionalView();

  const hoy = fechaHoyColombia();
  console.log('[DEVOCIONAL] Fecha hoy (Bogotá):', hoy);

  const { data: devocional, error } = await supabase
    .from("devocionales")
    .select("*")
    .eq("fecha", hoy)
    .single();

  const titleEl  = document.getElementById("devocionalViewTitle");
  const textEl   = document.getElementById("devocionalViewText");
  const dateEl   = document.getElementById("devocionalViewDate");
  const refsEl   = document.getElementById("devocionalViewBiblicalReferences");
  const linkEl   = document.getElementById("devocionalViewLink");
  const btnCompletar = document.getElementById("btnCompletar");

  if (!devocional || error) {
    // No hay devocional hoy → mostrar mensaje y permitir filtro
    dateEl.textContent = hoy;
    titleEl.innerHTML = '<em>No hay devocional creado para hoy.</em>';
    textEl.textContent = '';
    refsEl.textContent = '';
    if (linkEl) {
      linkEl.textContent = 'No disponible';
      linkEl.removeAttribute('href');
    }
    renderElementosInteractivos(null);
    if (btnCompletar) btnCompletar.style.display = 'none';
  } else {
    // Hay devocional → mostrar datos
    dateEl.textContent  = devocional.fecha;
    titleEl.textContent = devocional.titulo;
    textEl.textContent  = devocional.texto;
    refsEl.textContent  = devocional.apoyos_biblicos || '';
    
    if (linkEl) {
      if (devocional.link && devocional.link.trim() !== '') {
        linkEl.textContent = devocional.link;
        linkEl.href = devocional.link.startsWith('http')
          ? devocional.link
          : 'https://' + devocional.link;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
      } else {
        linkEl.textContent = 'No disponible';
        linkEl.removeAttribute('href');
      }
    }

    renderElementosInteractivos(devocional.elementos_interactivos);
    if (btnCompletar) btnCompletar.style.display = 'inline-block';
  }

  // Pre-cargar el input de filtro con la fecha de hoy para conveniencia
  const inputFiltro = document.getElementById("fechaDevocional");
  if (inputFiltro) inputFiltro.value = hoy;

  // Abrir el modal siempre
  document.getElementById("devocionalViewModal").style.display = "block";
}*/

async function viewDevocionalCreado() {
  const btnCompletar = document.getElementById("btnCompletar");
  const noMsg = document.getElementById("noDevocionalMsg");

  limpiarDevocionalView();
  ocultarFilasDevocional();
  if (noMsg) noMsg.style.display = "none";
  if (btnCompletar) btnCompletar.style.display = "none";

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }); // YYYY-MM-DD
  document.getElementById("devocionalViewDate").textContent = hoy;
  const inputFiltro = document.getElementById("fechaDevocional");
  if (inputFiltro) inputFiltro.value = hoy;

  const { data: devocional, error } = await supabase
    .from("devocionales")
    .select("*")
    .eq("fecha", hoy)
    .single();

  if (!devocional || error) {
    // No existe devocional hoy
    toggleNoDevocionalMsg(true);          // Mostrar mensaje
    ocultarFilasDevocional();
    /*if (noMsg) noMsg.style.display = "block";*/
  } else {
    // Rellenar datos
    toggleNoDevocionalMsg(false);
    mostrarFilasDevocional(devocional);
    document.getElementById("devocionalViewTitle").textContent = devocional.titulo || "";
    document.getElementById("devocionalViewText").textContent = devocional.texto || "";
    document.getElementById("devocionalViewBiblicalReferences").textContent = devocional.apoyos_biblicos || "";
    const linkEl = document.getElementById("devocionalViewLink");
    if (linkEl) {
      if (devocional.link && devocional.link.trim() !== "") {
        linkEl.textContent = devocional.link;
        linkEl.href = devocional.link.startsWith("http") ? devocional.link : "https://" + devocional.link;
      } else {
        linkEl.textContent = "No hay enlace disponible";
        linkEl.removeAttribute("href");
      }
    }
    manejarMultimedia(devocional.elementos_interactivos);
    if (btnCompletar) btnCompletar.style.display = "inline-block";
  }

  document.getElementById("devocionalViewModal").style.display = "block";
}




// Función para cerrar el modal del devocional
function closeDevocionalViewModal() {
    document.getElementById("devocionalViewModal").style.display = "none";
}

async function completarDevocional() {
    // Obtener el devocional del día
    const { data: devocional, error } = await supabase
        .from("devocionales")
        .select("*")
        .eq("fecha", fechaColombiaFormato) // Solo devocional de hoy
        .single();  // Solo obtener el devocional de hoy

    if (error || !devocional) {
        console.error("Error cargando devocional:", error);
        return;
    }

    // Actualizar la columna "vistas" sumando 1
    const { error: updateError } = await supabase
        .from("devocionales")
        .update({ vistas: devocional.vistas + 1 })  // Sumar 1 a la columna "vistas"
        .eq("id", devocional.id);  // Actualizar el devocional con el ID correspondiente

    if (updateError) {
        console.error("Error actualizando las vistas:", updateError);
    } else {
        console.log("✔️ Vistas actualizadas con éxito");
    }

    // Cerrar el modal después de actualizar
    closeDevocionalViewModal();
}

function closeDevocionalViewModal() {
    document.getElementById("devocionalViewModal").style.display = "none";  // Cerrar el modal
}

// Función para filtrar devocionales por fecha
/*async function filtrarDevocionalPorFecha() {
    const fechaSeleccionada = document.getElementById("fechaDevocional").value;  // Captura la fecha seleccionada

    // Asegurarse de que la fecha seleccionada no esté vacía
    if (!fechaSeleccionada) {
        alert("Por favor, selecciona una fecha válida.");
        return;
    }

    console.log("Fecha seleccionada:", fechaSeleccionada);  // Verifica que la fecha esté siendo capturada correctamente

    // Obtener el devocional correspondiente a la fecha seleccionada
    const { data: devocional, error } = await supabase
        .from("devocionales")
        .select("*")
        .eq("fecha", fechaSeleccionada)  // Filtramos por la fecha seleccionada
        .single();  // Solo obtener un devocional (el de la fecha seleccionada)

    if (error || !devocional) {
        console.error("Error al obtener el devocional:", error);
        showMessage("No hay devocional disponible para esta fecha.","error");
        return;
    }

    // Mostrar el contenido del devocional en el div correspondiente
    mostrarDevocional(devocional);
}*/

/*async function filtrarDevocionalPorFecha() {
  const fechaSeleccionada = document.getElementById("fechaDevocional").value;
  if (!fechaSeleccionada) return;

  console.log('[FILTRO] Fecha seleccionada:', fechaSeleccionada);

  const { data: devocional, error } = await supabase
    .from("devocionales")
    .select("*")
    .eq("fecha", fechaSeleccionada)
    .single();

  const titleEl  = document.getElementById("devocionalViewTitle");
  const textEl   = document.getElementById("devocionalViewText");
  const dateEl   = document.getElementById("devocionalViewDate");
  const refsEl   = document.getElementById("devocionalViewBiblicalReferences");
  const linkEl   = document.getElementById("devocionalViewLink");
  const btnCompletar = document.getElementById("btnCompletar");

  if (!devocional || error) {
    dateEl.textContent  = fechaSeleccionada;
    titleEl.innerHTML   = '<em>No hay devocional para esta fecha.</em>';
    textEl.textContent  = '';
    refsEl.textContent  = '';
    if (linkEl) {
      linkEl.textContent = 'No disponible';
      linkEl.removeAttribute('href');
    }
    renderElementosInteractivos(null);
    if (btnCompletar) btnCompletar.style.display = 'none';
    return;
  }

  // Mostrar devocional filtrado
  dateEl.textContent  = devocional.fecha;
  titleEl.textContent = devocional.titulo;
  textEl.textContent  = devocional.texto;
  refsEl.textContent  = devocional.apoyos_biblicos || '';

  if (linkEl) {
    if (devocional.link && devocional.link.trim() !== '') {
      linkEl.textContent = devocional.link;
      linkEl.href = devocional.link.startsWith('http')
        ? devocional.link
        : 'https://' + devocional.link;
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
    } else {
      linkEl.textContent = 'No disponible';
      linkEl.removeAttribute('href');
    }
  }

  renderElementosInteractivos(devocional.elementos_interactivos);
  if (btnCompletar) btnCompletar.style.display = 'inline-block';
}*/

async function filtrarDevocionalPorFecha() {
  const fechaSeleccionada = document.getElementById("fechaDevocional").value;
  if (!fechaSeleccionada) return;

  const btnCompletar = document.getElementById("btnCompletar");
  const noMsg = document.getElementById("noDevocionalMsg");

  limpiarDevocionalView();
  ocultarFilasDevocional();
  if (noMsg) noMsg.style.display = "none";
  if (btnCompletar) btnCompletar.style.display = "none";

  document.getElementById("devocionalViewDate").textContent = fechaSeleccionada;

  const { data: devocional, error } = await supabase
    .from("devocionales")
    .select("*")
    .eq("fecha", fechaSeleccionada)
    .single();

  if (!devocional || error) {
    if (noMsg) noMsg.style.display = "block";
    return;
  }

  document.getElementById("devocionalViewTitle").textContent = devocional.titulo || "";
  document.getElementById("devocionalViewText").textContent = devocional.texto || "";
  document.getElementById("devocionalViewBiblicalReferences").textContent = devocional.apoyos_biblicos || "";

  const linkEl = document.getElementById("devocionalViewLink");
  if (linkEl) {
    if (devocional.link && devocional.link.trim() !== "") {
      linkEl.textContent = devocional.link;
      linkEl.href = devocional.link.startsWith("http") ? devocional.link : "https://" + devocional.link;
    } else {
      linkEl.textContent = "No hay enlace disponible";
      linkEl.removeAttribute("href");
    }
  }

  mostrarFilasDevocional(devocional);
  manejarMultimedia(devocional.elementos_interactivos);
  if (btnCompletar) btnCompletar.style.display = "inline-block";
}


// Función para mostrar el devocional en el contenedor debajo de la fecha
function mostrarDevocional(devocional) {
    // Asignar los valores a los elementos del devocional
    document.getElementById("devocionalViewTitle").textContent = devocional.titulo;
    document.getElementById("devocionalViewText").textContent = devocional.texto;  // Mostrar el contenido del devocional
    document.getElementById("devocionalViewDate").textContent = devocional.fecha;
    document.getElementById("devocionalViewBiblicalReferences").textContent = devocional.apoyos_biblicos;
    setDevocionalLink(devocional);


    // Mostrar el div que contiene el devocional filtrado
    document.getElementById("devocionalViewModal").style.display = "block";  // Mostrar el div

    

}


async function filtrarDevocionalPorFecha() {


    const fechaSeleccionada = document.getElementById("fechaDevocional").value;  // Captura la fecha seleccionada

    if (!fechaSeleccionada) {
        alert("Por favor, selecciona una fecha válida.");
        return;
    }

    console.log("Fecha seleccionada:", fechaSeleccionada);  // Verifica que la fecha esté siendo capturada correctamente

    // Obtener el devocional correspondiente a la fecha seleccionada
    const { data: devocional, error } = await supabase
        .from("devocionales")
        .select("*")
        .eq("fecha", fechaSeleccionada)  // Filtramos por la fecha seleccionada
        .single();  // Solo obtener un devocional (el de la fecha seleccionada)

    console.log("Devocional filtrado:", devocional);

    if (error || !devocional) {
        console.error("Error al obtener el devocional:", error);
        showMessage("No hay devocional disponible para esta fecha.","error");
        toggleNoDevocionalMsg(true);
        ocultarFilasDevocional();
        return;
    }

    // Mostrar el contenido del devocional en el div correspondiente
    mostrarFilasDevocional(devocional);
    mostrarDevocional(devocional);
    btnCompletar.style.display = "inline-block";
}

function mostrarDevocional(devocional) {
    // Asignar los valores a los elementos del devocional
    document.getElementById("devocionalViewTitle").textContent = devocional.titulo;
    document.getElementById("devocionalViewText").textContent = devocional.texto;
    document.getElementById("devocionalViewDate").textContent = devocional.fecha;
    document.getElementById("devocionalViewBiblicalReferences").textContent = devocional.apoyos_biblicos;

    setDevocionalLink(devocional); 
    manejarMultimedia(devocional.elementos_interactivos);
    toggleNoDevocionalMsg(false);
    renderElementosInteractivos(devocional.elementos_interactivos);
    btnCompletar.style.display = "inline-block";


    // Mostrar el div que contiene el devocional filtrado
    document.getElementById("devocionalViewModal").style.display = "block";  // Mostrar el div
}

function setDevocionalLink(devocional) {
    const linkEl = document.getElementById('devocionalViewLink');
    if (!linkEl) return;

    let raw = (devocional.link ?? '').trim();

    // Algunos registros viejos guardaron 'EMPTY'
    if (raw.toUpperCase() === 'EMPTY') raw = '';

    if (raw !== '') {
        // Normaliza protocolo
        if (!/^https?:\/\//i.test(raw)) {
            raw = 'https://' + raw;
        }
        linkEl.textContent = raw;
        linkEl.href = raw;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.classList.remove('sin-link');
        linkEl.style.pointerEvents = 'auto';
    } else {
        // Estado sin link
        linkEl.textContent = 'No hay enlace disponible';
        linkEl.removeAttribute('href');
        linkEl.removeAttribute('target');
        linkEl.classList.add('sin-link');
        linkEl.style.pointerEvents = 'none';
    }

    console.log('[setDevocionalLink] valor final mostrado =', linkEl.textContent);
}

function renderElementosInteractivos(valor) {
  const mediaContainer = document.getElementById("mediaContainer");
  if (!mediaContainer) return;

  mediaContainer.innerHTML = '';

  if (!valor) {
    mediaContainer.innerHTML = '<em style="color:#666;">Sin elementos multimedia.</em>';
    return;
  }

  const lista = valor.split(',')
    .map(s => s.trim())
    .filter(Boolean);

  console.log('[RENDER] URLs =>', lista);

  lista.forEach(url => {
    const lower = url.toLowerCase();
    const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');

    const el = document.createElement(isVideo ? 'video' : 'img');
    el.src = url;
    el.style.maxWidth = '100%';
    el.style.marginTop = '10px';
    if (isVideo) el.controls = true;

    el.onerror = () => {
      el.replaceWith(Object.assign(document.createElement('div'), {
        innerHTML: `<span style="color:#c00;font-size:0.85rem;">Error cargando: ${url}</span>`
      }));
    };

    mediaContainer.appendChild(el);
  });
}

function fechaHoyColombia() {
  // 'en-CA' produce YYYY-MM-DD
  return new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota' }).split(',')[0];
}

function limpiarDevocionalView() {
  document.getElementById("devocionalViewDate").textContent = '';
  document.getElementById("devocionalViewTitle").textContent = '';
  document.getElementById("devocionalViewText").textContent = '';
  document.getElementById("devocionalViewBiblicalReferences").textContent = '';
  const linkEl = document.getElementById("devocionalViewLink");
  if (linkEl) {
    linkEl.textContent = '';
    linkEl.removeAttribute('href');
  }
  const mediaContainer = document.getElementById("mediaContainer");
  if (mediaContainer) mediaContainer.innerHTML = '';
}

function ocultarFilasDevocional() {
  ["rowLink","rowTitulo","rowTexto","rowApoyos","rowMultimedia"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function limpiarDevocionalView() {
  document.getElementById("devocionalViewTitle").textContent = "";
  document.getElementById("devocionalViewText").textContent = "";
  document.getElementById("devocionalViewBiblicalReferences").textContent = "";
  document.getElementById("devocionalViewDate").textContent = "";
  const linkEl = document.getElementById("devocionalViewLink");
  if (linkEl) {
    linkEl.textContent = "No hay enlace disponible";
    linkEl.removeAttribute("href");
  }
  const mediaContainer = document.getElementById("mediaContainer");
  if (mediaContainer) mediaContainer.innerHTML = "";
}

function mostrarFilasDevocional(devocional) {
  // Helper para mostrar una fila si el valor existe
  function showIf(id, condicion = true) {
    const el = document.getElementById(id);
    if (el) el.style.display = condicion ? "block" : "none";
  }

  // Link: siempre mostramos la fila (aunque no haya link) para que se vea el mensaje "No hay enlace disponible"
  showIf("rowLink", true);

  // Título / Texto / Apoyos bíblicos
  showIf("rowTitulo", !!(devocional.titulo && devocional.titulo.trim() !== ""));
  showIf("rowTexto", !!(devocional.texto && devocional.texto.trim() !== ""));
  showIf("rowApoyos", !!(devocional.apoyos_biblicos && devocional.apoyos_biblicos.trim() !== ""));

  // Multimedia:
  const rowMultimedia = document.getElementById("rowMultimedia");
  const mediaContainer = document.getElementById("mediaContainer");

  if (!rowMultimedia || !mediaContainer) return; // Si no están en el DOM, salir seguro.

  mediaContainer.innerHTML = ""; // Limpiamos antes de reconstruir

  const valor = devocional.elementos_interactivos;

  if (!valor) {
    rowMultimedia.style.display = "none";
    return;
  }

  // Soporta: string con un solo archivo, lista separada por comas, o JSON de array
  let lista = [];
  if (Array.isArray(valor)) {
    lista = valor;
  } else if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      // Intentar parsear JSON
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) lista = parsed;
      } catch (e) {
        // Si falla, tratamos como lista separada por comas
        lista = trimmed.split(",").map(s => s.trim());
      }
    } else {
      lista = trimmed.split(",").map(s => s.trim());
    }
  }

  // Filtrar vacíos
  lista = lista.filter(Boolean);

  if (!lista.length) {
    rowMultimedia.style.display = "none";
    return;
  }

  // Crear los elementos multimedia
  lista.forEach(url => {
    const lower = url.toLowerCase();
    const isVideo = lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg");
    const el = document.createElement(isVideo ? "video" : "img");
    el.src = url;
    el.style.maxWidth = "100%";
    el.style.marginTop = "8px";
    if (isVideo) el.controls = true;
    mediaContainer.appendChild(el);
  });

  rowMultimedia.style.display = "block";
}


function manejarMultimedia(valor) {
  const row = document.getElementById("rowMultimedia");
  const mediaContainer = document.getElementById("mediaContainer");
  if (!row || !mediaContainer) return;
  mediaContainer.innerHTML = "";
  if (!valor) {
    row.style.display = "none";
    return;
  }
  const lista = valor.split(',').map(s => s.trim()).filter(Boolean);
  if (!lista.length) {
    row.style.display = "none";
    return;
  }
  lista.forEach(url => {
    const lower = url.toLowerCase();
    const isVideo = lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg");
    const el = document.createElement(isVideo ? "video" : "img");
    el.src = url;
    el.style.maxWidth = "100%";
    el.style.marginTop = "8px";
    if (isVideo) el.controls = true;
    mediaContainer.appendChild(el);
  });
  row.style.display = "block";
}

function toggleNoDevocionalMsg(visible) {
  const msg = document.getElementById("noDevocionalMsg");
  if (msg) msg.style.display = visible ? "block" : "none";
}







function buildUserItem(u){
  const isServidor = u.role === "servidor";
  const li = document.createElement("li");
  li.className = "user-item";
  li.dataset.id = u.id;
  li.dataset.role = u.role;

  // Select rol (si ya lo tienes en otro lado, reutiliza)
  const roleSelect = `
    <select class="role-select" data-id="${u.id}">
      <option value="miembro"   ${u.role==="miembro"?"selected":""}>Miembro</option>
      <option value="servidor"  ${u.role==="servidor"?"selected":""}>Servidor</option>
      <option value="lider"     ${u.role==="lider"?"selected":""}>Líder</option>
      <option value="pastor"    ${u.role==="pastor"?"selected":""}>Pastor</option>
    </select>
  `;

  const areaSelect = `
    <div class="area-wrapper" style="${isServidor?'':'display:none'}">
      <label>Área:</label>
      <select class="area-select" data-id="${u.id}">
        <option value="">-- Área --</option>
        ${AREAS_SERVICIO.map(a =>
          `<option value="${a}" ${u.area_servicio===a?"selected":""}>${a}</option>`
        ).join("")}
      </select>
    </div>
  `;

  li.innerHTML = `
    <div class="user-line">
      <span class="user-name">${u.nombre || u.email || u.id}</span>
      ${roleSelect}
    </div>
    ${areaSelect}
  `;

  return li;
}

