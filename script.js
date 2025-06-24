// Variables Globales
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let events = [];
let faqData = [];
let questions = [];
let attendeeForms = [];

// Inicializa Supabase
const supabase = window.supabase.createClient(
    "https://lubryqwofitefnxpzoiu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YnJ5cXdvZml0ZWZueHB6b2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3Mjg5MTIsImV4cCI6MjA2NjMwNDkxMn0.-pytVRaCeMHV3ktvHJfhqxNjRIYZSh4h8sfigZhhmpk"
);

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
        link.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
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
                (event) =>
                    `<div class="event-item">
                <h4>${event.title}</h4>
                <p><i class="fas fa-clock"></i> ${event.time}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                <p><i class="fas fa-users"></i> ${event.audience}</p>
                <p>${event.description}</p>
                ${
                    currentUser &&
                    (currentUser.role === "pastor" ||
                        currentUser.role === "lider")
                        ? `<div class="event-actions">
                        <button class="btn btn-secondary" onclick="editEvent('${event.id}')">editar</button>
                        <button class="btn btn-secondary" onclick="deleteEvent('${event.id}')">eliminar</button>
                    </div>`
                        : `<button class="btn btn-primary" onclick="rsvpEvent('${event.id}')">confirmar asistencia</button>`
                }
            </div>`
            )
            .join("");

        showMessage(
            `eventos para ${selectedDate.toLocaleDateString(
                "es-ES"
            )}:<br>${eventsList}`,
            "info"
        );
    } else {
        if (
            currentUser &&
            (currentUser.role === "pastor" || currentUser.role === "lider")
        ) {
            if (
                confirm("no hay eventos en este día. ¿te gustaría agregar uno?")
            ) {
                document.getElementById("eventDate").value = selectedDate
                    .toISOString()
                    .split("T")[0];
                openModal("eventModal");
            }
        } else {
            showMessage("no hay eventos programados para este día.", "info");
        }
    }
}

function updateUpcomingEvents() {
    const eventsList = document.getElementById("eventsList");
    const today = new Date();

    // Filtrar eventos futuros
    const upcomingEvents = events
        .filter((event) => new Date(event.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3); // Mostrar solo los próximos 3 eventos

    if (upcomingEvents.length === 0) {
        eventsList.innerHTML =
            '<p class="text-center">no hay eventos próximos programados.</p>';
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

// Funciones de FAQ
function initializeFAQ() {
    faqData = [
        {
            question: "¿cuáles son los horarios de reunión?",
            answer: "nos reunimos los domingos a las 10:00 AM y los miércoles a las 7:00 PM. también tenemos grupos pequeños durante la semana.",
        },
        {
            question: "¿tienen programas para niños?",
            answer: "¡sí! tenemos ministerio infantil durante todas nuestras reuniones, con actividades apropiadas para cada edad.",
        },
        {
            question: "¿cómo puedo involucrarme en el ministerio?",
            answer: "hay muchas maneras de servir. puedes hablar con nuestros líderes después de cualquier reunión o contactarnos directamente.",
        },
        {
            question: "¿ofrecen bautismo?",
            answer: "sí, ofrecemos bautismo por inmersión. es una decisión importante que celebramos con toda la comunidad.",
        },
        {
            question: "¿necesito ser miembro para participar?",
            answer: "¡para nada! todos son bienvenidos a participar en nuestras actividades y reuniones, sin importar su trasfondo.",
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
    updateUIForLoggedInUser();
    closeModal("loginModal");
    showMessage(`¡Bienvenido de nuevo, ${perfil.nombre}!`, "success");
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const role = document.getElementById("registerRole").value;
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

    showMessage(`¡Registro exitoso, ${name}!`, "success");
    closeModal("registerModal");
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

    // Actualizar navegación
    const loginLink = document.getElementById("loginLink");
    if (loginLink) {
        loginLink.textContent = currentUser.name;
        loginLink.onclick = () => showDashboard();
    }

    // Mostrar características de admin si el usuario es pastor o líder
    if (currentUser.role === "pastor" || currentUser.role === "lider") {
        const eventActions = document.getElementById("eventActions");
        if (eventActions) {
            eventActions.style.display = "block";
        }
    }

    updateUpcomingEvents();
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateUIForLoggedOutUser();
    showMessage("Has cerrado sesión.", "success");
}

// Funciones del Dashboard
function showDashboard() {
    if (!currentUser) {
        openModal("loginModal");
        return;
    }

    document.getElementById("dashboard").style.display = "block";
    document.body.style.overflow = "hidden";

    document.getElementById("dashboardUserName").textContent = currentUser.name;
    updateDashboardStats();
}

function updateDashboardStats() {
    document.getElementById("eventsCount").textContent = events.length;
    document.getElementById("questionsCount").textContent = questions.length;
    document.getElementById("formsCount").textContent = attendeeForms.length;
}

// Funciones de Gestión de Eventos
function handleEventSubmit(event) {
    event.preventDefault();

    if (
        !currentUser ||
        (currentUser.role !== "pastor" && currentUser.role !== "lider")
    ) {
        showMessage("no tienes permisos para crear eventos.", "error");
        return;
    }

    const eventData = {
        id: Date.now().toString(),
        title: document.getElementById("eventTitle").value,
        date: document.getElementById("eventDate").value,
        time: document.getElementById("eventTime").value,
        location: document.getElementById("eventLocation").value,
        audience: document.getElementById("eventAudience").value,
        description: document.getElementById("eventDescription").value,
        createdBy: currentUser.id,
        rsvps: [],
    };

    events.push(eventData);
    localStorage.setItem("events", JSON.stringify(events));

    // Si hay URL de Google Sheets, enviar también allí
    if (GOOGLE_SHEETS_URL) {
        sendToGoogleSheets("createEvent", eventData);
    }

    updateCalendar();
    updateUpcomingEvents();
    closeModal("eventModal");
    showMessage("¡evento creado exitosamente!", "success");

    document.getElementById("eventForm").reset();
    updateDashboardStats();
}

function rsvpEvent(eventId) {
    if (!currentUser) {
        openModal("loginModal");
        return;
    }

    const eventIndex = events.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return;

    const event = events[eventIndex];

    // Verificar si el usuario ya confirmó asistencia
    if (event.rsvps.includes(currentUser.id)) {
        showMessage("ya has confirmado tu asistencia a este evento.", "info");
        return;
    }

    event.rsvps.push(currentUser.id);
    localStorage.setItem("events", JSON.stringify(events));

    showMessage("¡asistencia confirmada!", "success");
}

function editEvent(eventId) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    document.getElementById("eventTitle").value = event.title;
    document.getElementById("eventDate").value = event.date;
    document.getElementById("eventTime").value = event.time;
    document.getElementById("eventLocation").value = event.location;
    document.getElementById("eventAudience").value = event.audience;
    document.getElementById("eventDescription").value = event.description;

    document.getElementById("eventModalTitle").textContent = "editar evento";

    // Cambiar manejador de formulario temporalmente
    const form = document.getElementById("eventForm");
    form.onsubmit = (e) => {
        e.preventDefault();
        updateEvent(eventId);
    };

    openModal("eventModal");
}

function updateEvent(eventId) {
    const eventIndex = events.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return;

    events[eventIndex] = {
        ...events[eventIndex],
        title: document.getElementById("eventTitle").value,
        date: document.getElementById("eventDate").value,
        time: document.getElementById("eventTime").value,
        location: document.getElementById("eventLocation").value,
        audience: document.getElementById("eventAudience").value,
        description: document.getElementById("eventDescription").value,
    };

    localStorage.setItem("events", JSON.stringify(events));

    updateCalendar();
    updateUpcomingEvents();
    closeModal("eventModal");
    showMessage("¡evento actualizado exitosamente!", "success");

    // Resetear manejador de formulario
    document.getElementById("eventForm").onsubmit = handleEventSubmit;
    document.getElementById("eventModalTitle").textContent = "crear evento";
    document.getElementById("eventForm").reset();
}

function deleteEvent(eventId) {
    if (!confirm("¿estás seguro de que quieres eliminar este evento?")) return;

    const eventIndex = events.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return;

    events.splice(eventIndex, 1);
    localStorage.setItem("events", JSON.stringify(events));

    updateCalendar();
    updateUpcomingEvents();
    showMessage("¡evento eliminado exitosamente!", "success");
    updateDashboardStats();
}

// Formulario de Asistentes via Supabase
async function submitAttendeeForm(event) {
    event.preventDefault();

    // Recoger todos los campos del formulario
    const form = event.target;
    const entries = Object.fromEntries(new FormData(form).entries());
    const attendeeData = {
        id: Date.now().toString(),
        fullName: entries.fullName.trim(),
        email: entries.email.trim(),
        congregation: entries.congregation,
        discipleship: entries.discipleship,
        baptized: entries.baptized,
        prayerRequest: entries.prayerRequest.trim(),
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

function loadSampleData() {
    // Cargar eventos de muestra si no existen
    if (!localStorage.getItem("events")) {
        events = [
            {
                id: "1",
                title: "reunión dominical",
                date: "2024-01-07",
                time: "10:00",
                description: "únete a nosotros para adoración y enseñanza",
                location: "lugar principal de reunión",
                audience: "todos",
                rsvps: [],
            },
            {
                id: "2",
                title: "estudio bíblico",
                date: "2024-01-10",
                time: "19:00",
                description: "estudio profundo de la palabra de dios",
                location: "casa de oración",
                audience: "todos",
                rsvps: [],
            },
            {
                id: "3",
                title: "reunión de jóvenes",
                date: "2024-01-12",
                time: "18:00",
                description: "tiempo especial para los jóvenes",
                location: "centro juvenil",
                audience: "jóvenes",
                rsvps: [],
            },
        ];
        localStorage.setItem("events", JSON.stringify(events));
    } else {
        events = JSON.parse(localStorage.getItem("events"));
    }

    // Cargar usuarios de muestra si no existen
    if (!localStorage.getItem("users")) {
        const sampleUsers = [
            {
                id: 1,
                name: "glenis",
                email: "glenis@unlugardeelparati.com",
                password: "Pastor2020!",
                role: "pastor",
                joinDate: new Date().toISOString(),
            },
            {
                id: 2,
                name: "wilmar",
                email: "wilmar@unlugardeelparati.com",
                password: "Pastor2020!",
                role: "pastor",
                joinDate: new Date().toISOString(),
            },
        ];
        localStorage.setItem("users", JSON.stringify(sampleUsers));
    }
}

function loadStoredData() {
    // Cargar preguntas guardadas
    const storedQuestions = localStorage.getItem("questions");
    if (storedQuestions) {
        questions = JSON.parse(storedQuestions);
    }

    // Cargar formularios de asistentes guardados
    const storedForms = localStorage.getItem("attendeeForms");
    if (storedForms) {
        attendeeForms = JSON.parse(storedForms);
    }
}

function updateFooterYear() {
    document.getElementById("currentYear").textContent =
        new Date().getFullYear();
}

// Inicializar todo cuando la página se carga
document.addEventListener("DOMContentLoaded", () => {
    console.log("¡sitio web de un lugar de él para ti cargado exitosamente!");
});
