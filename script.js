// ========== IMPORTAR SERVICIOS DE SUPABASE ==========
import {
  authService,
  eventService,
  faqService,
  attendeeService,
  dashboardService,
  isSupabaseConfigured,
} from "./lib/supabase.js"

// ========== VARIABLES GLOBALES ==========
let currentUser = null
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()
let events = []
let faqData = []

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
]

// Días de la semana en español
const dayHeaders = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando aplicación...")

  // Mostrar estado de configuración
  if (isSupabaseConfigured) {
    console.log("✅ Modo Supabase - Base de datos conectada")
  } else {
    console.log("🎭 Modo Demo - Usando datos de ejemplo")
  }

  initializeNavigation()
  initializeCalendar()
  initializeFAQ()
  initializeGallery()
  updateFooterYear()

  // Verificar usuario actual
  await checkCurrentUser()

  // Cargar eventos
  await loadEvents()

  console.log("✅ Aplicación iniciada correctamente")
})

// ========== FUNCIONES DE AUTENTICACIÓN ==========
async function checkCurrentUser() {
  try {
    currentUser = await authService.getCurrentUser()
    if (currentUser) {
      updateUIForLoggedInUser()
      console.log("👤 Usuario logueado:", currentUser.nombre)
    }
  } catch (error) {
    console.error("Error verificando usuario:", error)
  }
}

async function handleLogin(event) {
  event.preventDefault()

  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value

  try {
    const result = await authService.login(email, password)

    if (result.success) {
      currentUser = result.user
      updateUIForLoggedInUser()
      closeModal("loginModal")
      showMessage(`¡Bienvenido de nuevo, ${result.user.nombre}!`, "success")
      await loadEvents()
    } else {
      showMessage(result.error, "error")
    }
  } catch (error) {
    console.error("Error en login:", error)
    showMessage("Error al iniciar sesión", "error")
  }
}

async function handleRegister(event) {
  event.preventDefault()

  const userData = {
    name: document.getElementById("registerName").value,
    email: document.getElementById("registerEmail").value,
    role: document.getElementById("registerRole").value,
    password: document.getElementById("registerPassword").value,
  }

  const confirmPassword = document.getElementById("confirmPassword").value

  if (userData.password !== confirmPassword) {
    showMessage("Las contraseñas no coinciden.", "error")
    return
  }

  if (!validatePassword(userData.password)) {
    showMessage("La contraseña no cumple con los requisitos.", "error")
    return
  }

  try {
    const result = await authService.register(userData)

    if (result.success) {
      currentUser = result.data
      updateUIForLoggedInUser()
      closeModal("registerModal")
      showMessage(`¡Bienvenido a Un Lugar de Él Para Ti, ${userData.name}!`, "success")
    } else {
      showMessage(result.error, "error")
    }
  } catch (error) {
    console.error("Error en registro:", error)
    showMessage("Error al registrarse", "error")
  }
}

async function logout() {
  try {
    await authService.logout()
    currentUser = null

    // Resetear UI
    const loginLink = document.getElementById("loginLink")
    if (loginLink) {
      loginLink.textContent = "ingresar"
      loginLink.onclick = () => openModal("loginModal")
    }

    const dashboard = document.getElementById("dashboard")
    if (dashboard) {
      dashboard.style.display = "none"
    }
    document.body.style.overflow = "auto"

    const eventActions = document.getElementById("eventActions")
    if (eventActions) {
      eventActions.style.display = "none"
    }

    showMessage("Has cerrado sesión.", "success")
    updateUpcomingEvents()
  } catch (error) {
    console.error("Error cerrando sesión:", error)
    showMessage("Error al cerrar sesión", "error")
  }
}

// ========== FUNCIONES DE EVENTOS ==========
async function loadEvents() {
  try {
    console.log("📅 Cargando eventos...")

    const { data, error } = await eventService.getEvents()

    if (error) {
      console.error("Error cargando eventos:", error)
      return
    }

    events = data.map((event) => ({
      id: event.id,
      title: event.titulo,
      date: event.fecha_evento,
      time: event.hora_evento,
      location: event.ubicacion,
      description: event.descripcion,
      audience: event.audiencia,
      createdBy: event.creado_por?.nombre || "Admin",
      rsvps: event.confirmaciones_eventos?.map((r) => r.usuario_id) || [],
    }))

    updateCalendar()
    updateUpcomingEvents()

    console.log(`✅ ${events.length} eventos cargados`)
  } catch (error) {
    console.error("Error cargando eventos:", error)
  }
}

async function handleEventSubmit(event) {
  event.preventDefault()

  if (!currentUser || (currentUser.rol !== "pastor" && currentUser.rol !== "lider")) {
    showMessage("No tienes permisos para crear eventos.", "error")
    return
  }

  const eventData = {
    title: document.getElementById("eventTitle").value,
    date: document.getElementById("eventDate").value,
    time: document.getElementById("eventTime").value,
    location: document.getElementById("eventLocation").value,
    audience: document.getElementById("eventAudience").value,
    description: document.getElementById("eventDescription").value,
    createdBy: currentUser.id,
  }

  try {
    const { data, error } = await eventService.createEvent(eventData)

    if (error) {
      showMessage(error, "error")
      return
    }

    await loadEvents()
    closeModal("eventModal")
    showMessage("¡Evento creado exitosamente!", "success")
    document.getElementById("eventForm").reset()
    await updateDashboardStats()
  } catch (error) {
    console.error("Error creando evento:", error)
    showMessage("Error creando evento", "error")
  }
}

async function rsvpEvent(eventId) {
  if (!currentUser) {
    openModal("loginModal")
    return
  }

  try {
    const { data, error } = await eventService.rsvpEvent(eventId, currentUser.id)

    if (error) {
      if (error.includes("23505")) {
        showMessage("Ya has confirmado tu asistencia a este evento.", "info")
      } else {
        showMessage(error, "error")
      }
      return
    }

    showMessage("¡Asistencia confirmada!", "success")
    await loadEvents()
  } catch (error) {
    console.error("Error confirmando asistencia:", error)
    showMessage("Error confirmando asistencia", "error")
  }
}

// ========== FUNCIONES DE PREGUNTAS FAQ ==========
async function submitQuestion(event) {
  event.preventDefault()

  const questionData = {
    name: document.getElementById("questionName").value,
    email: document.getElementById("questionEmail").value,
    question: document.getElementById("questionText").value,
  }

  try {
    const { data, error } = await faqService.submitQuestion(questionData)

    if (error) {
      showMessage(error, "error")
      return
    }

    showMessage("¡Gracias por tu pregunta! Te responderemos pronto.", "success")
    document.getElementById("faqForm").reset()
    await updateDashboardStats()
  } catch (error) {
    console.error("Error enviando pregunta:", error)
    showMessage("Error enviando pregunta", "error")
  }
}

// ========== FUNCIONES DE FORMULARIO DE ASISTENTES ==========
async function submitAttendeeForm(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const attendeeData = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    congregation: formData.get("congregation"),
    discipleship: formData.get("discipleship"),
    baptized: formData.get("baptized"),
    prayerRequest: formData.get("prayerRequest"),
    contact: formData.get("contact"),
  }

  try {
    const { data, error } = await attendeeService.submitForm(attendeeData)

    if (error) {
      showMessage(error, "error")
      return
    }

    showMessage("¡Gracias por tu información! Nos pondremos en contacto contigo pronto.", "success")
    event.target.reset()
    await updateDashboardStats()
  } catch (error) {
    console.error("Error enviando formulario:", error)
    showMessage("Error enviando formulario", "error")
  }
}

// ========== FUNCIONES DEL DASHBOARD ==========
async function showDashboard() {
  if (!currentUser) {
    openModal("loginModal")
    return
  }

  document.getElementById("dashboard").style.display = "block"
  document.body.style.overflow = "hidden"

  document.getElementById("dashboardUserName").textContent = currentUser.nombre
  await updateDashboardStats()
}

async function updateDashboardStats() {
  try {
    const stats = await dashboardService.getStats()

    document.getElementById("eventsCount").textContent = stats.events
    document.getElementById("questionsCount").textContent = stats.questions
    document.getElementById("formsCount").textContent = stats.forms
  } catch (error) {
    console.error("Error actualizando estadísticas:", error)
  }
}

// ========== FUNCIONES DE NAVEGACIÓN ==========
function initializeNavigation() {
  const hamburger = document.getElementById("hamburger")
  const navMenu = document.getElementById("nav-menu")
  const navLinks = document.querySelectorAll(".nav-link")

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active")
    navMenu.classList.toggle("active")
  })

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active")
      navMenu.classList.remove("active")
    })
  })

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.getAttribute("href").startsWith("#")) {
        e.preventDefault()
        const targetId = link.getAttribute("href")
        scrollToSection(targetId.substring(1))
      }
    })
  })

  window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar")
    if (window.scrollY > 100) {
      navbar.style.background = "rgba(255, 255, 255, 0.95)"
      navbar.style.backdropFilter = "blur(10px)"
    } else {
      navbar.style.background = "var(--white)"
      navbar.style.backdropFilter = "none"
    }
  })
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)
  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }
}

// ========== FUNCIONES DEL CALENDARIO ==========
function initializeCalendar() {
  updateCalendar()
  updateUpcomingEvents()
}

function updateCalendar() {
  document.getElementById("currentMonth").textContent = `${monthNames[currentMonth]} ${currentYear}`

  const calendar = document.getElementById("calendar")
  calendar.innerHTML = ""

  // Agregar encabezados de días
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div")
    dayHeader.className = "calendar-day-header"
    dayHeader.textContent = day
    calendar.appendChild(dayHeader)
  })

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const today = new Date()

  // Agregar celdas vacías para días antes del primer día del mes
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div")
    emptyDay.className = "calendar-day other-month"
    calendar.appendChild(emptyDay)
  }

  // Agregar días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day"
    dayElement.textContent = day

    const currentDate = new Date(currentYear, currentMonth, day)

    // Verificar si es hoy
    if (currentDate.toDateString() === today.toDateString()) {
      dayElement.classList.add("today")
    }

    // Verificar si hay eventos en este día
    const hasEvent = events.some((event) => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === currentDate.toDateString()
    })

    if (hasEvent) {
      dayElement.classList.add("has-event")
    }

    dayElement.addEventListener("click", () => {
      showDayEvents(currentYear, currentMonth, day)
    })

    calendar.appendChild(dayElement)
  }
}

function changeMonth(direction) {
  currentMonth += direction

  if (currentMonth > 11) {
    currentMonth = 0
    currentYear++
  } else if (currentMonth < 0) {
    currentMonth = 11
    currentYear--
  }

  updateCalendar()
  updateUpcomingEvents()
}

function showDayEvents(year, month, day) {
  const selectedDate = new Date(year, month, day)
  const dayEvents = events.filter((event) => {
    const eventDate = new Date(event.date)
    return eventDate.toDateString() === selectedDate.toDateString()
  })

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
    `,
      )
      .join("")

    showMessage(`Eventos para ${selectedDate.toLocaleDateString("es-ES")}:<br>${eventsList}`, "info")
  } else {
    if (currentUser && (currentUser.rol === "pastor" || currentUser.rol === "lider")) {
      if (confirm("No hay eventos en este día. ¿Te gustaría agregar uno?")) {
        document.getElementById("eventDate").value = selectedDate.toISOString().split("T")[0]
        openModal("eventModal")
      }
    } else {
      showMessage("No hay eventos programados para este día.", "info")
    }
  }
}

function updateUpcomingEvents() {
  const eventsList = document.getElementById("eventsList")
  const today = new Date()

  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3)

  if (upcomingEvents.length === 0) {
    eventsList.innerHTML = '<p class="text-center">No hay eventos próximos programados.</p>'
    return
  }

  eventsList.innerHTML = upcomingEvents
    .map(
      (event) => `
    <div class="event-item">
      <h4>${event.title}</h4>
      <p><i class="fas fa-calendar"></i> ${new Date(event.date).toLocaleDateString("es-ES")}</p>
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
  `,
    )
    .join("")
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
      answer: "Sí, ofrecemos bautismo por inmersión. Es una decisión importante que celebramos con toda la comunidad.",
    },
    {
      question: "¿necesito ser miembro para participar?",
      answer:
        "¡Para nada! Todos son bienvenidos a participar en nuestras actividades y reuniones, sin importar su trasfondo.",
    },
  ]

  displayFAQ()
}

function displayFAQ() {
  const container = document.getElementById("faqContainer")
  container.innerHTML = ""

  faqData.forEach((faq, index) => {
    const faqItem = document.createElement("div")
    faqItem.className = "faq-item"
    faqItem.innerHTML = `
      <div class="faq-question" onclick="toggleFAQ(${index})">
        <h4>${faq.question}</h4>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="faq-answer">
        <p>${faq.answer}</p>
      </div>
    `
    container.appendChild(faqItem)
  })
}

function toggleFAQ(index) {
  const faqItems = document.querySelectorAll(".faq-item")
  const currentItem = faqItems[index]
  const isActive = currentItem.classList.contains("active")

  faqItems.forEach((item) => {
    item.classList.remove("active")
    const icon = item.querySelector(".fa-chevron-down")
    icon.style.transform = "rotate(0deg)"
  })

  if (!isActive) {
    currentItem.classList.add("active")
    const icon = currentItem.querySelector(".fa-chevron-down")
    icon.style.transform = "rotate(180deg)"
  }
}

function searchFAQ() {
  const searchTerm = document.getElementById("faqSearch").value.toLowerCase()
  const faqItems = document.querySelectorAll(".faq-item")

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question h4").textContent.toLowerCase()
    const answer = item.querySelector(".faq-answer p").textContent.toLowerCase()

    if (question.includes(searchTerm) || answer.includes(searchTerm)) {
      item.style.display = "block"
    } else {
      item.style.display = "none"
    }
  })
}

// ========== FUNCIONES DE GALERÍA ==========
let currentGallerySlide = 0

function initializeGallery() {
  const galleryItems = document.querySelectorAll(".gallery-item")
  const indicatorsContainer = document.getElementById("galleryIndicators")

  galleryItems.forEach((_, index) => {
    const indicator = document.createElement("div")
    indicator.className = `gallery-indicator ${index === 0 ? "active" : ""}`
    indicator.addEventListener("click", () => goToGallerySlide(index))
    indicatorsContainer.appendChild(indicator)
  })

  setInterval(() => {
    changeGallerySlide(1)
  }, 6000)
}

function changeGallerySlide(direction) {
  const items = document.querySelectorAll(".gallery-item")
  const indicators = document.querySelectorAll(".gallery-indicator")

  items[currentGallerySlide].classList.remove("active")
  indicators[currentGallerySlide].classList.remove("active")

  currentGallerySlide += direction

  if (currentGallerySlide >= items.length) {
    currentGallerySlide = 0
  } else if (currentGallerySlide < 0) {
    currentGallerySlide = items.length - 1
  }

  items[currentGallerySlide].classList.add("active")
  indicators[currentGallerySlide].classList.add("active")
}

function goToGallerySlide(index) {
  const items = document.querySelectorAll(".gallery-item")
  const indicators = document.querySelectorAll(".gallery-indicator")

  items[currentGallerySlide].classList.remove("active")
  indicators[currentGallerySlide].classList.remove("active")

  currentGallerySlide = index

  items[currentGallerySlide].classList.add("active")
  indicators[currentGallerySlide].classList.add("active")
}

// ========== FUNCIONES DE MODAL ==========
function openModal(modalId) {
  document.getElementById(modalId).style.display = "block"
  document.body.style.overflow = "hidden"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
  document.body.style.overflow = "auto"
}

window.addEventListener("click", (event) => {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none"
      document.body.style.overflow = "auto"
    }
  })
})

// ========== FUNCIONES DE UTILIDAD ==========
function showMessage(message, type) {
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${type}`
  messageDiv.innerHTML = message

  document.body.appendChild(messageDiv)

  setTimeout(() => {
    messageDiv.remove()
  }, 6000)
}

function validatePassword(password) {
  const requirements = {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  }

  Object.keys(requirements).forEach((req) => {
    const element = document.getElementById(req)
    if (element) {
      element.classList.toggle("valid", requirements[req])
    }
  })

  return Object.values(requirements).every((req) => req)
}

function updateUIForLoggedInUser() {
  if (!currentUser) return

  const loginLink = document.getElementById("loginLink")
  if (loginLink) {
    loginLink.textContent = currentUser.nombre
    loginLink.onclick = () => showDashboard()
  }

  if (currentUser.rol === "pastor" || currentUser.rol === "lider") {
    const eventActions = document.getElementById("eventActions")
    if (eventActions) {
      eventActions.style.display = "block"
    }
  }

  updateUpcomingEvents()
}

function updateFooterYear() {
  document.getElementById("currentYear").textContent = new Date().getFullYear()
}

// Validación de contraseña en tiempo real
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("registerPassword")
  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      validatePassword(this.value)
    })
  }
})

// Hacer funciones globales para HTML
window.handleLogin = handleLogin
window.handleRegister = handleRegister
window.logout = logout
window.handleEventSubmit = handleEventSubmit
window.rsvpEvent = rsvpEvent
window.submitQuestion = submitQuestion
window.submitAttendeeForm = submitAttendeeForm
window.showDashboard = showDashboard
window.openModal = openModal
window.closeModal = closeModal
window.scrollToSection = scrollToSection
window.changeMonth = changeMonth
window.toggleFAQ = toggleFAQ
window.searchFAQ = searchFAQ
window.changeGallerySlide = changeGallerySlide
window.goToGallerySlide = goToGallerySlide

console.log("🎉 Script principal cargado completamente")
