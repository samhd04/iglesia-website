-- Crear tablas para la iglesia en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Tabla de usuarios
CREATE TABLE usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) CHECK (rol IN ('miembro', 'servidor', 'lider', 'pastor')) NOT NULL,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de eventos
CREATE TABLE eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha_evento DATE NOT NULL,
  hora_evento TIME NOT NULL,
  ubicacion VARCHAR(200),
  audiencia VARCHAR(50) CHECK (audiencia IN ('todos', 'miembros', 'lideres', 'jovenes')) DEFAULT 'todos',
  creado_por UUID REFERENCES usuarios(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de confirmaciones de asistencia (RSVP)
CREATE TABLE confirmaciones_eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  confirmado BOOLEAN DEFAULT true,
  fecha_confirmacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(evento_id, usuario_id)
);

-- 4. Tabla de preguntas FAQ
CREATE TABLE preguntas_faq (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  pregunta TEXT NOT NULL,
  respuesta TEXT,
  estado VARCHAR(20) CHECK (estado IN ('pendiente', 'respondida', 'archivada')) DEFAULT 'pendiente',
  respondida_por UUID REFERENCES usuarios(id),
  fecha_respuesta TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de formularios de asistentes
CREATE TABLE formularios_asistentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  tiene_congregacion BOOLEAN,
  tiene_discipulado BOOLEAN,
  esta_bautizado BOOLEAN,
  peticion_oracion TEXT,
  desea_contacto BOOLEAN DEFAULT false,
  contactado BOOLEAN DEFAULT false,
  notas_seguimiento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de sesiones de usuario (opcional, para mejor seguridad)
CREATE TABLE sesiones_usuario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  token_sesion VARCHAR(255) UNIQUE NOT NULL,
  expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_eventos_fecha ON eventos(fecha_evento);
CREATE INDEX idx_eventos_activo ON eventos(activo);
CREATE INDEX idx_preguntas_estado ON preguntas_faq(estado);
CREATE INDEX idx_confirmaciones_evento ON confirmaciones_eventos(evento_id);
CREATE INDEX idx_confirmaciones_usuario ON confirmaciones_eventos(usuario_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmaciones_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_asistentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas
-- Los usuarios pueden ver su propia información
CREATE POLICY "Usuarios pueden ver su perfil" ON usuarios
  FOR SELECT USING (auth.uid()::text = id::text);

-- Los usuarios pueden actualizar su propia información
CREATE POLICY "Usuarios pueden actualizar su perfil" ON usuarios
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Todos pueden ver eventos activos
CREATE POLICY "Todos pueden ver eventos activos" ON eventos
  FOR SELECT USING (activo = true);

-- Solo pastores y líderes pueden crear eventos
CREATE POLICY "Pastores y líderes pueden crear eventos" ON eventos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id::text = auth.uid()::text 
      AND rol IN ('pastor', 'lider')
    )
  );

-- Los usuarios pueden confirmar asistencia a eventos
CREATE POLICY "Usuarios pueden confirmar asistencia" ON confirmaciones_eventos
  FOR INSERT WITH CHECK (auth.uid()::text = usuario_id::text);

-- Todos pueden enviar preguntas FAQ
CREATE POLICY "Todos pueden enviar preguntas" ON preguntas_faq
  FOR INSERT WITH CHECK (true);

-- Solo pastores y líderes pueden ver todas las preguntas
CREATE POLICY "Pastores y líderes ven preguntas" ON preguntas_faq
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id::text = auth.uid()::text 
      AND rol IN ('pastor', 'lider')
    )
  );

-- Todos pueden enviar formularios de asistentes
CREATE POLICY "Todos pueden enviar formularios" ON formularios_asistentes
  FOR INSERT WITH CHECK (true);

-- Solo pastores y líderes pueden ver formularios
CREATE POLICY "Pastores y líderes ven formularios" ON formularios_asistentes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id::text = auth.uid()::text 
      AND rol IN ('pastor', 'lider')
    )
  );
