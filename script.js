// Variables Globales
let currentUser = null
let currentSlide = 0
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()
let events = []
const attendees = []
let faqData = []

// Meses en español
const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

// Días de la semana en español
const dayHeaders = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

// Inicializar el sitio web
document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation()
  initializeCarousel()
  initializeCalendar()
  initializeFAQ()
  initializeCharts()
  loadSampleData()

  // Verificar si el usuario está logueado
  const savedUser = localStorage.getItem("currentUser")
  if (savedUser) {
    currentUser = JSON.parse(savedUser)
    updateUIForLoggedInUser()
  }
})

// Funciones de Navegación
function initializeNavigation() {
  const hamburger = document.getElementById("hamburger")
  const navMenu = document.getElementById("nav-menu")
  const navLinks = document.querySelectorAll(".nav-link")

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active")
    navMenu.classList.toggle("active")
  })

  // Cerrar menú móvil al hacer clic en un enlace
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active")
      navMenu.classList.remove("active")
    })
  })

  // Desplazamiento suave para enlaces de navegación
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.getAttribute("href").startsWith("#")) {
        e.preventDefault()
        const targetId = link.getAttribute("href")
        const targetSection = document.querySelector(targetId)
        if (targetSection) {
          targetSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      }
    })
  })

  // Efecto de scroll en navbar
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

// Funciones del Carrusel
function initializeCarousel() {
  const carousel = document.getElementById("carousel")
  const items = carousel.querySelectorAll(".carousel-item")
  const indicatorsContainer = document.getElementById("indicators")

  // Crear indicadores
  items.forEach((_, index) => {
    const indicator = document.createElement("div")
    indicator.className = `indicator ${index === 0 ? "active" : ""}`
    indicator.addEventListener("click", () => goToSlide(index))
    indicatorsContainer.appendChild(indicator)
  })

  // Auto-reproducción del carrusel
  setInterval(() => {
    changeSlide(1)
  }, 5000)
}

function changeSlide(direction) {
  const items = document.querySelectorAll(".carousel-item")
  const indicators = document.querySelectorAll(".indicator")

  items[currentSlide].classList.remove("active")
  indicators[currentSlide].classList.remove("active")

  currentSlide += direction

  if (currentSlide >= items.length) {
    currentSlide = 0
  } else if (currentSlide < 0) {
    currentSlide = items.length - 1
  }

  items[currentSlide].classList.add("active")
  indicators[currentSlide].classList.add("active")
}

function goToSlide(index) {
  const items = document.querySelectorAll(".carousel-item")
  const indicators = document.querySelectorAll(".indicator")

  items[currentSlide].classList.remove("active")
  indicators[currentSlide].classList.remove("active")

  currentSlide = index

  items[currentSlide].classList.add("active")
  indicators[currentSlide].classList.add("active")
}

// Funciones del Calendario
function initializeCalendar() {
  updateCalendar()
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
        (event) =>
          `<div class="event-item">
                <h4>${event.title}</h4>
                <p><i class="fas fa-clock"></i> ${event.time}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                <p>${event.description}</p>
                ${
                  currentUser && currentUser.role === "admin"
                    ? `<div class="event-actions">
                        <button class="btn btn-secondary" onclick="editEvent('${event.id}')">Editar</button>
                        <button class="btn btn-secondary" onclick="deleteEvent('${event.id}')">Eliminar</button>
                    </div>`
                    : `<button class="btn btn-primary" onclick="rsvpEvent('${event.id}')">Confirmar Asistencia</button>`
                }
            </div>`,
      )
      .join("")

    showMessage(`Eventos para ${selectedDate.toLocaleDateString("es-ES")}:<br>${eventsList}`, "info")
  } else {
    if (currentUser && currentUser.role === "admin") {
      if (confirm("No hay eventos en este día. ¿Te gustaría agregar uno?")) {
        document.getElementById("eventDate").value = selectedDate.toISOString().split("T")[0]
        openModal("eventModal")
      }
    } else {
      showMessage("No hay eventos programados para este día.", "info")
    }
  }
}

// Funciones de FAQ
function initializeFAQ() {
  faqData = [
    {
      question: "¿A qué hora son los servicios dominicales?",
      answer:
        "Nuestros servicios dominicales son a las 9:00 AM y 11:00 AM. También tenemos un servicio contemporáneo a las 6:00 PM.",
    },
    {
      question: "¿Tienen programas para niños?",
      answer:
        "¡Sí! Tenemos Escuela Dominical para todas las edades, cuidado de niños durante los servicios y varios programas juveniles durante la semana.",
    },
    {
      question: "¿Cómo puedo involucrarme en el ministerio?",
      answer:
        "¡Hay muchas maneras de servir! Contacta a nuestro coordinador de ministerios o habla con el Pastor después del servicio para conocer las oportunidades de voluntariado.",
    },
    {
      question: "¿Ofrecen bautismo?",
      answer:
        "Sí, ofrecemos bautismo por inmersión. Por favor habla con el Pastor o llena un formulario de solicitud de bautismo.",
    },
    {
      question: "¿Hay estacionamiento disponible?",
      answer:
        "Sí, tenemos un amplio estacionamiento adyacente al edificio de la iglesia. También hay estacionamiento adicional en la calle.",
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

  // Cerrar todos los elementos FAQ
  faqItems.forEach((item) => {
    item.classList.remove("active")
    const icon = item.querySelector(".fa-chevron-down")
    icon.style.transform = "rotate(0deg)"
  })

  // Abrir elemento clickeado si no estaba activo
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

function submitQuestion(event) {
  event.preventDefault()

  const name = document.getElementById("questionName").value
  const email = document.getElementById("questionEmail").value
  const question = document.getElementById("questionText").value

  // Simular envío de pregunta al admin
  const newQuestion = {
    id: Date.now(),
    name: name,
    email: email,
    question: question,
    date: new Date().toISOString(),
    status: "pending",
  }

  // Almacenar en localStorage para revisión del admin
  const pendingQuestions = JSON.parse(localStorage.getItem("pendingQuestions") || "[]")
  pendingQuestions.push(newQuestion)
  localStorage.setItem("pendingQuestions", JSON.stringify(pendingQuestions))

  showMessage("¡Gracias por tu pregunta! Te responderemos pronto.", "success")
  document.getElementById("faqForm").reset()
}

// Funciones de Modal
function openModal(modalId) {
  document.getElementById(modalId).style.display = "block"
  document.body.style.overflow = "hidden"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
  document.body.style.overflow = "auto"
}

// Cerrar modal al hacer clic fuera
window.addEventListener("click", (event) => {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none"
      document.body.style.overflow = "auto"
    }
  })
})

// Funciones de Autenticación
function handleLogin(event) {
  event.preventDefault()

  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value

  // Simular autenticación
  const users = JSON.parse(localStorage.getItem("users") || "[]")
  const user = users.find((u) => u.email === email && u.password === password)

  if (user) {
    currentUser = user
    localStorage.setItem("currentUser", JSON.stringify(user))
    updateUIForLoggedInUser()
    closeModal("loginModal")
    showMessage(`¡Bienvenido de nuevo, ${user.name}!`, "success")
  } else {
    showMessage("Email o contraseña inválidos.", "error")
  }
}

function handleRegister(event) {
  event.preventDefault()

  const name = document.getElementById("registerName").value
  const email = document.getElementById("registerEmail").value
  const password = document.getElementById("registerPassword").value
  const confirmPassword = document.getElementById("confirmPassword").value

  if (password !== confirmPassword) {
    showMessage("Las contraseñas no coinciden.", "error")
    return
  }

  if (!validatePassword(password)) {
    showMessage("La contraseña no cumple con los requisitos.", "error")
    return
  }

  // Verificar si el usuario ya existe
  const users = JSON.parse(localStorage.getItem("users") || "[]")
  if (users.find((u) => u.email === email)) {
    showMessage("Ya existe un usuario con este email.", "error")
    return
  }

  // Crear nuevo usuario
  const newUser = {
    id: Date.now(),
    name: name,
    email: email,
    password: password, // En una app real, esto estaría hasheado
    role: "member",
    joinDate: new Date().toISOString(),
  }

  users.push(newUser)
  localStorage.setItem("users", JSON.stringify(users))

  // Auto-login del nuevo usuario
  currentUser = newUser
  localStorage.setItem("currentUser", JSON.stringify(newUser))

  updateUIForLoggedInUser()
  closeModal("registerModal")
  showMessage(`¡Bienvenido a Iglesia Cristiana, ${name}!`, "success")
}

function handleForgotPassword(event) {
  event.preventDefault()

  const email = document.getElementById("forgotEmail").value

  // Simular envío de email de reset
  showMessage(`Se ha enviado un enlace de restablecimiento a ${email}`, "success")
  closeModal("forgotPasswordModal")
}

function validatePassword(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }

  // Actualizar indicadores de UI
  Object.keys(requirements).forEach((req) => {
    const element = document.getElementById(req)
    if (element) {
      element.classList.toggle("valid", requirements[req])
    }
  })

  return Object.values(requirements).every((req) => req)
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

function updateUIForLoggedInUser() {
  if (!currentUser) return

  // Actualizar navegación
  const loginLink = document.querySelector("a[onclick=\"openModal('loginModal')\"]")
  if (loginLink) {
    loginLink.textContent = currentUser.name
    loginLink.onclick = () => showDashboard()
  }

  // Mostrar características de admin si el usuario es admin
  if (currentUser.role === "admin") {
    const eventActions = document.getElementById("eventActions")
    if (eventActions) {
      eventActions.style.display = "block"
    }
  }
}

function logout() {
  currentUser = null
  localStorage.removeItem("currentUser")

  // Resetear UI
  const userLink = document.querySelector('a[onclick="showDashboard()"]')
  if (userLink) {
    userLink.textContent = "Ingresar"
    userLink.onclick = () => openModal("loginModal")
  }

  // Ocultar dashboard
  document.getElementById("dashboard").style.display = "none"
  document.body.style.overflow = "auto"

  showMessage("Has cerrado sesión.", "success")
}

// Funciones del Dashboard
function showDashboard() {
  if (!currentUser) {
    openModal("loginModal")
    return
  }

  document.getElementById("dashboard").style.display = "block"
  document.body.style.overflow = "hidden"

  if (currentUser.role === "admin") {
    document.getElementById("adminDashboard").style.display = "block"
    document.getElementById("memberDashboard").style.display = "none"
    loadAttendees()
    loadEventsManagement()
  } else {
    document.getElementById("adminDashboard").style.display = "none"
    document.getElementById("memberDashboard").style.display = "block"
  }
}

function showTab(tabName) {
  // Ocultar todos los contenidos de pestañas
  const tabContents = document.querySelectorAll(".tab-content")
  tabContents.forEach((content) => content.classList.remove("active"))

  // Remover clase activa de todos los botones de pestaña
  const tabButtons = document.querySelectorAll(".tab-btn")
  tabButtons.forEach((btn) => btn.classList.remove("active"))

  // Mostrar contenido de pestaña seleccionada
  document.getElementById(tabName).classList.add("active")

  // Agregar clase activa al botón clickeado
  event.target.classList.add("active")
}

function loadAttendees() {
  const users = JSON.parse(localStorage.getItem("users") || "[]")
  const tableBody = document.getElementById("attendeesTableBody")

  tableBody.innerHTML = ""

  users.forEach((user) => {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${new Date(user.joinDate).toLocaleDateString("es-ES")}</td>
            <td>
                <button class="btn btn-secondary" onclick="editAttendee('${user.id}')">Editar</button>
                <button class="btn btn-secondary" onclick="deleteAttendee('${user.id}')">Eliminar</button>
            </td>
        `
    tableBody.appendChild(row)
  })
}

function searchAttendees() {
  const searchTerm = document.getElementById("attendeeSearch").value.toLowerCase()
  const rows = document.querySelectorAll("#attendeesTableBody tr")

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase()
    row.style.display = text.includes(searchTerm) ? "" : "none"
  })
}

function filterAttendees() {
  const filterValue = document.getElementById("attendeeFilter").value
  const rows = document.querySelectorAll("#attendeesTableBody tr")

  rows.forEach((row) => {
    const role = row.cells[2].textContent
    row.style.display = !filterValue || role === filterValue ? "" : "none"
  })
}

function exportAttendees() {
  const users = JSON.parse(localStorage.getItem("users") || "[]")
  const csvContent =
    "data:text/csv;charset=utf-8," +
    "Nombre,Email,Rol,Fecha de Ingreso\n" +
    users
      .map((user) => `${user.name},${user.email},${user.role},${new Date(user.joinDate).toLocaleDateString("es-ES")}`)
      .join("\n")

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", "asistentes.csv")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Funciones de Gráficos
function initializeCharts() {
  // Esto típicamente usaría una librería de gráficos como Chart.js
  // Para esta demo, crearemos gráficos simples basados en canvas
  setTimeout(() => {
    drawAttendanceChart()
    drawGrowthChart()
  }, 1000)
}

function drawAttendanceChart() {
  const canvas = document.getElementById("attendanceChart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const data = [120, 135, 140, 125, 150, 160, 145, 155, 170, 165, 180, 175]
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  // Limpiar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Dibujar gráfico
  const padding = 40
  const chartWidth = canvas.width - 2 * padding
  const chartHeight = canvas.height - 2 * padding
  const maxValue = Math.max(...data)

  // Dibujar ejes
  ctx.strokeStyle = "#64748b"
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, canvas.height - padding)
  ctx.lineTo(canvas.width - padding, canvas.height - padding)
  ctx.stroke()

  // Dibujar datos
  ctx.strokeStyle = "#DD5D35"
  ctx.fillStyle = "#DD5D35"
  ctx.lineWidth = 3
  ctx.beginPath()

  data.forEach((value, index) => {
    const x = padding + (index * chartWidth) / (data.length - 1)
    const y = canvas.height - padding - (value / maxValue) * chartHeight

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }

    // Dibujar punto
    ctx.fillRect(x - 3, y - 3, 6, 6)
  })

  ctx.stroke()

  // Dibujar etiquetas
  ctx.fillStyle = "#2C2C49"
  ctx.font = "12px Arial"
  ctx.textAlign = "center"

  months.forEach((month, index) => {
    const x = padding + (index * chartWidth) / (months.length - 1)
    ctx.fillText(month, x, canvas.height - 10)
  })
}

function drawGrowthChart() {
  const canvas = document.getElementById("growthChart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const data = [50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215]

  // Limpiar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Dibujar gráfico (similar al gráfico de asistencia pero con diferente estilo)
  const padding = 40
  const chartWidth = canvas.width - 2 * padding
  const chartHeight = canvas.height - 2 * padding
  const maxValue = Math.max(...data)

  // Dibujar ejes
  ctx.strokeStyle = "#64748b"
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, canvas.height - padding)
  ctx.lineTo(canvas.width - padding, canvas.height - padding)
  ctx.stroke()

  // Dibujar barras
  ctx.fillStyle = "#DD5D35"
  const barWidth = (chartWidth / data.length) * 0.8

  data.forEach((value, index) => {
    const x = padding + (index * chartWidth) / data.length + (chartWidth / data.length - barWidth) / 2
    const height = (value / maxValue) * chartHeight
    const y = canvas.height - padding - height

    ctx.fillRect(x, y, barWidth, height)
  })
}

function exportChart(chartId) {
  const canvas = document.getElementById(chartId)
  const link = document.createElement("a")
  link.download = `${chartId}.png`
  link.href = canvas.toDataURL()
  link.click()
}

// Funciones de Gestión de Eventos
function loadEventsManagement() {
  const eventsList = document.getElementById("eventsManageList")
  eventsList.innerHTML = ""

  events.forEach((event) => {
    const eventCard = document.createElement("div")
    eventCard.className = "event-card"
    eventCard.innerHTML = `
            <div class="event-info">
                <h4>${event.title}</h4>
                <p><i class="fas fa-calendar"></i> ${new Date(event.date).toLocaleDateString("es-ES")}</p>
                <p><i class="fas fa-clock"></i> ${event.time}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
            </div>
            <div class="event-actions">
                <button class="btn btn-secondary" onclick="editEvent('${event.id}')">Editar</button>
                <button class="btn btn-secondary" onclick="deleteEvent('${event.id}')">Eliminar</button>
                <button class="btn btn-primary" onclick="viewEventDetails('${event.id}')">Detalles</button>
            </div>
        `
    eventsList.appendChild(eventCard)
  })
}

function handleEventSubmit(event) {
  event.preventDefault()

  const title = document.getElementById("eventTitle").value
  const date = document.getElementById("eventDate").value
  const time = document.getElementById("eventTime").value
  const description = document.getElementById("eventDescription").value
  const location = document.getElementById("eventLocation").value

  const eventData = {
    id: Date.now().toString(),
    title: title,
    date: date,
    time: time,
    description: description,
    location: location,
    createdBy: currentUser.id,
    rsvps: [],
  }

  events.push(eventData)
  localStorage.setItem("events", JSON.stringify(events))

  updateCalendar()
  loadEventsManagement()
  closeModal("eventModal")
  showMessage("¡Evento creado exitosamente!", "success")

  // Enviar emails de notificación (simulado)
  sendEventNotification(eventData, "created")

  document.getElementById("eventForm").reset()
}

function editEvent(eventId) {
  const event = events.find((e) => e.id === eventId)
  if (!event) return

  document.getElementById("eventTitle").value = event.title
  document.getElementById("eventDate").value = event.date
  document.getElementById("eventTime").value = event.time
  document.getElementById("eventDescription").value = event.description
  document.getElementById("eventLocation").value = event.location

  document.getElementById("eventModalTitle").textContent = "Editar Evento"

  // Cambiar manejador de formulario temporalmente
  const form = document.getElementById("eventForm")
  form.onsubmit = (e) => {
    e.preventDefault()
    updateEvent(eventId)
  }

  openModal("eventModal")
}

function updateEvent(eventId) {
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return

  events[eventIndex] = {
    ...events[eventIndex],
    title: document.getElementById("eventTitle").value,
    date: document.getElementById("eventDate").value,
    time: document.getElementById("eventTime").value,
    description: document.getElementById("eventDescription").value,
    location: document.getElementById("eventLocation").value,
  }

  localStorage.setItem("events", JSON.stringify(events))

  updateCalendar()
  loadEventsManagement()
  closeModal("eventModal")
  showMessage("¡Evento actualizado exitosamente!", "success")

  // Enviar emails de notificación (simulado)
  sendEventNotification(events[eventIndex], "updated")

  // Resetear manejador de formulario
  document.getElementById("eventForm").onsubmit = handleEventSubmit
  document.getElementById("eventModalTitle").textContent = "Agregar Evento"
  document.getElementById("eventForm").reset()
}

function deleteEvent(eventId) {
  if (!confirm("¿Estás seguro de que quieres eliminar este evento?")) return

  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return

  const deletedEvent = events[eventIndex]
  events.splice(eventIndex, 1)
  localStorage.setItem("events", JSON.stringify(events))

  updateCalendar()
  loadEventsManagement()
  showMessage("¡Evento eliminado exitosamente!", "success")

  // Enviar emails de cancelación (simulado)
  sendEventNotification(deletedEvent, "cancelled")
}

function rsvpEvent(eventId) {
  if (!currentUser) {
    openModal("loginModal")
    return
  }

  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return

  const event = events[eventIndex]

  // Verificar si el usuario ya confirmó asistencia
  if (event.rsvps.includes(currentUser.id)) {
    showMessage("Ya has confirmado tu asistencia a este evento.", "info")
    return
  }

  event.rsvps.push(currentUser.id)
  localStorage.setItem("events", JSON.stringify(events))

  showMessage("¡Asistencia confirmada! Recibirás un email de confirmación.", "success")

  // Enviar email de confirmación de RSVP (simulado)
  sendRSVPConfirmation(event, currentUser)
}

function viewEventDetails(eventId) {
  const event = events.find((e) => e.id === eventId)
  if (!event) return

  const eventDetails = `
        <div class="event-details">
            <h3>${event.title}</h3>
            <p><strong>Fecha:</strong> ${new Date(event.date).toLocaleDateString("es-ES")}</p>
            <p><strong>Hora:</strong> ${event.time}</p>
            <p><strong>Ubicación:</strong> ${event.location}</p>
            <p><strong>Descripción:</strong> ${event.description}</p>
            <p><strong>Confirmaciones:</strong> ${event.rsvps.length}</p>
            ${event.media ? `<img src="${event.media}" alt="Imagen del Evento" style="max-width: 100%; margin-top: 15px;">` : ""}
        </div>
    `

  showMessage(eventDetails, "info")
}

// Funciones de Notificación (Simuladas)
function sendEventNotification(event, action) {
  const actionText = {
    created: "creado",
    updated: "actualizado",
    cancelled: "cancelado",
  }
  console.log(`Enviando notificación de evento ${actionText[action]} para: ${event.title}`)
  // En una aplicación real, esto enviaría emails reales
}

function sendRSVPConfirmation(event, user) {
  console.log(`Enviando confirmación de RSVP a ${user.email} para el evento: ${event.title}`)
  // En una aplicación real, esto enviaría emails reales
}

// Funciones de Conoce a Jesús
function acceptJesus() {
  showMessage(
    "¡Alabado sea Dios! Bienvenido a la familia de la fe. Alguien de nuestro equipo pastoral se pondrá en contacto contigo pronto para ayudarte a dar tus próximos pasos en tu jornada de fe.",
    "success",
  )
  closeModal("knowJesusModal")

  // Almacenar decisión para seguimiento
  const decision = {
    date: new Date().toISOString(),
    user: currentUser ? currentUser.email : "anonymous",
    type: "salvation",
  }

  const decisions = JSON.parse(localStorage.getItem("salvationDecisions") || "[]")
  decisions.push(decision)
  localStorage.setItem("salvationDecisions", JSON.stringify(decisions))
}

// Funciones de Formulario de Contacto
function submitContact(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const contactData = {
    name: formData.get("name") || event.target.querySelector('input[type="text"]').value,
    email: formData.get("email") || event.target.querySelector('input[type="email"]').value,
    subject: formData.get("subject") || event.target.querySelector('input[placeholder="Asunto"]').value,
    message: formData.get("message") || event.target.querySelector("textarea").value,
    date: new Date().toISOString(),
  }

  // Almacenar envío de contacto
  const contacts = JSON.parse(localStorage.getItem("contactSubmissions") || "[]")
  contacts.push(contactData)
  localStorage.setItem("contactSubmissions", JSON.stringify(contacts))

  showMessage("¡Gracias por tu mensaje! Te responderemos pronto.", "success")
  event.target.reset()
}

// Funciones de Utilidad
function showMessage(message, type) {
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${type}`
  messageDiv.innerHTML = message

  // Posicionar el mensaje en la parte superior de la pantalla
  messageDiv.style.position = "fixed"
  messageDiv.style.top = "100px"
  messageDiv.style.left = "50%"
  messageDiv.style.transform = "translateX(-50%)"
  messageDiv.style.zIndex = "9999"
  messageDiv.style.maxWidth = "90%"
  messageDiv.style.width = "auto"

  document.body.appendChild(messageDiv)

  setTimeout(() => {
    messageDiv.remove()
  }, 6000)
}

function loadSampleData() {
  // Cargar eventos de muestra si no existen
  if (!localStorage.getItem("events")) {
    events = [
      {
        id: "1",
        title: "Servicio Dominical",
        date: "2024-01-07",
        time: "10:00 AM",
        description: "Únete a nosotros para adoración y compañerismo",
        location: "Santuario Principal",
        rsvps: [],
      },
      {
        id: "2",
        title: "Estudio Bíblico",
        date: "2024-01-10",
        time: "7:00 PM",
        description: "Estudio bíblico semanal y discusión",
        location: "Salón de Compañerismo",
        rsvps: [],
      },
      {
        id: "3",
        title: "Grupo de Jóvenes",
        date: "2024-01-12",
        time: "6:00 PM",
        description: "Actividades divertidas y crecimiento espiritual para adolescentes",
        location: "Centro Juvenil",
        rsvps: [],
      },
    ]
    localStorage.setItem("events", JSON.stringify(events))
  } else {
    events = JSON.parse(localStorage.getItem("events"))
  }

  // Cargar usuarios de muestra si no existen
  if (!localStorage.getItem("users")) {
    const sampleUsers = [
      {
        id: 1,
        name: "Usuario Admin",
        email: "admin@iglesiacristiana.org",
        password: "admin123",
        role: "admin",
        joinDate: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Juan Pérez",
        email: "juan@ejemplo.com",
        password: "password123",
        role: "member",
        joinDate: new Date().toISOString(),
      },
    ]
    localStorage.setItem("users", JSON.stringify(sampleUsers))
  }
}

// Inicializar todo cuando la página se carga
document.addEventListener("DOMContentLoaded", () => {
  // Agregar cualquier inicialización adicional aquí
  console.log("¡Sitio web de Iglesia Cristiana cargado exitosamente!")
})
