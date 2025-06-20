// ========== CONFIGURACIÓN DE SUPABASE ==========
const SUPABASE_URL = "https://txbamiopuwcnpwtmwomk.supabase.co"; // ⚠️ CAMBIAR ESTO
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YmFtaW9wdXdjbnB3dG13b21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzODQ3NjksImV4cCI6MjA2NTk2MDc2OX0.kkm1kBWFvcciu8yISuB07k1E-pPgtnZpqKqp4176EVQ"; // ⚠️ CAMBIAR ESTO

// Verificar si Supabase está configurado correctamente
const isSupabaseConfigured =
  SUPABASE_URL !== "https://txbamiopuwcnpwtmwomk.supabase.co" &&
  SUPABASE_ANON_KEY !==
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YmFtaW9wdXdjbnB3dG13b21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzODQ3NjksImV4cCI6MjA2NTk2MDc2OX0.kkm1kBWFvcciu8yISuB07k1E-pPgtnZpqKqp4176EVQ";

let supabase = null;
if (isSupabaseConfigured && typeof window !== "undefined" && window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("✅ Supabase configurado correctamente");
} else {
  console.log("⚠️ Supabase no configurado - usando modo demo");
}

// ========== SERVICIO DE AUTENTICACIÓN ==========
const authService = {
  // Verificar usuario actual
  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: userData } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", user.id)
        .single();

      return userData;
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return null;
    }
  },

  // Registrar usuario
  async register(userData) {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: "Supabase no está configurado. Esta es una versión demo.",
      };
    }

    try {
      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) throw authError;

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
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Iniciar sesión
  async login(email, password) {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: "Supabase no está configurado. Esta es una versión demo.",
      };
    }

    try {
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

      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cerrar sesión
  async logout() {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { success: !error, error: error?.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// ========== SERVICIO DE EVENTOS ==========
const eventService = {
  // Obtener todos los eventos activos
  async getEvents() {
    if (!isSupabaseConfigured) {
      // Retornar eventos de ejemplo
      return {
        data: [
          {
            id: "1",
            titulo: "Reunión Dominical",
            descripcion:
              "Únete a nosotros para adoración y enseñanza de la Palabra",
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
      };
    }

    try {
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

      return { data, error };
    } catch (error) {
      console.error("Error obteniendo eventos:", error);
      return { data: null, error: error.message };
    }
  },

  // Crear evento
  async createEvent(eventData) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      };
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
        .select();

      return { data, error };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Confirmar asistencia
  async rsvpEvent(eventId, userId) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: "Supabase no está configurado. Esta es una versión demo.",
      };
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
        .select();

      return { data, error };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
};

// ========== SERVICIO DE PREGUNTAS FAQ ==========
const faqService = {
  // Enviar pregunta
  async submitQuestion(questionData) {
    if (!isSupabaseConfigured) {
      return {
        data: { id: Date.now(), ...questionData },
        error: null,
      };
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
        .select();

      return { data, error };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
};

// ========== SERVICIO DE FORMULARIOS DE ASISTENTES ==========
const attendeeService = {
  // Enviar formulario
  async submitForm(formData) {
    if (!isSupabaseConfigured) {
      return {
        data: { id: Date.now(), ...formData },
        error: null,
      };
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
        .select();

      return { data, error };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
};

// ========== SERVICIO DEL DASHBOARD ==========
const dashboardService = {
  async getStats() {
    if (!isSupabaseConfigured) {
      return {
        events: 3,
        questions: 5,
        forms: 2,
      };
    }

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

      return {
        events: eventsCount || 0,
        questions: questionsCount || 0,
        forms: formsCount || 0,
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      return { events: 0, questions: 0, forms: 0 };
    }
  },
};

console.log("📦 Servicios de Supabase cargados");
