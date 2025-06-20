// ========== CONFIGURACIÓN DE SUPABASE ==========
const SUPABASE_URL = "https://tu-proyecto.supabase.co" // ⚠️ CAMBIAR ESTO
const SUPABASE_ANON_KEY = "tu-anon-key-aqui" // ⚠️ CAMBIAR ESTO

// Verificar si Supabase está configurado correctamente
const isSupabaseConfigured =
  SUPABASE_URL !== "https://tu-proyecto.supabase.co" && SUPABASE_ANON_KEY !== "tu-anon-key-aqui"

let supabase = null
if (isSupabaseConfigured && typeof window !== "undefined" && window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  console.log("✅ Supabase configurado correctamente")
} else {
  console.log("⚠️ Supabase no configurado - usando modo demo")
}

// ========== SERVICIO DE AUTENTICACIÓN ==========
export const authService = {
  // Verificar usuario actual
  async getCurrentUser() {
    if (!isSupabaseConfigured) return null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return null

      const { data: userData } = await supabase.from("usuarios").select("*").eq("id", user.id).single()

      return userData
    } catch (error) {
      console.error("Error obteniendo usuario:", error)
      return null
    }
  },

  // Registrar usuario
  async register(userData) {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      })

      if (authError) throw authError

      // Crear perfil en tabla usuarios
      const { data, error } = await supabase
        .from("usuarios")
        .insert([
          {
            id: authData.user.id,
            nombre: userData.name,
            email: userData.email,
            password_hash: "handled_by_supabase_auth",
            rol: userData.role,
          },
        ])
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Iniciar sesión
  async login(email, password) {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Obtener información adicional del usuario
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (userError) throw userError

      return { success: true, user: userData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Cerrar sesión
  async logout() {
    if (!isSupabaseConfigured) {
      return { success: true }
    }

    try {
      const { error } = await supabase.auth.signOut()
      return { success: !error, error: error?.message }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
}

// ========== SERVICIO DE EVENTOS ==========
export const eventService = {
  // Obtener todos los eventos activos
  async getEvents() {
    if (!isSupabaseConfigured) {
      // Retornar eventos de ejemplo
      return {
        data: [
          {
            id: "1",
            titulo: "Reunión Dominical",
            descripcion: "Únete a nosotros para adoración y enseñanza de la Palabra",
            fecha_evento: "2024-02-04",
            hora_evento: "10:00:00",
            ubicacion: "Lugar principal de reunión",
            audiencia: "todos",
            creado_por: { nombre: "Glenis" },
            confirmaciones_eventos: [],
          },
          {
            id: "2",
            titulo: "Estudio Bíblico",
            descripcion: "Estudio profundo de la Palabra de Dios",
            fecha_evento: "2024-02-07",
            hora_evento: "19:00:00",
            ubicacion: "Casa de oración",
            audiencia: "todos",
            creado_por: { nombre: "Wilmar" },
            confirmaciones_eventos: [],
          },
          {
            id: "3",
            titulo: "Reunión de Jóvenes",
            descripcion: "Tiempo especial para los jóvenes de la congregación",
            fecha_evento: "2024-02-09",
            hora_evento: "18:00:00",
            ubicacion: "Centro juvenil",
            audiencia: "jovenes",
            creado_por: { nombre: "María" },
            confirmaciones_eventos: [],
          },
        ],
        error: null,
      }
    }

    try {
      const { data, error } = await supabase
        .from("eventos")
        .select(`
          *,
          creado_por:usuarios(nombre),
          confirmaciones_eventos(usuario_id)
        `)
        .eq("activo", true)
        .order("fecha_evento", { ascending: true })

      return { data, error }
    } catch (error) {
      console.error("Error obteniendo eventos:", error)
      return { data: null, error: error.message }
    }
  },

  // Crear evento
  async createEvent(eventData) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      const { data, error } = await supabase
        .from("eventos")
        .insert([
          {
            titulo: eventData.title,
            descripcion: eventData.description,
            fecha_evento: eventData.date,
            hora_evento: eventData.time,
            ubicacion: eventData.location,
            audiencia: eventData.audience,
            creado_por: eventData.createdBy,
          },
        ])
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Confirmar asistencia
  async rsvpEvent(eventId, userId) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      const { data, error } = await supabase
        .from("confirmaciones_eventos")
        .upsert([
          {
            evento_id: eventId,
            usuario_id: userId,
            confirmado: true,
          },
        ])
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Actualizar evento
  async updateEvent(eventId, eventData) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      const { data, error } = await supabase
        .from("eventos")
        .update({
          titulo: eventData.title,
          descripcion: eventData.description,
          fecha_evento: eventData.date,
          hora_evento: eventData.time,
          ubicacion: eventData.location,
          audiencia: eventData.audience,
        })
        .eq("id", eventId)
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Eliminar evento
  async deleteEvent(eventId) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      const { data, error } = await supabase.from("eventos").update({ activo: false }).eq("id", eventId)

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },
}

// ========== SERVICIO DE PREGUNTAS FAQ ==========
export const faqService = {
  // Enviar pregunta
  async submitQuestion(questionData) {
    if (!isSupabaseConfigured) {
      return {
        data: { id: Date.now(), ...questionData },
        error: null,
      }
    }

    try {
      const { data, error } = await supabase
        .from("preguntas_faq")
        .insert([
          {
            nombre: questionData.name,
            email: questionData.email,
            pregunta: questionData.question,
          },
        ])
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Obtener preguntas (solo para pastores/líderes)
  async getQuestions() {
    if (!isSupabaseConfigured) {
      return {
        data: [
          {
            id: "1",
            nombre: "Ana García",
            email: "ana@email.com",
            pregunta: "¿Cuáles son los horarios de las reuniones?",
            estado: "pendiente",
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      }
    }

    try {
      const { data, error } = await supabase.from("preguntas_faq").select("*").order("created_at", { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Responder pregunta
  async answerQuestion(questionId, answer, userId) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      const { data, error } = await supabase
        .from("preguntas_faq")
        .update({
          respuesta: answer,
          estado: "respondida",
          respondida_por: userId,
          fecha_respuesta: new Date().toISOString(),
        })
        .eq("id", questionId)
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },
}

// ========== SERVICIO DE FORMULARIOS DE ASISTENTES ==========
export const attendeeService = {
  // Enviar formulario
  async submitForm(formData) {
    if (!isSupabaseConfigured) {
      return {
        data: { id: Date.now(), ...formData },
        error: null,
      }
    }

    try {
      const { data, error } = await supabase
        .from("formularios_asistentes")
        .insert([
          {
            nombre_completo: formData.fullName,
            email: formData.email,
            tiene_congregacion: formData.congregation === "si",
            tiene_discipulado: formData.discipleship === "si",
            esta_bautizado: formData.baptized === "si",
            peticion_oracion: formData.prayerRequest,
            desea_contacto: formData.contact === "si",
          },
        ])
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Obtener formularios (solo para pastores/líderes)
  async getForms() {
    if (!isSupabaseConfigured) {
      return {
        data: [
          {
            id: "1",
            nombre_completo: "Pedro Rodríguez",
            email: "pedro@email.com",
            tiene_congregacion: false,
            contactado: false,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      }
    }

    try {
      const { data, error } = await supabase
        .from("formularios_asistentes")
        .select("*")
        .order("created_at", { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Marcar como contactado
  async markAsContacted(formId, notes = "") {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      }
    }

    try {
      const { data, error } = await supabase
        .from("formularios_asistentes")
        .update({
          contactado: true,
          notas_seguimiento: notes,
        })
        .eq("id", formId)
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },
}

// ========== SERVICIO DEL DASHBOARD ==========
export const dashboardService = {
  async getStats() {
    if (!isSupabaseConfigured) {
      return {
        events: 3,
        questions: 5,
        forms: 2,
      }
    }

    try {
      // Contar eventos
      const { count: eventsCount } = await supabase
        .from("eventos")
        .select("*", { count: "exact", head: true })
        .eq("activo", true)

      // Contar preguntas pendientes
      const { count: questionsCount } = await supabase
        .from("preguntas_faq")
        .select("*", { count: "exact", head: true })
        .eq("estado", "pendiente")

      // Contar formularios no contactados
      const { count: formsCount } = await supabase
        .from("formularios_asistentes")
        .select("*", { count: "exact", head: true })
        .eq("contactado", false)

      return {
        events: eventsCount || 0,
        questions: questionsCount || 0,
        forms: formsCount || 0,
      }
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error)
      return { events: 0, questions: 0, forms: 0 }
    }
  },
}

// ========== EXPORTAR CONFIGURACIÓN ==========
export { isSupabaseConfigured, supabase }

console.log("📦 Servicios de Supabase cargados")
