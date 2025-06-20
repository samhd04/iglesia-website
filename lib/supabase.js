// Configuración de Supabase
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://tu-proyecto.supabase.co" // ⚠️ CAMBIAR
const supabaseAnonKey = "tu-anon-key" // ⚠️ CAMBIAR

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Funciones de autenticación
export const authService = {
  // Registrar usuario
  async register(userData) {
    try {
      // Primero crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      })

      if (authError) throw authError

      // Luego crear el perfil en nuestra tabla personalizada
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

      if (error) throw error

      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Iniciar sesión
  async login(email, password) {
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
    const { error } = await supabase.auth.signOut()
    return { success: !error, error: error?.message }
  },

  // Obtener usuario actual
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: userData } = await supabase.from("usuarios").select("*").eq("id", user.id).single()

    return userData
  },
}

// Funciones de eventos
export const eventService = {
  // Obtener todos los eventos activos
  async getEvents() {
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
  },

  // Crear evento
  async createEvent(eventData) {
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
  },

  // Confirmar asistencia
  async rsvpEvent(eventId, userId) {
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
  },

  // Actualizar evento
  async updateEvent(eventId, eventData) {
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
  },

  // Eliminar evento
  async deleteEvent(eventId) {
    const { data, error } = await supabase.from("eventos").update({ activo: false }).eq("id", eventId)

    return { data, error }
  },
}

// Funciones de preguntas FAQ
export const faqService = {
  // Enviar pregunta
  async submitQuestion(questionData) {
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
  },

  // Obtener preguntas (solo para pastores/líderes)
  async getQuestions() {
    const { data, error } = await supabase.from("preguntas_faq").select("*").order("created_at", { ascending: false })

    return { data, error }
  },

  // Responder pregunta
  async answerQuestion(questionId, answer, userId) {
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
  },
}

// Funciones de formularios de asistentes
export const attendeeService = {
  // Enviar formulario
  async submitForm(formData) {
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
  },

  // Obtener formularios (solo para pastores/líderes)
  async getForms() {
    const { data, error } = await supabase
      .from("formularios_asistentes")
      .select("*")
      .order("created_at", { ascending: false })

    return { data, error }
  },

  // Marcar como contactado
  async markAsContacted(formId, notes = "") {
    const { data, error } = await supabase
      .from("formularios_asistentes")
      .update({
        contactado: true,
        notas_seguimiento: notes,
      })
      .eq("id", formId)
      .select()

    return { data, error }
  },
}

// Función para obtener estadísticas del dashboard
export const dashboardService = {
  async getStats() {
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
