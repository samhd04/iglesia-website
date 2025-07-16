// Variables Globales
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let events = [];
let faqData = [];
let questions = [];
let attendeeForms = [];
let predicas = [];

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

// Funciones de Modal
function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
    document.body.style.overflow = "hidden";
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
    mostrarBotonNotificacionesSiUsuarioActivo();
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
    mostrarBotonNotificacionesSiUsuarioActivo();
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

        }

        //Calendario de servidores
        /*if (["pastor", "líder", "servidor"].includes(currentUser.role)) {
        menuHTML += `<a href="#" onclick="abrirCalendarioServidores()">Calendario de servidores</a>`;
        }*/


        // Subir prédica (para líderes y pastores)
        if (["pastor", "líder"].includes(currentUser.role)) {
            menuHTML += `<a href="#" onclick="openModal('uploadPredicaModal'); inicializarFormularioPredica();">Subir prédica</a>`;

        }

        // Ver prédicas (para todos)
        menuHTML += `<a href="#" onclick="abrirModalVerPredicas()">Ver prédicas</a>`;

        if (["pastor", "líder"].includes(currentUser.role)) {
        menuHTML += `<a href="#" onclick="abrirRetroalimentacion()">Resultados</a>`;
        }


        if (currentUser.role !== "pastor") {
            menuHTML += `<a href="#" onclick="openModal('miembroModal')">Completar información</a>`;
            menuHTML += `<a href="#" onclick="abrirEncuestaSatisfaccion()">Encuesta de satisfacción</a>`;
        }

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
function showMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 6000);
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

    if (error) return showMessage(error.message, "error.");

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
    mostrarMensaje("✅ Prédica eliminada correctamente", "success");
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
            return mostrarMensaje("❌ Tipo de archivo no permitido", "error");
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

        mostrarMensaje("✅ Prédica subida exitosamente", "success");
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
